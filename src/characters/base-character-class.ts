/**
 * Base character class system for D&D 5e classes
 * Provides common progression patterns and interface for all character classes
 */

import { CharacterClass } from './classes/types';
import { DiceType } from '../core/types';

/**
 * Ability scores enumeration
 */
export enum AbilityScore {
  STRENGTH = 'strength',
  DEXTERITY = 'dexterity',
  CONSTITUTION = 'constitution',
  INTELLIGENCE = 'intelligence',
  WISDOM = 'wisdom',
  CHARISMA = 'charisma'
}

/**
 * Class progression data for a specific level
 */
export interface ClassProgression {
  level: number;
  proficiencyBonus: number;
  features: string[];
  spellSlots?: SpellSlots;
  classSpecificData: Record<string, any>;
}

/**
 * Spell slots for spellcasting classes
 */
export interface SpellSlots {
  first?: number;
  second?: number;
  third?: number;
  fourth?: number;
  fifth?: number;
  sixth?: number;
  seventh?: number;
  eighth?: number;
  ninth?: number;
}

/**
 * Individual class feature definition
 */
export interface ClassFeature {
  name: string;
  level: number;
  description: string;
  type: 'passive' | 'active' | 'resource';
  trigger?: 'hit' | 'crit' | 'turn' | 'hemorrhage' | undefined;
  effectType?: 'damage' | 'crit_range' | 'hit_bonus' | 'advantage_source' | undefined;
  diceExpression?: string | undefined;
}

/**
 * Base interface that all character classes must implement
 */
export interface BaseCharacterClass {
  readonly className: CharacterClass;
  readonly hitDie: DiceType;
  readonly primaryAbility: AbilityScore;
  readonly savingThrowProficiencies: AbilityScore[];
  
  /**
   * Get progression data for a specific level
   */
  getProgression(level: number): ClassProgression;
  
  /**
   * Get all features available at a specific level
   */
  getFeatures(level: number): ClassFeature[];
  
  /**
   * Get proficiency bonus for a specific level
   */
  getProficiencyBonus(level: number): number;
  
  /**
   * Get class-specific data for a level (e.g., sneak attack dice, spell slots)
   */
  getClassSpecificData(level: number): Record<string, any>;
}

/**
 * Abstract base class implementation providing common D&D 5e progression patterns
 */
export abstract class AbstractCharacterClass implements BaseCharacterClass {
  abstract readonly className: CharacterClass;
  abstract readonly hitDie: DiceType;
  abstract readonly primaryAbility: AbilityScore;
  abstract readonly savingThrowProficiencies: AbilityScore[];
  
  /**
   * Standard D&D 5e proficiency bonus calculation
   * Formula: Math.ceil(level / 4) + 1
   */
  getProficiencyBonus(level: number): number {
    if (level < 1 || level > 20) {
      throw new Error(`Invalid character level: ${level}. Must be between 1 and 20.`);
    }
    return Math.ceil(level / 4) + 1;
  }
  
  /**
   * Get progression data for a specific level
   * Subclasses should override to provide class-specific progression
   */
  getProgression(level: number): ClassProgression {
    return {
      level,
      proficiencyBonus: this.getProficiencyBonus(level),
      features: this.getFeatures(level).map(f => f.name),
      classSpecificData: this.getClassSpecificData(level)
    };
  }
  
  /**
   * Abstract method for getting class features
   * Must be implemented by each character class
   */
  abstract getFeatures(level: number): ClassFeature[];
  
  /**
   * Abstract method for getting class-specific data
   * Must be implemented by each character class
   */
  abstract getClassSpecificData(level: number): Record<string, any>;
  
  /**
   * Validate level is within D&D 5e bounds
   */
  protected validateLevel(level: number): void {
    if (level < 1 || level > 20) {
      throw new Error(`Invalid character level: ${level}. Must be between 1 and 20.`);
    }
  }
  
  /**
   * Get all levels from 1 to specified level (for cumulative features)
   */
  protected getLevelsUpTo(level: number): number[] {
    this.validateLevel(level);
    return Array.from({ length: level }, (_, i) => i + 1);
  }
}

/**
 * Utility functions for character class progression
 */
export class CharacterClassUtils {
  /**
   * Calculate standard D&D 5e proficiency bonus
   */
  static calculateProficiencyBonus(level: number): number {
    if (level < 1 || level > 20) {
      throw new Error(`Invalid character level: ${level}. Must be between 1 and 20.`);
    }
    return Math.ceil(level / 4) + 1;
  }
  
  /**
   * Get ability score modifier from ability score
   */
  static getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
  
  /**
   * Validate character class enum value
   */
  static isValidCharacterClass(className: string): className is CharacterClass {
    return Object.values(CharacterClass).includes(className as CharacterClass);
  }
}