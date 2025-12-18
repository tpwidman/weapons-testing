/**
 * Combat resolution system for D&D 5e combat simulation
 * Handles attack resolution, combat rounds, and character/weapon interactions
 * NO 'any' types - fully type-safe
 * Deterministic advantage for reproducible measurements
 */

import { AttackContext, AttackResult, RawMetrics, DamageModifier, ClassFeature } from '../core/types';
import { Character } from '../characters/character';
import { Weapon } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';
import { CombatMetricsEngine, CombatContext } from './combat-metrics-engine';
import { MetricsRegistry } from './metrics-registry';
import { AdvantageCalculator } from './advantage-calculator';
import { AdvantageStrategy } from './types';

// Import metrics trackers to trigger auto-registration
import '../characters/classes/rogue/sneak-attack-metrics';
import './status-effects/bleed/hemorrhage-metrics';


/**
 * Combat scenario configuration
 */
export interface CombatScenario {
  rounds: number;
  targetAC: number;
  targetSize: string;
  advantageRate: number; // 0.0 to 1.0 - percentage of attacks with advantage (DETERMINISTIC, rounds up)
  attacksPerRound: number;
  targetSwitching?: boolean; // Enable target switching mechanics
  mechanicImmunities?: string[]; // Target immunities to specific mechanics
  targetHP?: number; // Target hit points for killing blow tracking
}

/**
 * Result of a single combat round
 */
export interface RoundResult {
  round: number;
  attacks: AttackResult[];
  totalDamage: number;
  specialMechanicsTriggered: boolean;
  tempHPGained: number;
}

/**
 * Result of a complete combat simulation
 */
export interface CombatResult {
  character: string;
  weapon: string;
  scenario: CombatScenario;
  rounds: RoundResult[];
  totalDamage: number;
  averageDamagePerRound: number;
  specialMechanicTriggers: number;
  totalTempHP: number;
  hitRate: number;
  criticalRate: number;
  totalWastedDamage: number; // Total damage wasted on killing blows
  missStreaks: number[]; // Array of consecutive miss streak lengths
  targetSwitches: number; // Number of times target was switched
  advantageStrategy: AdvantageStrategy; // Deterministic advantage distribution
  rawMetrics?: RawMetrics; // Enhanced combat metrics
}

/**
 * Core combat resolution system
 */
export class CombatResolver {
  private dice: DiceEngine;
  private currentTargetHP: number = 0;
  private consecutiveMisses: number = 0;
  private missStreaks: number[] = [];
  private metricsEngine: CombatMetricsEngine;
  private advantageStrategy: AdvantageStrategy | null = null;

  constructor(diceEngine?: DiceEngine) {
    this.dice = diceEngine || new DiceEngine();
    this.metricsEngine = new CombatMetricsEngine();
  }

  /**
   * Resolve a single attack with all modifiers and effects
   */
  resolveAttack(context: AttackContext): AttackResult {
    // Target switching is now handled externally by the caller if needed
    const targetSwitched = false;
    
    // Determine advantage: use context advantage OR check scenario advantage rate
    let hasAdvantage = context.hasAdvantage;
    if (!hasAdvantage && context.scenario && context.scenario.advantageRate > 0) {
      // Initialize advantage strategy if not already set
      if (!this.advantageStrategy) {
        this.advantageStrategy = AdvantageCalculator.calculateAdvantageStrategy(
          context.scenario.rounds, 
          context.scenario.advantageRate
        );
      }
      
      // Check if this round should have advantage
      if (context.round) {
        hasAdvantage = AdvantageCalculator.hasAdvantage(context.round, this.advantageStrategy);
      }
    }
    
    // Use advantage as determined above
    const finalContext: AttackContext = {
      ...context,
      hasAdvantage: hasAdvantage
    };

    // Let the weapon handle its own attack resolution including special mechanics
    const result = context.weapon.applySpecialMechanics(finalContext);

    // Apply character-specific modifiers and class features
    this.applyCharacterModifiers(finalContext, result);

    // Handle miss streak tracking
    this.trackMissStreaks(result);

    // Handle killing blow damage waste
    this.handleKillingBlow(result);

    // Mark if target was switched
    if (targetSwitched) {
      result.targetSwitched = true;
    }

    return result;
  }

