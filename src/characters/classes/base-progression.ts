/**
 * Base progression patterns for D&D 5e character classes
 * Provides common progression data and utilities
 */

/**
 * Standard D&D 5e proficiency bonus progression
 */
export const PROFICIENCY_BONUS_PROGRESSION: readonly number[] = [
  2, 2, 2, 2, // Levels 1-4
  3, 3, 3, 3, // Levels 5-8
  4, 4, 4, 4, // Levels 9-12
  5, 5, 5, 5, // Levels 13-16
  6, 6, 6, 6  // Levels 17-20
] as const;

/**
 * Standard ability score improvement levels for most classes
 */
export const STANDARD_ASI_LEVELS: readonly number[] = [4, 8, 12, 16, 19] as const;

/**
 * Fighter gets additional ASI levels
 */
export const FIGHTER_ASI_LEVELS: readonly number[] = [4, 6, 8, 12, 14, 16, 19] as const;

/**
 * Rogue gets additional ASI level
 */
export const ROGUE_ASI_LEVELS: readonly number[] = [4, 8, 10, 12, 16, 19] as const;

/**
 * Common class features that appear across multiple classes
 */
export const COMMON_FEATURES = {
  ABILITY_SCORE_IMPROVEMENT: 'Ability Score Improvement',
  EXTRA_ATTACK: 'Extra Attack',
  FIGHTING_STYLE: 'Fighting Style',
  SPELLCASTING: 'Spellcasting'
} as const;

/**
 * Base progression utility functions
 */
export class BaseProgression {
  /**
   * Get proficiency bonus for a given level using standard progression
   */
  static getProficiencyBonus(level: number): number {
    if (level < 1 || level > 20) {
      throw new Error(`Invalid level: ${level}. Must be between 1 and 20.`);
    }
    const bonus = PROFICIENCY_BONUS_PROGRESSION[level - 1];
    if (bonus === undefined) {
      throw new Error(`No proficiency bonus data for level ${level}`);
    }
    return bonus;
  }
  
  /**
   * Check if a level grants an Ability Score Improvement for standard classes
   */
  static isASILevel(level: number, className?: 'fighter' | 'rogue' | 'standard'): boolean {
    switch (className) {
      case 'fighter':
        return FIGHTER_ASI_LEVELS.includes(level);
      case 'rogue':
        return ROGUE_ASI_LEVELS.includes(level);
      default:
        return STANDARD_ASI_LEVELS.includes(level);
    }
  }
  
  /**
   * Get all ASI levels for a class up to a given level
   */
  static getASILevels(maxLevel: number, className?: 'fighter' | 'rogue' | 'standard'): number[] {
    const asiLevels = className === 'fighter' ? FIGHTER_ASI_LEVELS :
                     className === 'rogue' ? ROGUE_ASI_LEVELS :
                     STANDARD_ASI_LEVELS;
    
    return asiLevels.filter(level => level <= maxLevel);
  }
  
  /**
   * Calculate cantrips known for full spellcasters
   */
  static getCantripsKnown(level: number, _className: 'wizard' | 'sorcerer' | 'warlock' | 'bard' | 'cleric' | 'druid'): number {
    // Standard progression for most full casters
    if (level >= 17) return 4;
    if (level >= 10) return 3;
    if (level >= 4) return 2;
    return 1;
  }
  
  /**
   * Calculate spell slots for full spellcasters (Wizard, Sorcerer, Bard, Cleric, Druid)
   */
  static getFullCasterSpellSlots(level: number): Record<string, number> {
    const slots: Record<string, number> = {};
    
    // 1st level slots
    if (level >= 1) slots['first'] = level >= 2 ? (level >= 3 ? 4 : 3) : 2;
    
    // 2nd level slots
    if (level >= 3) slots['second'] = level >= 4 ? 3 : 2;
    
    // 3rd level slots
    if (level >= 5) slots['third'] = level >= 6 ? 3 : 2;
    
    // 4th level slots
    if (level >= 7) slots['fourth'] = level >= 8 ? 3 : 1;
    
    // 5th level slots
    if (level >= 9) slots['fifth'] = level >= 10 ? (level >= 18 ? 3 : 2) : 1;
    
    // 6th level slots
    if (level >= 11) slots['sixth'] = level >= 19 ? 2 : 1;
    
    // 7th level slots
    if (level >= 13) slots['seventh'] = level >= 20 ? 2 : 1;
    
    // 8th level slots
    if (level >= 15) slots['eighth'] = 1;
    
    // 9th level slots
    if (level >= 17) slots['ninth'] = 1;
    
    return slots;
  }
  
  /**
   * Calculate spell slots for half-casters (Paladin, Ranger)
   */
  static getHalfCasterSpellSlots(level: number): Record<string, number> {
    if (level < 2) return {};
    
    const casterLevel = Math.ceil(level / 2);
    return this.getFullCasterSpellSlots(casterLevel);
  }
  
  /**
   * Calculate spell slots for third-casters (Eldritch Knight, Arcane Trickster)
   */
  static getThirdCasterSpellSlots(level: number): Record<string, number> {
    if (level < 3) return {};
    
    const casterLevel = Math.ceil(level / 3);
    return this.getFullCasterSpellSlots(casterLevel);
  }
}