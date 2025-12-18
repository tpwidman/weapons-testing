/**
 * Character system implementation for D&D 5e characters
 * Handles character loading, modifier calculations, and class features
 */

import { CharacterTemplate, ClassFeature, DamageModifier } from '../core/types';
import { createCharacterClass } from './character-class-factory';
import { BaseCharacterClass } from './base-character-class';
import * as fs from 'fs';
import * as path from 'path';

// Import character classes to trigger auto-registration
import './classes/rogue/class';

export class Character {
  private template: CharacterTemplate;
  private characterClass: BaseCharacterClass | null = null;

  constructor(template: CharacterTemplate) {
    this.template = template;
    this.characterClass = createCharacterClass(template.class);
  }

  /**
   * Get the character's total attack bonus
   */
  getAttackBonus(): number {
    return this.template.attackModifiers.reduce((total, modifier) => {
      return total + modifier.hitBonus;
    }, 0);
  }

  /**
   * Get the character's total damage bonus
   */
  getDamageBonus(): number {
    return this.template.damageModifiers
      .filter(modifier => modifier.trigger === 'always')
      .reduce((total, modifier) => {
        return total + modifier.damageBonus;
      }, 0);
  }

  /**
   * Get sources of advantage for attacks
   */
  getAdvantageSources(): ClassFeature[] {
    return this.getClassFeatures().filter(
      feature => feature.effect.type === 'advantage_source'
    );
  }

  /**
   * Get the character's critical hit range (20 for normal, 19 for improved)
   */
  getCritRange(): number {
    return this.template.attackModifiers.reduce((minRange, modifier) => {
      return Math.min(minRange, modifier.critRange);
    }, 20);
  }

  /**
   * Get character's proficiency bonus
   */
  getProficiencyBonus(): number {
    return this.template.proficiencyBonus;
  }

  /**
   * Get character's level
   */
  getLevel(): number {
    return this.template.level;
  }

  /**
   * Get character's name
   */
  getName(): string {
    return this.template.name;
  }

  /**
   * Get character's class and subclass
   */
  getClassInfo(): { class: string; subclass: string } {
    return {
      class: this.template.class,
      subclass: this.template.subclass
    };
  }

  /**
   * Get ability score modifier
   */
  getAbilityModifier(ability: keyof CharacterTemplate['abilityScores']): number {
    const score = this.template.abilityScores[ability];
    return Math.floor((score - 10) / 2);
  }

  /**
   * Get all class features
   */
  getClassFeatures(): ClassFeature[] {
    // If we have a character class implementation, derive features from it
    if (this.characterClass) {
      const derivedFeatures = this.characterClass.getFeatures(this.template.level);
      // Convert to the format expected by the existing system
      return derivedFeatures.map(feature => ({
        name: feature.name,
        type: feature.type === 'active' && feature.trigger ? 'triggered' : 'passive',
        trigger: feature.trigger,
        effect: {
          type: feature.effectType || 'hit_bonus', // Default to hit_bonus for generic features
          diceExpression: feature.diceExpression,
          description: feature.description
        }
      } as ClassFeature));
    }
    
    // Fallback to template features if no class implementation
    return this.template.classFeatures;
  }

  /**
   * Get class features that trigger on specific events
   */
  getTriggeredFeatures(trigger: 'hit' | 'crit' | 'turn' | 'hemorrhage'): ClassFeature[] {
    return this.getClassFeatures().filter(
      feature => feature.type === 'triggered' && feature.trigger === trigger
    );
  }

  /**
   * Get damage modifiers for specific triggers
   */
  getDamageModifiersForTrigger(trigger: 'always' | 'hit' | 'crit' | 'hemorrhage'): DamageModifier[] {
    return this.template.damageModifiers.filter(modifier => modifier.trigger === trigger);
  }

  /**
   * Get the character template (for serialization/debugging)
   */
  getTemplate(): CharacterTemplate {
    return { ...this.template };
  }

  /**
   * Get class-specific data
   */
  getClassSpecificData(): Record<string, any> {
    if (this.characterClass) {
      return this.characterClass.getClassSpecificData(this.template.level);
    }
    return {};
  }

  /**
   * Get the character class instance
   */
  getCharacterClass(): BaseCharacterClass | null {
    return this.characterClass;
  }
}

/**
 * Character builder utility functions
 */
export class CharacterBuilder {
  /**
   * Load a character from a JSON file
   */
  static loadFromFile(filePath: string): Character {
    try {
      const fullPath = path.resolve(filePath);
      const jsonData = fs.readFileSync(fullPath, 'utf-8');
      const template = JSON.parse(jsonData) as CharacterTemplate;
      
      // Validate required fields
      CharacterBuilder.validateTemplate(template);
      
      return new Character(template);
    } catch (error) {
      throw new Error(`Failed to load character from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a character from a JSON string
   */
  static loadFromJson(jsonString: string): Character {
    try {
      const template = JSON.parse(jsonString) as CharacterTemplate;
      CharacterBuilder.validateTemplate(template);
      return new Character(template);
    } catch (error) {
      throw new Error(`Failed to parse character JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a character from a template object
   */
  static fromTemplate(template: CharacterTemplate): Character {
    CharacterBuilder.validateTemplate(template);
    return new Character(template);
  }

  /**
   * Validate a character template
   */
  private static validateTemplate(template: CharacterTemplate): void {
    if (!template.name || typeof template.name !== 'string') {
      throw new Error('Character template must have a valid name');
    }

    if (!template.level || template.level < 1 || template.level > 20) {
      throw new Error('Character template must have a valid level (1-20)');
    }

    if (!template.class || typeof template.class !== 'string') {
      throw new Error('Character template must have a valid class');
    }

    if (!template.abilityScores) {
      throw new Error('Character template must have ability scores');
    }

    const requiredAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    for (const ability of requiredAbilities) {
      if (!(ability in template.abilityScores) || template.abilityScores[ability as keyof typeof template.abilityScores] < 1) {
        throw new Error(`Character template must have a valid ${ability} score`);
      }
    }

    if (!template.proficiencyBonus || template.proficiencyBonus < 2) {
      throw new Error('Character template must have a valid proficiency bonus');
    }

    if (!Array.isArray(template.classFeatures)) {
      throw new Error('Character template must have classFeatures array');
    }

    if (!Array.isArray(template.attackModifiers)) {
      throw new Error('Character template must have attackModifiers array');
    }

    if (!Array.isArray(template.damageModifiers)) {
      throw new Error('Character template must have damageModifiers array');
    }
  }

  /**
   * Calculate proficiency bonus based on level
   */
  static calculateProficiencyBonus(level: number): number {
    if (level < 1 || level > 20) {
      throw new Error('Level must be between 1 and 20');
    }
    return Math.ceil(level / 4) + 1;
  }

  /**
   * Calculate ability modifier from ability score
   */
  static calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
}