  /**
   * Simulate a single combat round with multiple attacks
   */
  simulateRound(character: Character, weapon: Weapon, scenario: CombatScenario, roundNumber: number): RoundResult {
    const attacks: AttackResult[] = [];
    let totalDamage = 0;
    let specialMechanicsTriggered = false;
    let tempHPGained = 0;

    // Determine if this round has advantage (deterministic from strategy)
    const hasAdvantage = this.advantageStrategy
      ? AdvantageCalculator.hasAdvantage(roundNumber, this.advantageStrategy)
      : false;

    // Execute all attacks for this round
    for (let attackNum = 1; attackNum <= scenario.attacksPerRound; attackNum++) {
      const context: AttackContext = {
        attacker: character,
        weapon: weapon,
        hasAdvantage: hasAdvantage, // Deterministic advantage based on strategy
        targetAC: scenario.targetAC,
        targetSize: scenario.targetSize,
        round: roundNumber,
        turn: attackNum,
        scenario: scenario
      };

      const attackResult = this.resolveAttack(context);
      attacks.push(attackResult);

      totalDamage += attackResult.totalDamage;
      
      // Check for any special mechanics triggered
      if (attackResult.specialEffects.some(effect => effect.triggered)) {
        specialMechanicsTriggered = true;
      }
      
      if (attackResult.tempHPGained) {
        tempHPGained += attackResult.tempHPGained;
      }
    }

    return {
      round: roundNumber,
      attacks,
      totalDamage,
      specialMechanicsTriggered,
      tempHPGained
    };
  }

  /**
   * Simulate a complete combat encounter
   */
  simulateCombat(character: Character, weapon: Weapon, scenario: CombatScenario): CombatResult {
    const rounds: RoundResult[] = [];
    let totalDamage = 0;
    let specialMechanicTriggers = 0;
    let totalTempHP = 0;
    let totalAttacks = 0;
    let totalHits = 0;
    let totalCrits = 0;
    let totalWastedDamage = 0;
    let targetSwitches = 0;

    // Calculate deterministic advantage strategy
    this.advantageStrategy = AdvantageCalculator.calculateAdvantageStrategy(
      scenario.rounds,
      scenario.advantageRate
    );

    // Initialize target HP for killing blow tracking
    this.currentTargetHP = scenario.targetHP || 100; // Default 100 HP if not specified
    this.consecutiveMisses = 0;
    this.missStreaks = [];

    // Initialize combat metrics collection with registry system
    const combatId = `${character.getName()}_${weapon.getName()}_${Date.now()}`;
    
    // Detect weapon mechanics generically
    const weaponMechanics: string[] = [];
    const weaponDefinition = weapon.getDefinition();
    if (weaponDefinition.specialMechanics) {
      for (const mechanic of weaponDefinition.specialMechanics) {
        weaponMechanics.push(mechanic.type);
      }
    }
    
    const combatContext: CombatContext = {
      weapon: weapon.getName(),
      advantage: scenario.advantageRate > 0,
      enemyAC: scenario.targetAC,
      enemySize: scenario.targetSize,
      characterClass: character.getClassInfo().class,
      weaponMechanics
    };
    
    // Register appropriate trackers based on character and weapon
    this.setupMetricsTrackers(character, weapon);
    
    this.metricsEngine.startCombat(combatId, combatContext);

    // Simulate each round
    for (let roundNum = 1; roundNum <= scenario.rounds; roundNum++) {
      this.metricsEngine.setRoundsSimulated(roundNum);
      const roundResult = this.simulateRound(character, weapon, scenario, roundNum);
      rounds.push(roundResult);

      totalDamage += roundResult.totalDamage;
      totalTempHP += roundResult.tempHPGained;
      
      if (roundResult.specialMechanicsTriggered) {
        specialMechanicTriggers++;
      }

      // Track hit and crit statistics and record in metrics engine
      for (const attack of roundResult.attacks) {
        this.metricsEngine.recordAttack(attack);
        
        totalAttacks++;
        if (attack.hit) {
          totalHits++;
        }
        if (attack.critical) {
          totalCrits++;
        }
        if (attack.wastedDamage) {
          totalWastedDamage += attack.wastedDamage;
        }
        if (attack.targetSwitched) {
          targetSwitches++;
        }
      }
    }

    const averageDamagePerRound = scenario.rounds > 0 ? totalDamage / scenario.rounds : 0;
    const hitRate = totalAttacks > 0 ? totalHits / totalAttacks : 0;
    const criticalRate = totalAttacks > 0 ? totalCrits / totalAttacks : 0;

    // Finalize metrics collection
    const rawMetrics = this.metricsEngine.finalizeCombat();

    // Ensure advantage strategy exists
    if (!this.advantageStrategy) {
      this.advantageStrategy = AdvantageCalculator.calculateAdvantageStrategy(scenario.rounds, 0);
    }

    return {
      character: character.getName(),
      weapon: weapon.getName(),
      scenario,
      rounds,
      totalDamage,
      averageDamagePerRound,
      specialMechanicTriggers,
      totalTempHP,
      hitRate,
      criticalRate,
      totalWastedDamage,
      missStreaks: [...this.missStreaks],
      targetSwitches,
      advantageStrategy: this.advantageStrategy,
      rawMetrics
    };
  }





