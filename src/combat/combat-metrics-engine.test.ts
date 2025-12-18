/**
 * Tests for Combat Metrics Engine with Registry-Based Architecture
 * Verifies comprehensive metric collection using the clean registry pattern
 */

import { CombatMetricsEngine, CombatContext, SpecialEvent } from './combat-metrics-engine';
import { AttackResult, SpecialEffect } from '../core/types';
import { MetricsRegistry } from './metrics-registry';
import { SneakAttackMetrics } from '../characters/classes/rogue/sneak-attack-metrics';
import { HemorrhageMetrics } from '../combat/status-effects/bleed/hemorrhage-metrics';

describe('CombatMetricsEngine with Registry-Based Architecture', () => {
  let engine: CombatMetricsEngine;
  let basicContext: CombatContext;

  beforeEach(() => {
    engine = new CombatMetricsEngine();
    basicContext = {
      weapon: 'Test Weapon',
      advantage: false,
      enemyAC: 15,
      enemySize: 'medium',
      characterClass: 'Fighter'
    };
    
    // Clear registry before each test
    MetricsRegistry.clear();
  });

  describe('Combat Initialization', () => {
    test('should initialize combat with correct context', () => {
      const combatId = 'test-combat-1';
      engine.startCombat(combatId, basicContext);

      expect(engine.getCombatId()).toBe(combatId);
      expect(engine.getContext()).toEqual(basicContext);
      expect(engine.isActive()).toBe(true);
    });

    test('should throw error when recording attack without starting combat', () => {
      const attackResult: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 8,
        bonusDamage: 3,
        specialEffects: [],
        totalDamage: 11
      };

      expect(() => engine.recordAttack(attackResult)).toThrow('Combat not started');
    });
  });

  describe('Universal Metrics Collection', () => {
    beforeEach(() => {
      engine.startCombat('test-combat', basicContext);
    });

    test('should collect basic attack statistics', () => {
      // Record a hit
      const hit: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 8,
        bonusDamage: 3,
        specialEffects: [],
        totalDamage: 11
      };
      engine.recordAttack(hit);

      // Record a miss
      const miss: AttackResult = {
        hit: false,
        critical: false,
        baseDamage: 0,
        bonusDamage: 0,
        specialEffects: [],
        totalDamage: 0
      };
      engine.recordAttack(miss);

      // Record a critical hit
      const crit: AttackResult = {
        hit: true,
        critical: true,
        baseDamage: 16, // Doubled for crit
        critDamage: 8, // Extra damage from crit (16 - 8 normal)
        bonusDamage: 3,
        specialEffects: [],
        totalDamage: 19
      };
      engine.recordAttack(crit);

      engine.setRoundsSimulated(3);
      const metrics = engine.finalizeCombat();

      expect(metrics.universal.attacks_made).toBe(3);
      expect(metrics.universal.hits).toBe(2);
      expect(metrics.universal.misses).toBe(1);
      expect(metrics.universal.crit_hits).toBe(1);
      expect(metrics.universal.non_crit_hits).toBe(1);
      expect(metrics.universal.total_damage).toBe(30);
      expect(metrics.universal.weapon_damage).toBe(24);
      expect(metrics.universal.crit_bonus_damage).toBe(8); // 16 - 8 (normal damage)
    });

    test('should track first critical hit round', () => {
      engine.setRoundsSimulated(1);
      
      // First attack is a miss
      const miss: AttackResult = {
        hit: false,
        critical: false,
        baseDamage: 0,
        bonusDamage: 0,
        specialEffects: [],
        totalDamage: 0
      };
      engine.recordAttack(miss);

      engine.setRoundsSimulated(2);
      
      // Second attack is a critical hit
      const crit: AttackResult = {
        hit: true,
        critical: true,
        baseDamage: 16,
        bonusDamage: 3,
        specialEffects: [],
        totalDamage: 19
      };
      engine.recordAttack(crit);

      const metrics = engine.finalizeCombat();
      expect(metrics.universal.rounds_to_first_crit).toBe(2);
    });

    test('should handle combat with no critical hits', () => {
      const hit: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 8,
        bonusDamage: 3,
        specialEffects: [],
        totalDamage: 11
      };
      engine.recordAttack(hit);

      engine.setRoundsSimulated(1);
      const metrics = engine.finalizeCombat();
      expect(metrics.universal.rounds_to_first_crit).toBeUndefined();
    });
  });

  describe('Registry System', () => {
    test('should register and retrieve class trackers', () => {
      MetricsRegistry.registerClassTracker('Rogue', () => new SneakAttackMetrics());
      
      const tracker = MetricsRegistry.getClassTracker('Rogue');
      expect(tracker).toBeInstanceOf(SneakAttackMetrics);
      
      const nonExistentTracker = MetricsRegistry.getClassTracker('Wizard');
      expect(nonExistentTracker).toBeNull();
    });

    test('should register and retrieve weapon mechanic trackers', () => {
      MetricsRegistry.registerWeaponMechanicTracker('bleed', () => new HemorrhageMetrics());
      
      const tracker = MetricsRegistry.getWeaponMechanicTracker('bleed');
      expect(tracker).toBeInstanceOf(HemorrhageMetrics);
      
      const nonExistentTracker = MetricsRegistry.getWeaponMechanicTracker('poison');
      expect(nonExistentTracker).toBeNull();
    });

    test('should list registered classes and mechanics', () => {
      MetricsRegistry.registerClassTracker('Rogue', () => new SneakAttackMetrics());
      MetricsRegistry.registerWeaponMechanicTracker('bleed', () => new HemorrhageMetrics());
      
      expect(MetricsRegistry.getRegisteredClasses()).toContain('Rogue');
      expect(MetricsRegistry.getRegisteredWeaponMechanics()).toContain('bleed');
    });

    test('should clear all registrations', () => {
      MetricsRegistry.registerClassTracker('Rogue', () => new SneakAttackMetrics());
      MetricsRegistry.registerWeaponMechanicTracker('bleed', () => new HemorrhageMetrics());
      
      MetricsRegistry.clear();
      
      expect(MetricsRegistry.getRegisteredClasses()).toHaveLength(0);
      expect(MetricsRegistry.getRegisteredWeaponMechanics()).toHaveLength(0);
    });
  });

  describe('Tracker Integration', () => {
    test('should register and use trackers', () => {
      const sneakAttackTracker = new SneakAttackMetrics();
      const hemorrhageTracker = new HemorrhageMetrics();
      
      engine.registerTracker(sneakAttackTracker);
      engine.registerTracker(hemorrhageTracker);
      
      expect(engine.getTrackers()).toHaveLength(2);
      expect(engine.getTrackers()[0]).toBe(sneakAttackTracker);
      expect(engine.getTrackers()[1]).toBe(hemorrhageTracker);
    });

    test('should collect metrics from registered trackers', () => {
      const sneakAttackTracker = new SneakAttackMetrics();
      engine.registerTracker(sneakAttackTracker);

      const rogueContext: CombatContext = {
        weapon: 'Rapier',
        advantage: false,
        enemyAC: 15,
        enemySize: 'medium',
        characterClass: 'Rogue'
      };
      
      engine.startCombat('rogue-combat', rogueContext);

      const sneakAttackEffect: SpecialEffect = {
        name: 'Sneak Attack',
        damage: 10,
        type: 'piercing',
        triggered: true
      };

      const attackWithSneak: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 8,
        bonusDamage: 3,
        specialEffects: [sneakAttackEffect],
        totalDamage: 21
      };

      engine.recordAttack(attackWithSneak);
      engine.setRoundsSimulated(1);
      const metrics = engine.finalizeCombat();

      expect(metrics.classSpecific?.rogue?.sneak_attack_damage).toBe(10);
    });
  });

  describe('Class-Specific Metrics Collection', () => {
    test('should collect sneak attack damage for rogues', () => {
      const sneakAttackTracker = new SneakAttackMetrics();
      engine.registerTracker(sneakAttackTracker);

      const rogueContext: CombatContext = {
        weapon: 'Rapier',
        advantage: false,
        enemyAC: 15,
        enemySize: 'medium',
        characterClass: 'Rogue'
      };
      
      engine.startCombat('rogue-combat', rogueContext);

      const sneakAttackEffect: SpecialEffect = {
        name: 'Sneak Attack',
        damage: 10,
        type: 'piercing',
        triggered: true
      };

      const attackWithSneak: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 8,
        bonusDamage: 3,
        specialEffects: [sneakAttackEffect],
        totalDamage: 21
      };

      engine.recordAttack(attackWithSneak);
      engine.setRoundsSimulated(1);
      const metrics = engine.finalizeCombat();

      expect(metrics.classSpecific?.rogue?.sneak_attack_damage).toBe(10);
    });

    test('should not collect metrics when no trackers are registered', () => {
      engine.startCombat('fighter-combat', basicContext);

      const hit: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 8,
        bonusDamage: 3,
        specialEffects: [],
        totalDamage: 11
      };

      engine.recordAttack(hit);
      engine.setRoundsSimulated(1);
      const metrics = engine.finalizeCombat();

      expect(metrics.classSpecific).toBeUndefined();
    });
  });

  describe('Report-Specific Metrics Collection', () => {
    test('should collect bleed mechanics data', () => {
      const hemorrhageTracker = new HemorrhageMetrics();
      engine.registerTracker(hemorrhageTracker);

      const bleedContext: CombatContext = {
        weapon: 'Sanguine Dagger',
        advantage: false,
        enemyAC: 15,
        enemySize: 'medium',
        characterClass: 'Fighter',
        weaponMechanics: ['bleed']
      };

      engine.startCombat('bleed-combat', bleedContext);

      // Attack with bleed counter
      const bleedCounterEffect: SpecialEffect = {
        name: 'Bleed Counter',
        damage: 3,
        type: 'counter',
        triggered: true
      };

      const attackWithBleed: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 4,
        bonusDamage: 1,
        specialEffects: [bleedCounterEffect],
        totalDamage: 5
      };

      engine.recordAttack(attackWithBleed);

      // Attack that triggers hemorrhage
      const hemorrhageEffect: SpecialEffect = {
        name: 'Hemorrhage',
        damage: 12,
        type: 'necrotic',
        triggered: true
      };

      const bleedCounterEffect2: SpecialEffect = {
        name: 'Bleed Counter',
        damage: 2,
        type: 'counter',
        triggered: true
      };

      const hemorrhageAttack: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 4,
        bonusDamage: 1,
        specialEffects: [bleedCounterEffect2, hemorrhageEffect],
        totalDamage: 17,
        hemorrhageTriggered: true
      };

      engine.recordAttack(hemorrhageAttack);
      engine.setRoundsSimulated(2);
      const metrics = engine.finalizeCombat();

      expect(metrics.reportSpecific?.bleed?.bleed_damage).toBe(12);
      expect(metrics.reportSpecific?.bleed?.bleed_counter_added).toBe(5);
      expect(metrics.reportSpecific?.bleed?.bleed_from_crits).toBe(0);
      expect(metrics.reportSpecific?.bleed?.bleed_from_non_crits).toBe(5);
      expect(metrics.reportSpecific?.bleed?.bleed_threshold).toBe(12); // medium creature
      expect(metrics.reportSpecific?.bleed?.hemorrhages_triggered).toBe(1);
      expect(metrics.reportSpecific?.bleed?.rounds_to_first_hemorrhage).toBe(2);
    });

    test('should track bleed from critical hits separately', () => {
      const hemorrhageTracker = new HemorrhageMetrics();
      engine.registerTracker(hemorrhageTracker);

      const bleedContext: CombatContext = {
        weapon: 'Sanguine Dagger',
        advantage: false,
        enemyAC: 15,
        enemySize: 'medium',
        characterClass: 'Fighter',
        weaponMechanics: ['bleed']
      };

      engine.startCombat('crit-bleed-combat', bleedContext);

      // Critical hit with bleed counter
      const bleedCounterEffect: SpecialEffect = {
        name: 'Bleed Counter',
        damage: 6, // Higher from critical
        type: 'counter',
        triggered: true
      };

      const critWithBleed: AttackResult = {
        hit: true,
        critical: true,
        baseDamage: 8,
        bonusDamage: 1,
        specialEffects: [bleedCounterEffect],
        totalDamage: 9
      };

      engine.recordAttack(critWithBleed);
      engine.setRoundsSimulated(1);
      const metrics = engine.finalizeCombat();

      expect(metrics.reportSpecific?.bleed?.bleed_from_crits).toBe(6);
      expect(metrics.reportSpecific?.bleed?.bleed_from_non_crits).toBe(0);
    });
  });

  describe('Special Event Recording', () => {
    beforeEach(() => {
      engine.startCombat('event-combat', basicContext);
    });

    test('should record first critical hit event', () => {
      const critEvent: SpecialEvent = {
        type: 'first_crit',
        round: 3
      };

      engine.recordSpecialEvent(critEvent);
      engine.setRoundsSimulated(5);
      const metrics = engine.finalizeCombat();

      expect(metrics.universal.rounds_to_first_crit).toBe(3);
    });

    test('should only record first occurrence of events', () => {
      const firstCrit: SpecialEvent = { type: 'first_crit', round: 2 };
      const secondCrit: SpecialEvent = { type: 'first_crit', round: 4 };

      engine.recordSpecialEvent(firstCrit);
      engine.recordSpecialEvent(secondCrit);
      
      engine.setRoundsSimulated(5);
      const metrics = engine.finalizeCombat();

      expect(metrics.universal.rounds_to_first_crit).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when finalizing without starting combat', () => {
      expect(() => engine.finalizeCombat()).toThrow('Combat not started');
    });

    test('should handle empty special effects arrays', () => {
      engine.startCombat('empty-effects-combat', basicContext);

      const hit: AttackResult = {
        hit: true,
        critical: false,
        baseDamage: 8,
        bonusDamage: 3,
        specialEffects: [],
        totalDamage: 11
      };

      expect(() => engine.recordAttack(hit)).not.toThrow();
      
      engine.setRoundsSimulated(1);
      const metrics = engine.finalizeCombat();
      expect(metrics.universal.total_damage).toBe(11);
    });
  });

  describe('Tracker Interface', () => {
    test('should verify sneak attack tracker interface methods', () => {
      const sneakAttackTracker = new SneakAttackMetrics();
      
      expect(sneakAttackTracker.getCategory()).toBe('classSpecific');
      expect(sneakAttackTracker.getName()).toBe('rogue');
    });

    test('should verify hemorrhage tracker interface methods', () => {
      const hemorrhageTracker = new HemorrhageMetrics();
      
      expect(hemorrhageTracker.getCategory()).toBe('reportSpecific');
      expect(hemorrhageTracker.getName()).toBe('bleed');
    });
  });
});