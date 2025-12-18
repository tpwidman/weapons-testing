/**
 * Core status effect types
 *
 * Status effects are conditions on targets that can be built up by multiple sources
 * and proc/trigger various effects.
 */

/**
 * Status effect types enumeration
 */
export enum StatusEffectType {
  BLEED = 'bleed',
  POISON = 'poison',
  BURNING = 'burning',
  STUNNED = 'stunned',
  PARALYZED = 'paralyzed'
}

/**
 * Base interface for all status effects
 */
export interface StatusEffect {
  /** Type of status effect */
  type: StatusEffectType;

  /** Current stacks/counter/duration */
  value: number;

  /** Is the target immune to this effect? */
  immune: boolean;

  /** Number of times this effect has procced */
  procCount: number;
}
