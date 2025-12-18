/**
 * Bleed Status Effect
 *
 * Global status effect that tracks bleed buildup on a target.
 * Based on Sanguine Dagger mechanics - tracks one target at a time,
 * counter is built up by rolling dice, procs hemorrhage at threshold.
 */

import { DamageType } from '../../types';

/**
 * Target size categories (for bleed threshold calculation)
 */
export enum TargetSize {
  TINY = 'tiny',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  HUGE = 'huge',
  GARGANTUAN = 'gargantuan'
}

/**
 * Bleed thresholds by target size (from Sanguine Dagger)
 */
export interface BleedThresholds {
  [TargetSize.TINY]: number;
  [TargetSize.SMALL]: number;
  [TargetSize.MEDIUM]: number;
  [TargetSize.LARGE]: number;
  [TargetSize.HUGE]: number;
  [TargetSize.GARGANTUAN]: number;
}

/**
 * Correct bleed thresholds from Sanguine Dagger
 */
export const DEFAULT_BLEED_THRESHOLDS: BleedThresholds = {
  [TargetSize.TINY]: 12,      // Same as small
  [TargetSize.SMALL]: 12,
  [TargetSize.MEDIUM]: 12,
  [TargetSize.LARGE]: 16,
  [TargetSize.HUGE]: 20,
  [TargetSize.GARGANTUAN]: 24
};

/**
 * Hemorrhage damage configuration
 * Damage: (proficiency bonus + 3)d6 necrotic
 */
export interface HemorrhageConfig {
  /** Base dice count (before proficiency bonus) */
  baseDiceCount: number;

  /** Dice type */
  diceType: 'd6';

  /** Proficiency bonus to add to dice count */
  proficiencyBonus: number;

  /** Damage type */
  damageType: DamageType;

  /** Apply slowed condition? */
  appliesSlowedCondition: boolean;
}

/**
 * Default hemorrhage configuration (Sanguine Dagger)
 */
export const DEFAULT_HEMORRHAGE_CONFIG: HemorrhageConfig = {
  baseDiceCount: 3,
  diceType: 'd6',
  proficiencyBonus: 2, // Default, should come from character
  damageType: DamageType.NECROTIC,
  appliesSlowedCondition: true
};

/**
 * Bleed status effect state on a target
 */
export interface BleedStatusState {
  /** Current bleed counter value (accumulated from rolls) */
  counter: number;

  /** Threshold for hemorrhage based on target size */
  threshold: number;

  /** Target size */
  targetSize: TargetSize;

  /** Target identifier (only track one target at a time) */
  targetId?: string;

  /** Counter added from critical hits */
  fromCrits: number;

  /** Counter added from non-critical hits */
  fromNonCrits: number;

  /** Counter added from advantage hits */
  fromAdvantage: number;

  /** Number of hemorrhages triggered */
  hemorrhageCount: number;

  /** Total hemorrhage damage dealt */
  totalHemorrhageDamage: number;

  /** Overflow counter (bleed that exceeds threshold) */
  overflow: number;

  /** Is target immune to bleed? */
  immune: boolean;

  /** Hemorrhage configuration */
  hemorrhageConfig: HemorrhageConfig;

  /** Last round this target was attacked (for counter reset logic) */
  lastAttackedRound?: number;
}

/**
 * Result of a hemorrhage proc
 */
export interface HemorrhageResult {
  /** Damage dealt */
  damage: number;

  /** Damage dice expression used */
  diceExpression: string;

  /** Round it triggered on */
  round: number;

  /** Overflow counter after proc */
  overflow: number;

  /** Is target slowed? */
  targetSlowed: boolean;
}

/**
 * Create initial bleed status state for a target
 */
export function createBleedStatus(
  targetSize: TargetSize,
  proficiencyBonus: number = 2,
  thresholds = DEFAULT_BLEED_THRESHOLDS,
  immune = false
): BleedStatusState {
  const hemorrhageConfig = {
    ...DEFAULT_HEMORRHAGE_CONFIG,
    proficiencyBonus
  };

  return {
    counter: 0,
    threshold: thresholds[targetSize],
    targetSize,
    fromCrits: 0,
    fromNonCrits: 0,
    fromAdvantage: 0,
    hemorrhageCount: 0,
    totalHemorrhageDamage: 0,
    overflow: 0,
    immune,
    hemorrhageConfig
  };
}

/**
 * Calculate hemorrhage damage dice expression
 */
export function getHemorrhageDiceExpression(config: HemorrhageConfig): string {
  const totalDice = config.baseDiceCount + config.proficiencyBonus;
  return `${totalDice}${config.diceType}`;
}
