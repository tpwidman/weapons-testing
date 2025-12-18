/**
 * Core combat type definitions
 * Shared types for combat resolution and metrics
 */

/**
 * Damage type enumeration
 */
export enum DamageType {
  SLASHING = 'slashing',
  PIERCING = 'piercing',
  BLUDGEONING = 'bludgeoning',
  FIRE = 'fire',
  COLD = 'cold',
  LIGHTNING = 'lightning',
  ACID = 'acid',
  POISON = 'poison',
  NECROTIC = 'necrotic',
  RADIANT = 'radiant',
  PSYCHIC = 'psychic',
  FORCE = 'force'
}

/**
 * Damage modifier categories
 * - HIT_MODIFIER: Damage added to hit, DOUBLED on crit (e.g., Sneak Attack, Smite)
 * - STATUS_EFFECT: Damage from status/effect, NOT doubled on crit (e.g., Bleed/Hemorrhage, Poison)
 */
export enum DamageModifierCategory {
  HIT_MODIFIER = 'hit_modifier',
  STATUS_EFFECT = 'status_effect'
}

/**
 * Trigger types for damage modifiers
 */
export enum DamageModifierTrigger {
  ON_HIT = 'on_hit',
  ON_CRIT = 'on_crit',
  STATUS_PROC = 'status_proc',
  ROUND_START = 'round_start',
  ROUND_END = 'round_end'
}

/**
 * Strongly typed damage modifier
 * Used for both weapon mechanics (like bleed on hit) and status effects (like hemorrhage proc)
 */
export interface DamageModifier {
  name: string;
  category: DamageModifierCategory;
  damageType: DamageType;
  trigger: DamageModifierTrigger;
  diceExpression?: string;  // e.g., "2d6" for sneak attack
  flatBonus: number;        // Flat damage bonus
  appliesOnCrit: boolean;   // Should this be doubled on crit?
}

/**
 * Special effect from an attack (strongly typed, no 'any')
 */
export interface SpecialEffect {
  name: string;
  damage: number;
  type: DamageType | 'class_feature';
  triggered: boolean;
  category: DamageModifierCategory;
}

/**
 * Advantage application strategy
 * Deterministic distribution of advantage across combat rounds
 */
export interface AdvantageStrategy {
  /** Total rounds in combat */
  totalRounds: number;
  /** Advantage rate (0.0 to 1.0) */
  rate: number;
  /** Which specific rounds have advantage (1-indexed) */
  advantageRounds: number[];
  /** Number of rounds with advantage (rounded up) */
  advantageCount: number;
}

/**
 * Metrics category for organizing collected metrics
 */
export enum MetricsCategory {
  UNIVERSAL = 'universal',
  CLASS_SPECIFIC = 'classSpecific',
  REPORT_SPECIFIC = 'reportSpecific'
}
