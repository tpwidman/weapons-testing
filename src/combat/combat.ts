/**
 * Combat resolution system for D&D 5e combat simulation
 * Handles attack resolution, combat rounds, and character/weapon interactions
 */

import { AttackContext, AttackResult } from '../core/types';
import { Character } from '../characters/character';
import { Weapon } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';

/**
 * Combat scenario configuration
 */
export interface CombatScenario {
  rounds: number;
  targetAC: number;
  targetSize: string;
  advantageRate: number; // 0.0 to 1.0 - probability of having advantage on attacks
  attacksPerRound: number;
  targetSwitching?: boolean; // Enable target switching mechanics
  bleedImmunity?: boolean; // Target is immune to bleed effects
  targetHP?: number; // Target hit points for killing blow tracking
}

/**
 * Result of a single combat round
 */
export interface RoundResult {
  round: number;
  attacks: AttackResult[];
  totalDamage: number;
  hemorrhageTriggered: boolean;
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
  hemorrhageTriggers: number;
  totalTempHP: number;
  hitRate: number;
  criticalRate: number;
  totalWastedDamage: number; // Total damage wasted on killing blows
  missStreaks: number[]; // Array of consecutive miss streak lengths
  targetSwitches: number; // Number of times target was switched
}

/**
 * Core combat resolution system
 */
export class CombatResolver {
  private dice: DiceEngine;
  private currentTargetHP: number = 0;
  private consecutiveMisses: number = 0;
  private missStreaks: number[] = [];

  constructor(diceEngine?: DiceEngine) {
    this.dice = diceEngine || new DiceEngine();
  }

