/**
 * Rogue class implementation for D&D 5e
 * Handles rogue-specific features, progression, and sneak attack mechanics
 */

import { AbstractCharacterClass, ClassFeature, AbilityScore } from '../../base-character-class';
import { CharacterClass } from '../types';
import { DiceType } from '../../../core/types';
import { getRogueLevelData } from './progression';

/**
 * Rogue class implementation with sneak attack and class features
 */
export class RogueClass extends AbstractCharacterClass {
  readonly className = CharacterClass.ROGUE;
  readonly hitDie: DiceType = 'd8';
  readonly primaryAbility = AbilityScore.DEXTERITY;
  readonly savingThrowProficiencies = [AbilityScore.DEXTERITY, AbilityScore.INTELLIGENCE];

  /**
   * Get all features available at a specific level
   */
  getFeatures(level: number): ClassFeature[] {
    this.validateLevel(level);
    
    const features: ClassFeature[] = [];
    
    // Add features for each level up to the current level
    for (let currentLevel = 1; currentLevel <= level; currentLevel++) {
      const levelData = getRogueLevelData(currentLevel);
      
      // Add level-specific features
      for (const featureName of levelData.features) {
        // Skip sneak attack from progression - we'll handle it specially
        if (featureName === 'Sneak Attack') {
          continue;
        }
        
        features.push({
          name: featureName,
          level: currentLevel,
          description: this.getFeatureDescription(featureName, currentLevel),
          type: this.getFeatureType(featureName),
          trigger: this.getFeatureTrigger(featureName),
          effectType: this.getFeatureEffectType(featureName),
          diceExpression: this.getFeatureDiceExpression(featureName, currentLevel)
        });
      }
      

    }
    
    // Add sneak attack feature (available from level 1, scales with level)
    features.push({
      name: 'Sneak Attack',
      level: 1,
      description: `Deal extra ${this.getSneakAttackDice(level)} damage when you have advantage on the attack roll or when the target is within 5 feet of an ally.`,
      type: 'active',
      trigger: 'hit',
      effectType: 'damage',
      diceExpression: this.getSneakAttackDice(level)
    });
    
    return features;
  }

  /**
   * Get class-specific data including sneak attack dice
   */
  getClassSpecificData(level: number): Record<string, any> {
    this.validateLevel(level);
    
    const levelData = getRogueLevelData(level);
    
    return {
      sneakAttackDice: levelData.sneakAttack,
      sneakAttackDiceCount: this.getSneakAttackDiceCount(level),
      expertise: this.getExpertiseCount(level),
      cantripsKnown: 0, // Rogues don't get cantrips by default
      spellsKnown: 0,   // Rogues don't get spells by default (except Arcane Trickster)
      rogueArchetype: level >= 3 ? 'Swashbuckler' : null // Assuming swashbuckler for this implementation
    };
  }

  /**
   * Get sneak attack dice expression for a given level
   */
  getSneakAttackDice(level: number): string {
    this.validateLevel(level);
    return getRogueLevelData(level).sneakAttack;
  }

  /**
   * Get sneak attack dice count for a given level
   */
  getSneakAttackDiceCount(level: number): number {
    this.validateLevel(level);
    return Math.ceil(level / 2);
  }

  /**
   * Check if rogue can use sneak attack with given conditions
   */
  canUseSneakAttack(hasAdvantage: boolean, hasAllyNearby: boolean = false): boolean {
    // Sneak attack requires advantage OR an ally within 5 feet of the target
    return hasAdvantage || hasAllyNearby;
  }

  /**
   * Calculate sneak attack damage for a given level
   */
  calculateSneakAttackDamage(level: number, diceEngine: any): number {
    if (!this.canUseSneakAttack(true)) { // Simplified for now
      return 0;
    }
    
    const diceCount = this.getSneakAttackDiceCount(level);
    const rolls = diceEngine.rollMultiple(diceCount, 'd6');
    return rolls.reduce((sum: number, roll: number) => sum + roll, 0);
  }

  /**
   * Get number of expertise selections available at a given level
   */
  private getExpertiseCount(level: number): number {
    if (level >= 6) return 4; // 2 at level 1, 2 more at level 6
    if (level >= 1) return 2; // 2 at level 1
    return 0;
  }

  /**
   * Get feature description based on feature name and level
   */
  private getFeatureDescription(featureName: string, level: number): string {
    switch (featureName) {
      case 'Expertise':
        return 'Double proficiency bonus for selected skills';
      case 'Sneak Attack':
        return `Deal extra ${this.getSneakAttackDice(level)} damage when you have advantage`;
      case "Thieves' Cant":
        return 'Secret language known by rogues and criminals';
      case 'Cunning Action':
        return 'Use Dash, Disengage, or Hide as a bonus action';
      case 'Roguish Archetype':
        return 'Choose your rogue specialization';
      case 'Ability Score Improvement':
        return 'Increase ability scores or take a feat';
      case 'Uncanny Dodge':
        return 'Halve damage from one attack per turn';
      case 'Evasion':
        return 'Take no damage on successful Dex saves, half on failures';
      case 'Reliable Talent':
        return 'Treat d20 rolls of 9 or lower as 10 for proficient skills';
      case 'Blindsense':
        return 'Detect hidden creatures within 10 feet';
      case 'Slippery Mind':
        return 'Proficiency in Wisdom saving throws';
      case 'Elusive':
        return 'No attack roll has advantage against you while not incapacitated';
      case 'Stroke of Luck':
        return 'Turn a missed attack into a hit or failed save into a success';
      default:
        return `${featureName} feature`;
    }
  }

  /**
   * Get feature type based on feature name
   */
  private getFeatureType(featureName: string): 'passive' | 'active' | 'resource' {
    switch (featureName) {
      case 'Sneak Attack':
      case 'Cunning Action':
      case 'Uncanny Dodge':
      case 'Evasion':
      case 'Stroke of Luck':
        return 'active';
      case 'Ability Score Improvement':
        return 'resource';
      default:
        return 'passive';
    }
  }

  /**
   * Get feature trigger based on feature name
   */
  private getFeatureTrigger(featureName: string): 'hit' | 'crit' | 'turn' | 'hemorrhage' | undefined {
    switch (featureName) {
      case 'Sneak Attack':
        return 'hit';
      case 'Cunning Action':
      case 'Uncanny Dodge':
      case 'Evasion':
        return undefined; // These don't trigger on combat events, they're manual abilities
      default:
        return undefined;
    }
  }

  /**
   * Get feature effect type based on feature name
   */
  private getFeatureEffectType(featureName: string): 'damage' | 'crit_range' | 'hit_bonus' | 'advantage_source' | undefined {
    switch (featureName) {
      case 'Sneak Attack':
        return 'damage';
      case 'Cunning Action':
        return 'advantage_source';
      default:
        return undefined; // Most features don't have a specific effect type
    }
  }

  /**
   * Get feature dice expression based on feature name
   */
  private getFeatureDiceExpression(featureName: string, level: number): string | undefined {
    switch (featureName) {
      case 'Sneak Attack':
        return this.getSneakAttackDice(level);
      default:
        return undefined;
    }
  }
}

/**
 * Factory function to create a rogue class instance
 */
export function createRogueClass(): RogueClass {
  return new RogueClass();
}

// Auto-register the rogue class when this module is loaded
import { registerCharacterClass } from '../../character-class-factory';
registerCharacterClass('Rogue', () => new RogueClass());