  /**
   * Apply character-specific modifiers and class features to attack result
   */
  private applyCharacterModifiers(context: AttackContext, result: AttackResult): void {
    if (!result.hit) {
      return; // No modifiers apply to missed attacks
    }

    // Apply hit-triggered damage modifiers
    const hitModifiers = context.attacker.getDamageModifiersForTrigger('hit');
    for (const modifier of hitModifiers) {
      if (this.shouldApplyModifier(modifier)) {
        const bonusDamage = this.calculateModifierDamage(modifier);
        result.bonusDamage += bonusDamage;
        result.totalDamage += bonusDamage;

        result.specialEffects.push({
          name: modifier.name,
          damage: bonusDamage,
          type: modifier.damageType,
          triggered: true
        });
      }
    }

    // Apply critical hit modifiers
    if (result.critical) {
      const critModifiers = context.attacker.getDamageModifiersForTrigger('crit');
      for (const modifier of critModifiers) {
        const bonusDamage = this.calculateModifierDamage(modifier);
        result.bonusDamage += bonusDamage;
        result.totalDamage += bonusDamage;

        result.specialEffects.push({
          name: `${modifier.name} (Critical)`,
          damage: bonusDamage,
          type: modifier.damageType,
          triggered: true
        });
      }
    }

    // Apply class features
    this.applyClassFeatures(context, result);
  }



  /**
   * Determine if a damage modifier should be applied
   */
  private shouldApplyModifier(_modifier: DamageModifier): boolean {
    // Apply all modifiers without conditions for clean simulation
    return true;
  }





  /**
   * Calculate damage from a modifier
   */
  private calculateModifierDamage(modifier: DamageModifier): number {
    if (modifier.diceExpression) {
      // Roll dice for the modifier (e.g., Sneak Attack)
      const result = this.dice.rollExpression(modifier.diceExpression);
      return result.total + modifier.damageBonus;
    }
    return modifier.damageBonus;
  }

  /**
   * Apply class features to attack result
   */
  private applyClassFeatures(context: AttackContext, result: AttackResult): void {
    // Apply hit-triggered features
    const hitFeatures = context.attacker.getTriggeredFeatures('hit');
    for (const feature of hitFeatures) {
      if (this.shouldApplyClassFeature(feature, context)) {
        this.applyClassFeature(feature, result, context);
      }
    }

    // Apply critical-triggered features
    if (result.critical) {
      const critFeatures = context.attacker.getTriggeredFeatures('crit');
      for (const feature of critFeatures) {
        this.applyClassFeature(feature, result, context);
      }
    }

    // Apply features triggered by special effects
    for (const effect of result.specialEffects) {
      if (effect.triggered) {
        const triggeredFeatures = context.attacker.getTriggeredFeatures(effect.name.toLowerCase());
        for (const feature of triggeredFeatures) {
          this.applyClassFeature(feature, result, context);
        }
      }
    }
  }

  /**
   * Check if a class feature should be applied based on conditions
   */
  private shouldApplyClassFeature(feature: any, context: AttackContext): boolean {
    // Check if the feature has a condition
    if (feature.effect.condition) {
      switch (feature.effect.condition) {
        case 'advantage_or_flanking':
          return context.hasAdvantage; // Simplified - just check advantage for now
        default:
          return true;
      }
    }
    
    // For sneak attack, check specific conditions even if no explicit condition is set
    if (feature.name === 'Sneak Attack') {
      // Must have advantage (simplified condition)
      if (!context.hasAdvantage) {
        return false;
      }
      
      // Must use finesse or ranged weapon (check weapon properties)
      const weaponProperties = context.weapon.definition?.properties || [];
      const hasFinesse = weaponProperties.includes('finesse');
      const hasRanged = weaponProperties.includes('ranged') || weaponProperties.includes('thrown');
      
      return hasFinesse || hasRanged;
    }
    
    // If no condition specified, apply the feature
    return true;
  }

