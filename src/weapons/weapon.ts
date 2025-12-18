/**
 * Weapon system implementation for D&D 5e weapons
 * Handles weapon loading, damage calculation, and special mechanics
 */

import { WeaponDefinition, BleedMechanic, AttackContext, AttackResult } from '../core/types';
import { DiceEngine } from '../core/dice';
import { WeaponFeature, HemorrhageFeature } from './weapon-features';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Type for weapons with hemorrhage feature
 */
export type WeaponWithHemorrhage = Weapon & {
  getHemorrhageCounter(): number;
  resetCounter(): void;
  switchTarget(): void;
  checkHemorrhageTrigger(creatureSize: string): boolean;
  rollHemorrhageDamage(proficiencyBonus: number): number;
};

/**
 * Type guard to check if weapon has hemorrhage feature
 */
export function hasHemorrhageFeature(weapon: Weapon): weapon is WeaponWithHemorrhage {
  return weapon.features.some(f => f.name === 'Hemorrhage');
}

/**
 * Base weapon class with damage calculation
 */
export class Weapon {
  protected definition: WeaponDefinition;
  protected dice: DiceEngine;
  public features: WeaponFeature[] = [];

  constructor(definition: WeaponDefinition, diceEngine?: DiceEngine) {
    this.definition = definition;
    this.dice = diceEngine || new DiceEngine();
    this.initializeFeatures();
  }

  /**
   * Initialize weapon features based on special mechanics
   */
  protected initializeFeatures(): void {
    if (!this.definition.specialMechanics) {
      return;
    }

    for (const mechanic of this.definition.specialMechanics) {
      if (mechanic.type === 'bleed') {
        const hemorrhageFeature = new HemorrhageFeature(
          mechanic as BleedMechanic, 
          this.dice,
          this.definition.baseBleedDamageDieCount
        );
        this.features.push(hemorrhageFeature);
      }
    }
  }

  /**
   * Get weapon name
   */
  getName(): string {
    return this.definition.name;
  }

  /**
   * Get weapon rarity
   */
  getRarity(): string {
    return this.definition.rarity;
  }

  /**
   * Get magical bonus
   */
  getMagicalBonus(): number {
    return this.definition.magicalBonus;
  }

  /**
   * Get weapon properties
   */
  getProperties(): string[] {
    return [...this.definition.properties];
  }

  /**
   * Roll base weapon damage
   */
  rollBaseDamage(isCritical: boolean = false): number {
    // Parse the base damage (e.g., "1d8" -> 1 die of d8)
    const parsed = this.dice.parseDiceExpression(this.definition.baseDamage);
    let diceCount = parsed.count;
    
    // Double dice on critical hits
    if (isCritical) {
      diceCount *= 2;
    }
    
    const rolls = this.dice.rollMultiple(diceCount, parsed.type);
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + parsed.bonus;
    
    return total;
  }

  /**
   * Get base damage dice expression
   */
  getBaseDamage(): string {
    return this.definition.baseDamage;
  }

  /**
   * Get damage type
   */
  getDamageType(): string {
    return this.definition.damageType;
  }

  /**
   * Apply special mechanics using feature system
   */
  applySpecialMechanics(context: AttackContext): AttackResult {
    // Base implementation - calculate basic damage
    const attackRoll = this.dice.roll({
      count: 1,
      type: 'd20',
      bonus: context.attacker.getAttackBonus() + this.getMagicalBonus(),
      advantage: context.hasAdvantage
    });

    const hit = attackRoll.total >= context.targetAC;
    const critical = attackRoll.critical || false;

    let baseDamage = 0;
    let bonusDamage = 0;

    if (hit) {
      baseDamage = this.rollBaseDamage(critical);
      bonusDamage = context.attacker.getDamageBonus() + this.getMagicalBonus();
    }

    const result: AttackResult = {
      hit,
      critical,
      baseDamage,
      bonusDamage,
      specialEffects: [],
      totalDamage: baseDamage + bonusDamage
    };

    // Apply all weapon features
    for (const feature of this.features) {
      feature.applyToAttack(context, result);
    }

    return result;
  }

  /**
   * Reset all weapon features (for target switching)
   */
  switchTarget(): void {
    for (const feature of this.features) {
      if (feature.switchTarget) {
        feature.switchTarget();
      }
    }
  }

  /**
   * Get hemorrhage counter (for testing)
   */
  getHemorrhageCounter(): number {
    const hemorrhageFeature = this.features.find(f => f.name === 'Hemorrhage') as HemorrhageFeature;
    return hemorrhageFeature ? hemorrhageFeature.getHemorrhageCounter() : 0;
  }

  /**
   * Reset hemorrhage counter (for testing)
   */
  resetCounter(): void {
    const hemorrhageFeature = this.features.find(f => f.name === 'Hemorrhage') as HemorrhageFeature;
    if (hemorrhageFeature) {
      hemorrhageFeature.reset();
    }
  }



