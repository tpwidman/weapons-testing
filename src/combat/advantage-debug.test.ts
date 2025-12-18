/**
 * Debug tests specifically for advantage rate issues
 */

import { CombatResolver, CombatScenario } from '../combat/combat';
import { Character, CharacterBuilder } from '../characters/character';
import { Weapon, WeaponBuilder } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';
import { AttackContext, WeaponDefinition } from '../core/types';

describe('Advantage Rate Debug', () => {
  let combatResolver: CombatResolver;
  let diceEngine: DiceEngine;
  let character: Character;
  let weapon: Weapon;

  beforeEach(() => {
    diceEngine = new DiceEngine(12345);
    combatResolver = new CombatResolver(diceEngine);
    
    const characterTemplate = {
      name: "Test Rogue",
      level: 5,
      class: "Rogue",
      subclass: "Thief",
      abilityScores: {
        strength: 10,
        dexterity: 17,
        constitution: 14,
        intelligence: 12,
        wisdom: 13,
        charisma: 14
      },
      proficiencyBonus: 3,
      classFeatures: [
        {
          name: "Cunning Action",
          type: "passive" as const,
          effect: {
            type: "advantage_source" as const,
            description: "Can Hide as bonus action to gain advantage on next attack"
          }
        }
      ],
      attackModifiers: [
        {
          name: "Dexterity",
          hitBonus: 3,
          critRange: 20
        },
        {
          name: "Proficiency",
          hitBonus: 3,
          critRange: 20
        }
      ],
      damageModifiers: [
        {
          name: "Dexterity",
          damageBonus: 3,
          damageType: "piercing",
          trigger: "always" as const
        }
      ]
    };
    
    character = CharacterBuilder.fromTemplate(characterTemplate);
    
    const weaponDefinition: WeaponDefinition = {
      name: "Test Dagger",
      rarity: "common",
      baseDamage: "1d4",
      damageType: "piercing",
      properties: ["finesse", "light"],
      magicalBonus: 1,
      specialMechanics: []
    };
    
    weapon = WeaponBuilder.fromDefinition(weaponDefinition, diceEngine);
  });

  test('should have 100% sneak attack rate with 1.0 advantage rate', () => {
    const scenario: CombatScenario = {
      rounds: 1,
      targetAC: 15,
      targetSize: 'medium',
      advantageRate: 1.0, // 100% advantage
      attacksPerRound: 1
    };

    let sneakAttackCount = 0;
    let hitCount = 0;
    const testRuns = 100;
    
    for (let i = 0; i < testRuns; i++) {
      const context: AttackContext = {
        attacker: character,
        weapon: weapon,
        hasAdvantage: false, // Start with false, should be overridden by scenario
        targetAC: 15,
        targetSize: 'medium',
        round: 1,
        turn: 1,
        scenario: scenario
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        hitCount++;
        const hasSneakAttack = result.specialEffects?.some(effect => effect.name === 'Sneak Attack');
        if (hasSneakAttack) {
          sneakAttackCount++;
        }
        
        // Debug: Log first few results
        if (i < 5) {
          console.log(`Attack ${i + 1}: Hit=${result.hit}, SneakAttack=${hasSneakAttack}, TotalDamage=${result.totalDamage}`);
          console.log(`  Special Effects:`, result.specialEffects?.map(e => e.name));
        }
      }
    }
    
    console.log(`\nAdvantage Rate 1.0 Results:`);
    console.log(`  Total Hits: ${hitCount}/${testRuns}`);
    console.log(`  Sneak Attacks: ${sneakAttackCount}/${hitCount} hits`);
    console.log(`  Sneak Attack Rate: ${hitCount > 0 ? (sneakAttackCount / hitCount * 100).toFixed(1) : 0}%`);
    
    // With 1.0 advantage rate, ALL hits should have sneak attack
    if (hitCount > 0) {
      expect(sneakAttackCount).toBe(hitCount);
    }
  });

  test('should have lower sneak attack rate with 0.0 advantage rate', () => {
    const scenario: CombatScenario = {
      rounds: 1,
      targetAC: 15,
      targetSize: 'medium',
      advantageRate: 0.0, // 0% advantage
      attacksPerRound: 1
    };

    let sneakAttackCount = 0;
    let hitCount = 0;
    const testRuns = 100;
    
    for (let i = 0; i < testRuns; i++) {
      const context: AttackContext = {
        attacker: character,
        weapon: weapon,
        hasAdvantage: false,
        targetAC: 15,
        targetSize: 'medium',
        round: 1,
        turn: 1,
        scenario: scenario
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        hitCount++;
        const hasSneakAttack = result.specialEffects?.some(effect => effect.name === 'Sneak Attack');
        if (hasSneakAttack) {
          sneakAttackCount++;
        }
        
        // Debug: Log first few results
        if (i < 5) {
          console.log(`Attack ${i + 1}: Hit=${result.hit}, SneakAttack=${hasSneakAttack}, TotalDamage=${result.totalDamage}`);
          console.log(`  Special Effects:`, result.specialEffects?.map(e => e.name));
        }
      }
    }
    
    console.log(`\nAdvantage Rate 0.0 Results:`);
    console.log(`  Total Hits: ${hitCount}/${testRuns}`);
    console.log(`  Sneak Attacks: ${sneakAttackCount}/${hitCount} hits`);
    console.log(`  Sneak Attack Rate: ${hitCount > 0 ? (sneakAttackCount / hitCount * 100).toFixed(1) : 0}%`);
    
    // With 0.0 advantage rate, basic rogue should have 0% sneak attack rate
    if (hitCount > 0) {
      const sneakAttackRate = sneakAttackCount / hitCount;
      expect(sneakAttackRate).toBe(0.0); // Basic rogue needs advantage for sneak attack
    }
  });

  test('should show difference between flat and advantage scenarios', () => {
    const flatScenario: CombatScenario = {
      rounds: 10,
      targetAC: 15,
      targetSize: 'medium',
      advantageRate: 0.0,
      attacksPerRound: 1
    };

    const advantageScenario: CombatScenario = {
      rounds: 10,
      targetAC: 15,
      targetSize: 'medium',
      advantageRate: 1.0,
      attacksPerRound: 1
    };

    const flatResult = combatResolver.simulateCombat(character, weapon, flatScenario);
    const advantageResult = combatResolver.simulateCombat(character, weapon, advantageScenario);

    console.log(`\nCombat Simulation Comparison:`);
    console.log(`Flat Rolls (0% advantage):`);
    console.log(`  Average Damage: ${flatResult.averageDamagePerRound.toFixed(1)}`);
    console.log(`  Total Damage: ${flatResult.totalDamage}`);
    
    console.log(`Advantage (100% advantage):`);
    console.log(`  Average Damage: ${advantageResult.averageDamagePerRound.toFixed(1)}`);
    console.log(`  Total Damage: ${advantageResult.totalDamage}`);
    
    console.log(`Damage Increase: ${((advantageResult.totalDamage - flatResult.totalDamage) / flatResult.totalDamage * 100).toFixed(1)}%`);

    // Advantage should result in higher damage due to more sneak attacks
    expect(advantageResult.totalDamage).toBeGreaterThan(flatResult.totalDamage);
  });
});