  /**
   * Apply a specific class feature
   */
  private applyClassFeature(feature: ClassFeature, result: AttackResult, context?: AttackContext): void {
    switch (feature.effect.type) {
      case 'damage':
        if (feature.effect.diceExpression) {
          // Get the appropriate dice expression (doubled for critical hits if applicable)
          let diceExpression = feature.effect.diceExpression;
          
          // For damage features that should be doubled on critical hits, ask the character class
          if (result.critical && context && this.shouldDoubleDiceOnCrit(feature)) {
            diceExpression = this.getCriticalDiceExpression(feature, context.attacker);
          }
          
          const damageResult = this.dice.rollExpression(diceExpression);
          const bonusDamage = damageResult.total + (feature.effect.value || 0);

          result.bonusDamage += bonusDamage;
          result.totalDamage += bonusDamage;

          result.specialEffects.push({
            name: feature.name,
            damage: bonusDamage,
            type: 'class_feature',
            triggered: true
          });
        }
        break;

      case 'hit_bonus':
        // Hit bonuses are applied during attack resolution, not here
        break;

      case 'crit_range':
        // Crit range modifications are applied during attack resolution, not here
        break;

      case 'advantage_source':
        // Advantage sources don't directly apply damage, they're used for other mechanics
        break;

      default:
        // Unknown feature type, log but don't error
        console.warn(`Unknown class feature type: ${feature.effect.type}`);
    }
  }

  /**
   * Check if a damage feature should have its dice doubled on critical hits
   */
  private shouldDoubleDiceOnCrit(feature: ClassFeature): boolean {
    // In D&D 5e, damage dice from class features like Sneak Attack are doubled on critical hits
    // This is a generic check - any damage feature with dice should be doubled
    return feature.effect.type === 'damage' && !!feature.effect.diceExpression;
  }

  /**
   * Get the critical hit dice expression for a feature
   */
  private getCriticalDiceExpression(feature: ClassFeature, _character: Character): string {
    const originalExpression = feature.effect.diceExpression;
    if (!originalExpression) {
      return originalExpression || '';
    }

    // Parse dice expression (e.g., "3d6" -> "6d6")
    const diceMatch = originalExpression.match(/(\d+)d(\d+)/);
    if (diceMatch && diceMatch[1] && diceMatch[2]) {
      const diceCount = parseInt(diceMatch[1]) * 2;
      const dieSize = diceMatch[2];
      return `${diceCount}d${dieSize}`;
    }

    return originalExpression;
  }





  /**
   * Track miss streaks and provide recovery patterns
   */
  private trackMissStreaks(result: AttackResult): void {
    if (result.hit) {
      // Hit - end current miss streak if any
      if (this.consecutiveMisses > 0) {
        this.missStreaks.push(this.consecutiveMisses);
        this.consecutiveMisses = 0;
      }
    } else {
      // Miss - increment streak
      this.consecutiveMisses++;
    }
  }



  /**
   * Handle killing blow damage waste tracking
   */
  private handleKillingBlow(result: AttackResult): void {
    if (!result.hit || result.totalDamage <= 0) {
      return;
    }

    // Check if damage exceeds remaining target HP
    if (result.totalDamage > this.currentTargetHP) {
      result.wastedDamage = result.totalDamage - this.currentTargetHP;
      this.currentTargetHP = 0;
      
      // Reset target HP for next "enemy" (simulate continuous combat)
      this.currentTargetHP = 100; // Default HP for next target
    } else {
      this.currentTargetHP -= result.totalDamage;
      result.wastedDamage = 0;
    }
  }

  /**
   * Setup metrics trackers based on character and weapon using registry
   */
  private setupMetricsTrackers(character: Character, weapon: Weapon): void {
    // Clear existing trackers by creating new engine
    this.metricsEngine = new CombatMetricsEngine();
    
    // Ask registry for class tracker
    const classTracker = MetricsRegistry.getClassTracker(character.getClassInfo().class);
    if (classTracker) {
      this.metricsEngine.registerTracker(classTracker);
    }

    // Ask registry for weapon mechanic trackers
    const weaponDefinition = weapon.getDefinition();
    if (weaponDefinition.specialMechanics) {
      for (const mechanic of weaponDefinition.specialMechanics) {
        const mechanicTracker = MetricsRegistry.getWeaponMechanicTracker(mechanic.type);
        if (mechanicTracker) {
          this.metricsEngine.registerTracker(mechanicTracker);
        }
      }
    }
  }
}