  /**
   * Resolve a single attack with all modifiers and effects
   */
  resolveAttack(context: AttackContext): AttackResult {
    // Check for target switching
    const targetSwitched = this.handleTargetSwitching(context);
    
    // Determine if this attack has advantage based on scenario rate only
    const randomValue = (this.dice.roll({ count: 1, type: 'd10', bonus: 0 }).total - 1) / 10; // 0.0 to 0.9
    const hasAdvantage = context.hasAdvantage || randomValue < this.getAdvantageRate(context);
    
    // Update context with final advantage determination and bleed immunity
    const finalContext: AttackContext = {
      ...context,
      hasAdvantage,
      bleedImmunity: (context as any).bleedImmunity || false
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
    let hemorrhageTriggered = false;
    let tempHPGained = 0;

    // Execute all attacks for this round
    for (let attackNum = 1; attackNum <= scenario.attacksPerRound; attackNum++) {
      const context: AttackContext = {
        attacker: character,
        weapon: weapon,
        hasAdvantage: false, // Will be determined by advantage rate in resolveAttack
        targetAC: scenario.targetAC,
        targetSize: scenario.targetSize,
        round: roundNumber,
        turn: attackNum,
        scenario: scenario,
        bleedImmunity: scenario.bleedImmunity || false
      };

      const attackResult = this.resolveAttack(context);
      attacks.push(attackResult);

      totalDamage += attackResult.totalDamage;
      
      if (attackResult.hemorrhageTriggered) {
        hemorrhageTriggered = true;
      }
      
      if (attackResult.tempHPGained) {
        tempHPGained += attackResult.tempHPGained;
      }
    }

    return {
      round: roundNumber,
      attacks,
      totalDamage,
      hemorrhageTriggered,
      tempHPGained
    };
  }

  /**
   * Simulate a complete combat encounter
   */
  simulateCombat(character: Character, weapon: Weapon, scenario: CombatScenario): CombatResult {
    const rounds: RoundResult[] = [];
    let totalDamage = 0;
    let hemorrhageTriggers = 0;
    let totalTempHP = 0;
    let totalAttacks = 0;
    let totalHits = 0;
    let totalCrits = 0;
    let totalWastedDamage = 0;
    let targetSwitches = 0;

    // Initialize target HP for killing blow tracking
    this.currentTargetHP = scenario.targetHP || 100; // Default 100 HP if not specified
    this.consecutiveMisses = 0;
    this.missStreaks = [];

    // Simulate each round
    for (let roundNum = 1; roundNum <= scenario.rounds; roundNum++) {
      const roundResult = this.simulateRound(character, weapon, scenario, roundNum);
      rounds.push(roundResult);

      totalDamage += roundResult.totalDamage;
      totalTempHP += roundResult.tempHPGained;
      
      if (roundResult.hemorrhageTriggered) {
        hemorrhageTriggers++;
      }

      // Track hit and crit statistics
      for (const attack of roundResult.attacks) {
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

    return {
      character: character.getName(),
      weapon: weapon.getName(),
      scenario,
      rounds,
      totalDamage,
      averageDamagePerRound,
      hemorrhageTriggers,
      totalTempHP,
      hitRate,
      criticalRate,
      totalWastedDamage,
      missStreaks: [...this.missStreaks],
      targetSwitches
    };
  }

  /**
   * Get advantage rate for an attack context
   */
  private getAdvantageRate(context: AttackContext): number {
    // Use the scenario advantage rate directly - don't override it
    return context.scenario?.advantageRate || 0;
  }

  /**
   * Apply character-specific modifiers and class features to attack result
   */
  private applyCharacterModifiers(context: AttackContext, result: AttackResult): void {
    if (!result.hit) {
      return; // No modifiers apply to missed attacks
    }

    // Apply sneak attack if conditions are met
    this.applySneakAttack(context, result);

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

    // Apply hemorrhage-triggered modifiers
    if (result.hemorrhageTriggered) {
      const hemorrhageModifiers = context.attacker.getDamageModifiersForTrigger('hemorrhage');
      for (const modifier of hemorrhageModifiers) {
        const bonusDamage = this.calculateModifierDamage(modifier);
        result.bonusDamage += bonusDamage;
        result.totalDamage += bonusDamage;

        result.specialEffects.push({
          name: `${modifier.name} (Hemorrhage)`,
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
   * Apply sneak attack damage if conditions are met
   */
  private applySneakAttack(context: AttackContext, result: AttackResult): void {
    const classInfo = context.attacker.getClassInfo();
    
    // Only rogues get sneak attack
    if (classInfo.class !== 'Rogue') {
      return;
    }

    // Check if weapon is finesse or ranged (required for sneak attack)
    const weaponProperties = context.weapon.getProperties();
    const isFinesse = weaponProperties.includes('finesse');
    const isRanged = weaponProperties.includes('ranged') || weaponProperties.includes('thrown');
    
    if (!isFinesse && !isRanged) {
      return;
    }

    // Check sneak attack conditions
    const hasSneakAttack = this.checkSneakAttackConditions(context);
    
    if (hasSneakAttack) {
      const sneakAttackDice = this.getSneakAttackDice(context.attacker.getLevel());
      // Double sneak attack dice on critical hits (D&D 5e rule)
      const sneakAttackDamage = this.dice.rollExpression(sneakAttackDice, { critical: result.critical }).total;
      
      result.bonusDamage += sneakAttackDamage;
      result.totalDamage += sneakAttackDamage;

      result.specialEffects.push({
        name: 'Sneak Attack',
        damage: sneakAttackDamage,
        type: 'piercing',
        triggered: true
      });
    }
  }

  /**
   * Check if sneak attack conditions are met
   */
  private checkSneakAttackConditions(context: AttackContext): boolean {
    // Condition 1: Have advantage on the attack roll
    if (context.hasAdvantage) {
      return true;
    }

    // For basic rogues, sneak attack only applies with advantage
    // Additional conditions (flanking, etc.) can be added later
    return false;
  }

  /**
   * Get sneak attack dice based on rogue level
   */
  private getSneakAttackDice(level: number): string {
    // Sneak attack progression: 1d6 at level 1, +1d6 every 2 levels
    const diceCount = Math.ceil(level / 2);
    return `${diceCount}d6`;
  }

  /**
   * Determine if a damage modifier should be applied
   */
  private shouldApplyModifier(modifier: any): boolean {
    // Skip sneak attack modifiers - handled separately now
    if (modifier.name === 'Sneak Attack') {
      return false;
    }

    // Apply all other modifiers without conditions for clean simulation
    return true;
  }



  /**
   * Calculate damage from a modifier
   */
  private calculateModifierDamage(modifier: any): number {
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
      this.applyClassFeature(feature, result);
    }

    // Apply critical-triggered features
    if (result.critical) {
      const critFeatures = context.attacker.getTriggeredFeatures('crit');
      for (const feature of critFeatures) {
        this.applyClassFeature(feature, result);
      }
    }

    // Apply hemorrhage-triggered features
    if (result.hemorrhageTriggered) {
      const hemorrhageFeatures = context.attacker.getTriggeredFeatures('hemorrhage');
      for (const feature of hemorrhageFeatures) {
        this.applyClassFeature(feature, result);
      }
    }
  }

  /**
   * Apply a specific class feature
   */
  private applyClassFeature(feature: any, result: AttackResult): void {
    switch (feature.effect.type) {
      case 'damage':
        if (feature.effect.diceExpression) {
          const damageResult = this.dice.rollExpression(feature.effect.diceExpression);
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
      
      default:
        // Unknown feature type, log but don't error
        console.warn(`Unknown class feature type: ${feature.effect.type}`);
    }
  }



  /**
   * Handle target switching mechanics
   */
  private handleTargetSwitching(context: AttackContext): boolean {
    const scenario = (context as any).scenario;
    
    // Only switch targets if explicitly enabled
    if (!scenario || !scenario.targetSwitching) {
      return false;
    }

    // Switch target every 5 rounds (deterministic)
    if (context.round % 5 === 0) {
      // Reset weapon hemorrhage counter on target switch
      if (context.weapon.switchTarget) {
        context.weapon.switchTarget();
      }
      
      // Reset target HP
      this.currentTargetHP = scenario.targetHP || 100;
      
      return true;
    }
    
    return false;
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
}