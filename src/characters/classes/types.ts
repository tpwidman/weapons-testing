/**
 * Character class type definitions
 */

/**
 * Character class enumeration
 */
export enum CharacterClass {
  ROGUE = 'Rogue',
  FIGHTER = 'Fighter',
  WIZARD = 'Wizard',
  CLERIC = 'Cleric',
  PALADIN = 'Paladin',
  RANGER = 'Ranger',
  BARBARIAN = 'Barbarian',
  MONK = 'Monk',
  DRUID = 'Druid',
  WARLOCK = 'Warlock',
  SORCERER = 'Sorcerer',
  BARD = 'Bard'
}

/**
 * Character class levels for multiclassing support
 */
export interface ClassLevel {
  characterClass: CharacterClass;
  level: number;
}

/**
 * Class feature effect types
 */
export enum FeatureEffectType {
  DAMAGE = 'damage',
  HIT_BONUS = 'hit_bonus',
  CRIT_RANGE = 'crit_range',
  TEMP_HP = 'temp_hp'
}

/**
 * Trigger types for class features
 */
export enum FeatureTrigger {
  HIT = 'hit',
  CRIT = 'crit',
  MISS = 'miss',
  ROUND_START = 'round_start',
  ROUND_END = 'round_end'
}

/**
 * Strongly typed class feature effect
 */
export interface ClassFeatureEffect {
  type: FeatureEffectType;
  value?: number;
  diceExpression?: string;
}

/**
 * Strongly typed class feature
 */
export interface ClassFeature {
  name: string;
  trigger: FeatureTrigger;
  effect: ClassFeatureEffect;
}
