/**
 * Core type definitions for the Weapon Damage Simulator
 * These types will be expanded in later implementation tasks
 */

// Dice system types
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface DiceRoll {
  count: number;
  type: DiceType;
  bonus?: number;
  advantage?: boolean;
  disadvantage?: boolean;
}

export interface DiceResult {
  total: number;
  rolls: number[];
  bonus: number;
  explanation: string;
  critical?: boolean;
}

export interface ParsedDiceExpression {
  count: number;
  type: DiceType;
  bonus: number;
}

// Simulation types
export interface SimulationConfig {
  iterations: number;
  seed?: number;
}

// Import statistical types from statistics module
export type { DamageStatistics, HemorrhageStatistics, ConsistencyMetrics, StatisticalAnalysis } from '../simulation/statistics';

// Import baseline comparison types
export type { 
  BaselineWeaponTemplate, 
  WeaponComparison, 
  ComparisonReport 
} from '../simulation/baseline';

// Character system types
export interface CharacterTemplate {
  name: string;
  level: number;
  class: string;
  subclass: string;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  proficiencyBonus: number;
  classFeatures: ClassFeature[];
  attackModifiers: AttackModifier[];
  damageModifiers: DamageModifier[];
}

export interface ClassFeature {
  name: string;
  type: 'passive' | 'triggered' | 'resource';
  trigger?: 'hit' | 'crit' | 'turn' | 'hemorrhage';
  effect: FeatureEffect;
}

export interface FeatureEffect {
  type: 'damage' | 'crit_range' | 'hit_bonus' | 'advantage_source';
  value?: number;
  diceExpression?: string;
  condition?: string;
  description?: string;
}

export interface AttackModifier {
  name: string;
  hitBonus: number;
  critRange: number; // 20 for normal, 19 for improved crit
}

export interface DamageModifier {
  name: string;
  damageBonus: number;
  damageType: string;
  trigger: 'always' | 'hit' | 'crit' | 'hemorrhage';
  diceExpression?: string; // e.g., "3d6" for Sneak Attack
}

// Weapon system types
export interface WeaponDefinition {
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';
  baseDamage: string; // e.g., "1d8"
  damageType: string;
  properties: string[];
  magicalBonus: number;
  specialMechanics?: SpecialMechanic[];
}

export interface SpecialMechanic {
  name: string;
  type: 'bleed' | 'elemental' | 'burst' | 'healing';
  parameters: Record<string, any>;
}

export interface BleedMechanic extends SpecialMechanic {
  type: 'bleed';
  parameters: {
    counterDice: {
      normal: string; // "1d4"
      advantage: string; // "1d8"
      critical: boolean; // doubles dice
    };
    thresholds: {
      tiny: number;
      small: number;
      medium: number;
      large: number;
      huge: number;
      gargantuan: number;
    };
    hemorrhageDamage: string; // "proficiency_bonus d6"
    saveEffect?: {
      type: string;
      dc: string;
      failureEffect: string;
    };
  };
}

export interface HealingMechanic extends SpecialMechanic {
  type: 'healing';
  parameters: {
    trigger: string;
    tempHP: string;
  };
}

// Combat system types
export interface AttackContext {
  attacker: any; // Character - avoiding circular dependency
  weapon: any; // Weapon - avoiding circular dependency
  hasAdvantage: boolean;
  targetAC: number;
  targetSize: string;
  round: number;
  turn: number;
  scenario?: any; // CombatScenario - avoiding circular dependency
  bleedImmunity?: boolean; // Target immunity to bleed effects
}

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  baseDamage: number;
  critDamage?: number; // Extra damage from critical hit (calculated by weapon, not assumed)
  bonusDamage: number;
  specialEffects: SpecialEffect[];
  totalDamage: number;
  hemorrhageTriggered?: boolean;
  hemorrhageDamage?: number;
  tempHPGained?: number;
  wastedDamage?: number; // Damage that exceeded target HP (killing blow)
  targetSwitched?: boolean; // Whether target was switched this attack
  round?: number; // Combat round number (for tracking)
}

export interface SpecialEffect {
  name: string;
  damage: number;
  type: string;
  triggered: boolean;
}



export interface RoundResult {
  round: number;
  attacks: AttackResult[];
  totalDamage: number;
  hemorrhageTriggered: boolean;
  tempHPGained: number;
}



// Enhanced Combat Metrics types
export interface RawMetrics {
  universal: UniversalMetrics;
  classSpecific?: ClassSpecificMetrics;
  reportSpecific?: ReportSpecificMetrics;
}

export interface UniversalMetrics {
  combat_id: string;
  weapon: string;
  advantage: boolean;
  enemy_ac: number;
  enemy_size: string;
  rounds_simulated: number;
  attacks_made: number;
  hits: number;
  misses: number;
  crit_hits: number;
  non_crit_hits: number;
  total_damage: number;
  weapon_damage: number;
  crit_bonus_damage: number;
  rounds_to_first_crit?: number;
}

export interface ClassSpecificMetrics {
  rogue?: {
    sneak_attack_damage: number;
  };
}

export interface ReportSpecificMetrics {
  bleed?: {
    bleed_damage: number;
    bleed_counter_added: number;
    bleed_from_crits: number;
    bleed_from_non_crits: number;
    bleed_threshold: number;
    hemorrhages_triggered: number;
    bleed_overflow: number;
    rounds_to_first_hemorrhage?: number;
  };
}

export interface MetricDefinition {
  name: string;
  expression: string;
  description?: string;
}

export interface MetricsError {
  type: 'missing_data' | 'calculation_error' | 'expression_error';
  metric: string;
  message: string;
  combatId?: string;
}

// Import types will be resolved at runtime to avoid circular dependencies