  /**
   * Check hemorrhage trigger (for testing)
   */
  checkHemorrhageTrigger(creatureSize: string): boolean {
    const hemorrhageFeature = this.features.find(f => f.name === 'Hemorrhage') as HemorrhageFeature;
    if (hemorrhageFeature) {
      return hemorrhageFeature.checkHemorrhageTrigger(creatureSize);
    }
    return false;
  }

  /**
   * Roll hemorrhage damage (for testing)
   */
  rollHemorrhageDamage(proficiencyBonus: number): number {
    const hemorrhageFeature = this.features.find(f => f.name === 'Hemorrhage') as HemorrhageFeature;
    if (hemorrhageFeature) {
      return hemorrhageFeature.rollHemorrhageDamage(proficiencyBonus);
    }
    return 0;
  }

  /**
   * Get display name with magical bonus
   */
  getDisplayName(): string {
    const bonus = this.getMagicalBonus();
    if (bonus > 0) {
      return `${this.getName()} +${bonus}`;
    }
    return this.getName();
  }

  /**
   * Get weapon definition (for serialization/debugging)
   */
  getDefinition(): WeaponDefinition {
    return { ...this.definition };
  }
}





/**
 * Weapon builder utility functions
 */
export class WeaponBuilder {
  /**
   * Load a weapon from a JSON file
   */
  static loadFromFile(filePath: string, diceEngine?: DiceEngine): Weapon {
    try {
      const fullPath = path.resolve(filePath);
      const jsonData = fs.readFileSync(fullPath, 'utf-8');
      const definition = JSON.parse(jsonData) as WeaponDefinition;
      
      // Validate required fields
      WeaponBuilder.validateDefinition(definition);
      
      return WeaponBuilder.createWeapon(definition, diceEngine);
    } catch (error) {
      throw new Error(`Failed to load weapon from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a weapon from a JSON string
   */
  static loadFromJson(jsonString: string, diceEngine?: DiceEngine): Weapon {
    try {
      const definition = JSON.parse(jsonString) as WeaponDefinition;
      WeaponBuilder.validateDefinition(definition);
      return WeaponBuilder.createWeapon(definition, diceEngine);
    } catch (error) {
      throw new Error(`Failed to parse weapon JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a weapon from a definition object
   */
  static fromDefinition(definition: WeaponDefinition, diceEngine?: DiceEngine): Weapon {
    WeaponBuilder.validateDefinition(definition);
    return WeaponBuilder.createWeapon(definition, diceEngine);
  }

  /**
   * Create weapon using feature system
   */
  private static createWeapon(definition: WeaponDefinition, diceEngine?: DiceEngine): Weapon {
    // All weapons now use the base Weapon class with features
    return new Weapon(definition, diceEngine);
  }

  /**
   * Validate a weapon definition
   */
  private static validateDefinition(definition: WeaponDefinition): void {
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error('Weapon definition must have a valid name');
    }

    const validRarities = ['common', 'uncommon', 'rare', 'very-rare', 'legendary'];
    if (!definition.rarity || !validRarities.includes(definition.rarity)) {
      throw new Error(`Weapon definition must have a valid rarity. Valid rarities: ${validRarities.join(', ')}`);
    }

    if (!definition.baseDamage || typeof definition.baseDamage !== 'string') {
      throw new Error('Weapon definition must have a valid baseDamage dice expression');
    }

    if (!definition.damageType || typeof definition.damageType !== 'string') {
      throw new Error('Weapon definition must have a valid damageType');
    }

    if (!Array.isArray(definition.properties)) {
      throw new Error('Weapon definition must have properties array');
    }

    if (typeof definition.magicalBonus !== 'number') {
      throw new Error('Weapon definition must have a valid magicalBonus number');
    }

    // Validate special mechanics if present
    if (definition.specialMechanics) {
      if (!Array.isArray(definition.specialMechanics)) {
        throw new Error('specialMechanics must be an array');
      }

      for (const mechanic of definition.specialMechanics) {
        if (!mechanic.name || !mechanic.type || !mechanic.parameters) {
          throw new Error('Each special mechanic must have name, type, and parameters');
        }
      }
    }
  }

  /**
   * Create a baseline weapon for comparison
   */
  static createBaseline(name: string, baseDamage: string, magicalBonus: number, damageType: string = 'slashing'): Weapon {
    const definition: WeaponDefinition = {
      name,
      rarity: magicalBonus === 0 ? 'common' : magicalBonus === 1 ? 'uncommon' : magicalBonus === 2 ? 'rare' : 'very-rare',
      baseDamage,
      damageType,
      properties: ['finesse'],
      magicalBonus,
      specialMechanics: []
    };

    return new Weapon(definition);
  }
}