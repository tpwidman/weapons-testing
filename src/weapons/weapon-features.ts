/**
 * Weapon Feature System
 * Reusable weapon mechanics that can be applied to any weapon
 */

import { AttackContext, AttackResult, BleedMechanic } from '../core/types';
import { DiceEngine } from '../core/dice';

/**
 * Base weapon feature interface
 */
export interface WeaponFeature {
  name: string;
  applyToAttack(context: AttackContext, result: AttackResult): void;
  reset?(): void;
  switchTarget?(): void;
}

/**
 * Hemorrhage/Bleed Counter Feature
 * Tracks bleed buildup and triggers hemorrhage damage
 */
export class HemorrhageFeature implements WeaponFeature {
  name = 'Hemorrhage';
  
  private hemorrhageCounter: number = 0;
  private bleedMechanic: BleedMechanic;
  private dice: DiceEngine;
  private baseBleedDamageDieCount: number | undefined;

  constructor(bleedMechanic: BleedMechanic, diceEngine: DiceEngine, baseBleedDamageDieCount?: number) {
    this.bleedMechanic = bleedMechanic;
    this.dice = diceEngine;
    this.baseBleedDamageDieCount = baseBleedDamageDieCount;
  }

  /**
   * Apply hemorrhage mechanics to an attack
   */
  applyToAttack(context: AttackContext, result: AttackResult): void {
    if (!result.hit) {
      return; // Only applies to hits
    }

    // Check if target is immune to bleed effects
    if (this.isTargetBleedImmune(context)) {
      result.specialEffects.push({
        name: 'Bleed Immunity',
        damage: 0,
        type: 'immunity',
        triggered: true
      });
      return;
    }

    // Build hemorrhage counter
    const counterIncrease = this.buildBleedCounter(context.hasAdvantage, result.critical);
    
    result.specialEffects.push({
      name: 'Bleed Counter',
      damage: counterIncrease,
      type: 'counter',
      triggered: true
    });

    // Check for hemorrhage trigger
    if (this.checkHemorrhageTrigger(context.targetSize)) {
      const hemorrhageDamage = this.rollHemorrhageDamage(context.attacker.getProficiencyBonus());
      
      result.specialEffects.push({
        name: 'Hemorrhage',
        damage: hemorrhageDamage,
        type: 'necrotic',
        triggered: true
      });

      // Update result with hemorrhage info
      result.hemorrhageTriggered = true;
      result.hemorrhageDamage = hemorrhageDamage;
      result.totalDamage += hemorrhageDamage;

      // Reset counter after hemorrhage
      this.reset();
    }
  }

  /**
   * Build bleed counter based on attack type
   */
  private buildBleedCounter(hasAdvantage: boolean, isCritical: boolean): number {
    // Simple dice rolling without string manipulation
    let diceCount: number;
    let diceType: 'd4' | 'd8';
    
    if (hasAdvantage) {
      diceCount = 1;
      diceType = 'd8';
    } else {
      diceCount = 1;
      diceType = 'd4';
    }

    // For critical hits, double the dice count
    if (isCritical) {
      diceCount *= 2;
    }

    const rolls = this.dice.rollMultiple(diceCount, diceType);
    const counterIncrease = rolls.reduce((sum, roll) => sum + roll, 0);
    
    this.hemorrhageCounter += counterIncrease;
    return counterIncrease;
  }

  /**
   * Check if hemorrhage threshold is reached
   */
  checkHemorrhageTrigger(creatureSize: string): boolean {
    const { thresholds } = this.bleedMechanic.parameters;
    const threshold = thresholds[creatureSize.toLowerCase() as keyof typeof thresholds];
    
    if (threshold === undefined) {
      throw new Error(`Unknown creature size: ${creatureSize}`);
    }

    return this.hemorrhageCounter >= threshold;
  }

  /**
   * Roll hemorrhage damage
   */
  rollHemorrhageDamage(proficiencyBonus: number): number {
    // Check if weapon has baseBleedDamageDieCount property
    const baseBleedDice = this.baseBleedDamageDieCount;
    if (baseBleedDice !== undefined) {
      // Use the configurable die count - simple and clean
      const rolls = this.dice.rollMultiple(baseBleedDice, 'd6');
      return rolls.reduce((sum, roll) => sum + roll, 0);
    }
    
    // Fall back to proficiency bonus calculation (3 + proficiency_bonus)d6
    const diceCount = 3 + proficiencyBonus;
    const rolls = this.dice.rollMultiple(diceCount, 'd6');
    return rolls.reduce((sum, roll) => sum + roll, 0);
  }

  /**
   * Check if target is immune to bleed effects
   */
  private isTargetBleedImmune(context: AttackContext): boolean {
    // Check explicit bleed immunity flag
    if ((context as any).bleedImmunity) {
      return true;
    }

    // Check for construct creature types (typically immune to bleed)
    const targetSize = context.targetSize.toLowerCase();
    if (targetSize.includes('construct') || targetSize.includes('undead') || targetSize.includes('elemental')) {
      return true;
    }

    return false;
  }

  /**
   * Reset hemorrhage counter
   */
  reset(): void {
    this.hemorrhageCounter = 0;
  }

  /**
   * Get current hemorrhage counter (for testing)
   */
  getHemorrhageCounter(): number {
    return this.hemorrhageCounter;
  }

  /**
   * Force reset counter (for target switching)
   */
  switchTarget(): void {
    this.reset();
  }
}