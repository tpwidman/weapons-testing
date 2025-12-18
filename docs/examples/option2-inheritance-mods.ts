/**
 * OPTION 2: Inheritance-based Mods
 *
 * Characters and weapons provide MetricsMod subclasses that extend
 * the base metrics tracking. More OOP-style, metrics coupled to game objects.
 */

import { AttackResult } from '../../core/types';

// ============================================================================
// GENERIC METRICS ENGINE (stays in combat-metrics-engine.ts)
// ============================================================================

/**
 * Base class for metrics modifications
 * Subclasses override methods to add custom tracking
 */
export abstract class MetricsMod {
  protected metrics: Record<string, any> = {};

  /**
   * Called when combat starts
   */
  onCombatStart(context: any): void {
    this.metrics = {};
  }

  /**
   * Called for each attack - override to track custom metrics
   */
  abstract onAttack(result: AttackResult): void;

  /**
   * Get the final metrics object
   */
  getMetrics(): Record<string, any> {
    return this.metrics;
  }

  /**
   * Get the category this mod belongs to
   */
  abstract getCategory(): 'classSpecific' | 'reportSpecific' | 'custom';

  /**
   * Get the subcategory key (e.g., 'rogue', 'bleed')
   */
  abstract getSubcategory(): string;
}

/**
 * Generic Combat Metrics Engine - NO references to game mechanics
 */
export class CombatMetricsEngine {
  private combatId: string = '';
  private context: any = null;
  private mods: MetricsMod[] = [];

  // Only tracks UNIVERSAL metrics
  private attacksMade: number = 0;
  private hits: number = 0;
  private totalDamage: number = 0;

  /**
   * Add a metrics mod (from character or weapon)
   */
  addMod(mod: MetricsMod): void {
    this.mods.push(mod);
  }

  startCombat(combatId: string, context: any): void {
    this.combatId = combatId;
    this.context = context;
    this.resetMetrics();

    for (const mod of this.mods) {
      mod.onCombatStart(context);
    }
  }

  recordAttack(result: AttackResult): void {
    // Track universal metrics
    this.attacksMade++;
    if (result.hit) {
      this.hits++;
      this.totalDamage += result.totalDamage;
    }

    // Let mods track their stuff
    for (const mod of this.mods) {
      mod.onAttack(result);
    }
  }

  finalizeCombat(): any {
    const metrics: any = {
      universal: {
        combat_id: this.combatId,
        attacks_made: this.attacksMade,
        hits: this.hits,
        total_damage: this.totalDamage
      }
    };

    // Collect metrics from mods
    for (const mod of this.mods) {
      const category = mod.getCategory();
      const subcategory = mod.getSubcategory();

      if (!metrics[category]) {
        metrics[category] = {};
      }
      metrics[category][subcategory] = mod.getMetrics();
    }

    return metrics;
  }

  private resetMetrics(): void {
    this.attacksMade = 0;
    this.hits = 0;
    this.totalDamage = 0;
  }
}

// ============================================================================
// SPECIFIC MODS (live in separate files or in character/weapon classes)
// ============================================================================

/**
 * Example: Rogue Metrics Mod
 * Could live in: src/characters/rogue-metrics-mod.ts
 */
export class RogueMetricsMod extends MetricsMod {
  getCategory(): 'classSpecific' {
    return 'classSpecific';
  }

  getSubcategory(): string {
    return 'rogue';
  }

  onAttack(result: AttackResult): void {
    // Track sneak attack damage
    for (const effect of result.specialEffects) {
      if (effect.name === 'Sneak Attack') {
        if (!this.metrics.sneak_attack_damage) {
          this.metrics.sneak_attack_damage = 0;
        }
        this.metrics.sneak_attack_damage += effect.damage;
      }
    }
  }
}

/**
 * Example: Bleed Metrics Mod
 * Could live in: src/weapons/bleed-metrics-mod.ts
 */
export class BleedMetricsMod extends MetricsMod {
  private currentRound: number = 0;

  getCategory(): 'reportSpecific' {
    return 'reportSpecific';
  }

  getSubcategory(): string {
    return 'bleed';
  }

  onCombatStart(context: any): void {
    super.onCombatStart(context);
    this.currentRound = 0;
    this.metrics = {
      bleed_damage: 0,
      bleed_counter_added: 0,
      hemorrhages_triggered: 0,
      first_hemorrhage_round: null
    };
  }

  onAttack(result: AttackResult): void {
    this.currentRound = result.round || this.currentRound;

    for (const effect of result.specialEffects) {
      if (effect.name === 'Bleed Counter') {
        this.metrics.bleed_counter_added += effect.damage;
      }
      if (effect.name === 'Hemorrhage') {
        this.metrics.bleed_damage += effect.damage;
        this.metrics.hemorrhages_triggered++;
        if (this.metrics.first_hemorrhage_round === null) {
          this.metrics.first_hemorrhage_round = this.currentRound;
        }
      }
    }
  }
}

// ============================================================================
// USAGE - Character/Weapon provide their mods
// ============================================================================

/**
 * Example Character class that provides its metrics mod
 */
export class Character {
  private characterClass: string;

  constructor(characterClass: string) {
    this.characterClass = characterClass;
  }

  /**
   * Character provides its metrics mod based on class
   */
  getMetricsMod(): MetricsMod | null {
    if (this.characterClass === 'Rogue') {
      return new RogueMetricsMod();
    }
    return null;
  }
}

/**
 * Example Weapon class that provides its metrics mod
 */
export class Weapon {
  private hasBleed: boolean;

  constructor(hasBleed: boolean) {
    this.hasBleed = hasBleed;
  }

  /**
   * Weapon provides its metrics mod based on mechanics
   */
  getMetricsMod(): MetricsMod | null {
    if (this.hasBleed) {
      return new BleedMetricsMod();
    }
    return null;
  }
}

/**
 * Usage in CombatResolver
 */
export function exampleUsageInCombatResolver() {
  const character = new Character('Rogue');
  const weapon = new Weapon(true); // has bleed

  const metricsEngine = new CombatMetricsEngine();

  // CombatResolver asks character/weapon for their mods
  const characterMod = character.getMetricsMod();
  if (characterMod) {
    metricsEngine.addMod(characterMod);
  }

  const weaponMod = weapon.getMetricsMod();
  if (weaponMod) {
    metricsEngine.addMod(weaponMod);
  }

  // Now run combat
  metricsEngine.startCombat('combat_1', {});
  // ... combat happens ...
  const metrics = metricsEngine.finalizeCombat();
}
