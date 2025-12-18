/**
 * Bleed Weapon Feature
 *
 * Weapon feature that adds bleed counter to a target by rolling dice.
 * Counter amount varies based on hit type (normal, advantage, crit).
 *
 * Based on Sanguine Dagger:
 * - Normal hit: 1d4
 * - Advantage hit: 1d8
 * - Crit: 2d4 (or 2d8 with advantage)
 */

import { DamageType } from '../../../combat/types';

/**
 * Dice configuration for bleed counter buildup
 */
export interface BleedCounterDice {
  /** Dice for normal hit */
  normalHit: string;

  /** Dice for hit with advantage */
  advantageHit: string;

  /** Dice for critical hit */
  criticalHit: string;

  /** Dice for critical hit with advantage */
  criticalAdvantageHit: string;
}

/**
 * Default bleed counter dice (Sanguine Dagger)
 */
export const DEFAULT_BLEED_COUNTER_DICE: BleedCounterDice = {
  normalHit: '1d4',
  advantageHit: '1d8',
  criticalHit: '2d4',
  criticalAdvantageHit: '2d8'
};

/**
 * Configuration for bleed weapon feature
 */
export interface BleedFeatureConfig {
  /** Dice configuration for counter buildup */
  counterDice: BleedCounterDice;

  /** Damage type for the bleed buildup */
  damageType: DamageType;

  /** Can only track one target at a time */
  singleTargetOnly: boolean;

  /** Counter resets if target not attacked on turn */
  resetsOnMissedTurn: boolean;

  /** Magical healing reduces counter */
  reducedByHealing: boolean;
}

/**
 * Result of applying bleed feature to an attack
 */
export interface BleedFeatureResult {
  /** Amount of bleed counter added (rolled result) */
  counterAdded: number;

  /** Dice expression that was rolled */
  diceExpression: string;

  /** Was this from a critical hit? */
  fromCrit: boolean;

  /** Was this with advantage? */
  withAdvantage: boolean;
}

/**
 * Default bleed feature configuration (Sanguine Dagger)
 */
export const DEFAULT_BLEED_CONFIG: BleedFeatureConfig = {
  counterDice: DEFAULT_BLEED_COUNTER_DICE,
  damageType: DamageType.PIERCING,
  singleTargetOnly: true,
  resetsOnMissedTurn: true,
  reducedByHealing: true
};

/**
 * Get the appropriate dice expression based on hit type
 */
export function getBleedCounterDice(
  isCrit: boolean,
  hasAdvantage: boolean,
  dice: BleedCounterDice = DEFAULT_BLEED_COUNTER_DICE
): string {
  if (isCrit && hasAdvantage) {
    return dice.criticalAdvantageHit;
  } else if (isCrit) {
    return dice.criticalHit;
  } else if (hasAdvantage) {
    return dice.advantageHit;
  } else {
    return dice.normalHit;
  }
}
