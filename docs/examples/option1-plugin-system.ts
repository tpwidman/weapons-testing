/**
 * OPTION 1: Plugin/Callback System
 *
 * The CombatMetricsEngine is completely generic and knows nothing about
 * specific game mechanics. Plugins register themselves and listen to events.
 */

import { AttackResult } from '../../core/types';

// ============================================================================
// GENERIC METRICS ENGINE (stays in combat-metrics-engine.ts)
// ============================================================================

/**
 * Plugin interface - any class can implement this to track custom metrics
 */
export interface MetricsCollector {
  /**
   * Called when combat starts
   */
  onCombatStart(context: any): void;

  /**
   * Called for each attack made
   */
  onAttack(result: AttackResult): void;

  /**
   * Called when combat ends - return your custom metrics
   */
  onCombatEnd(): Record<string, any>;

  /**
   * Return the category this collector belongs to
   */
  getCategory(): 'classSpecific' | 'reportSpecific';

  /**
   * Return the name/key for these metrics within the category
   * Examples: 'rogue', 'bleed', 'paladin'
   */
  getName(): string;
}

/**
 * Generic Combat Metrics Engine - NO references to game mechanics
 */
export class CombatMetricsEngine {
  private combatId: string = '';
  private context: any = null;
  private collectors: MetricsCollector[] = [];

  // Only tracks UNIVERSAL metrics (hits, misses, damage, etc.)
  private attacksMade: number = 0;
  private hits: number = 0;
  private totalDamage: number = 0;
  // ... other universal stats

  /**
   * Register a metrics collector plugin
   */
  registerCollector(collector: MetricsCollector): void {
    this.collectors.push(collector);
  }

  /**
   * Start combat and notify all collectors
   */
  startCombat(combatId: string, context: any): void {
    this.combatId = combatId;
    this.context = context;
    this.resetMetrics();

    // Notify all collectors
    for (const collector of this.collectors) {
      collector.onCombatStart(context);
    }
  }

  /**
   * Record an attack and notify all collectors
   */
  recordAttack(result: AttackResult): void {
    // Track universal metrics
    this.attacksMade++;
    if (result.hit) {
      this.hits++;
      this.totalDamage += result.totalDamage;
    }

    // Let collectors track their own stuff
    for (const collector of this.collectors) {
      collector.onAttack(result);
    }
  }

  /**
   * Finalize and collect all metrics
   */
  finalizeCombat(): any {
    const metrics: any = {
      universal: {
        combat_id: this.combatId,
        attacks_made: this.attacksMade,
        hits: this.hits,
        total_damage: this.totalDamage
        // ... other universal metrics
      }
    };

    // Collect metrics from all plugins
    for (const collector of this.collectors) {
      const collectorMetrics = collector.onCombatEnd();
      const category = collector.getCategory();
      const name = collector.getName();

      // Create category object if it doesn't exist
      if (!metrics[category]) {
        metrics[category] = {};
      }

      // Add collector metrics under its name
      metrics[category][name] = collectorMetrics;
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
// SPECIFIC PLUGINS (live in separate files like combat/collectors/bleed.ts)
// ============================================================================

/**
 * Example: Bleed Metrics Collector
 * Lives in: src/combat/collectors/bleed-metrics-collector.ts
 */
export class BleedMetricsCollector implements MetricsCollector {
  private bleedDamage: number = 0;
  private hemorrhagesTriggered: number = 0;
  private bleedCounterAdded: number = 0;
  private firstHemorrhageRound: number | null = null;
  private currentRound: number = 0;

  getCategory(): 'reportSpecific' {
    return 'reportSpecific';
  }

  getName(): string {
    return 'bleed';
  }

  onCombatStart(context: any): void {
    this.bleedDamage = 0;
    this.hemorrhagesTriggered = 0;
    this.bleedCounterAdded = 0;
    this.firstHemorrhageRound = null;
    this.currentRound = 0;
  }

  onAttack(result: AttackResult): void {
    this.currentRound = result.round || this.currentRound;

    // Look for bleed-related special effects
    for (const effect of result.specialEffects) {
      if (effect.name === 'Bleed Counter') {
        this.bleedCounterAdded += effect.damage;
      }
      if (effect.name === 'Hemorrhage') {
        this.bleedDamage += effect.damage;
        this.hemorrhagesTriggered++;
        if (this.firstHemorrhageRound === null) {
          this.firstHemorrhageRound = this.currentRound;
        }
      }
    }
  }

  onCombatEnd(): Record<string, any> {
    const metrics: any = {
      bleed_damage: this.bleedDamage,
      bleed_counter_added: this.bleedCounterAdded,
      hemorrhages_triggered: this.hemorrhagesTriggered
    };

    if (this.firstHemorrhageRound !== null) {
      metrics.rounds_to_first_hemorrhage = this.firstHemorrhageRound;
    }

    return metrics;
  }
}

/**
 * Example: Rogue Metrics Collector
 * Lives in: src/combat/collectors/rogue-metrics-collector.ts
 */
export class RogueMetricsCollector implements MetricsCollector {
  private sneakAttackDamage: number = 0;

  getCategory(): 'classSpecific' {
    return 'classSpecific';
  }

  getName(): string {
    return 'rogue';
  }

  onCombatStart(context: any): void {
    this.sneakAttackDamage = 0;
  }

  onAttack(result: AttackResult): void {
    // Look for sneak attack effects
    for (const effect of result.specialEffects) {
      if (effect.name === 'Sneak Attack') {
        this.sneakAttackDamage += effect.damage;
      }
    }
  }

  onCombatEnd(): Record<string, any> {
    return {
      sneak_attack_damage: this.sneakAttackDamage
    };
  }
}

// ============================================================================
// USAGE IN COMBAT RESOLVER (how you'd actually use this)
// ============================================================================

export function exampleUsageInCombatResolver() {
  const metricsEngine = new CombatMetricsEngine();

  // CombatResolver inspects character/weapon and registers appropriate collectors
  const character = { class: 'Rogue' }; // example
  const weapon = { hasBleedMechanic: true }; // example

  if (character.class === 'Rogue') {
    metricsEngine.registerCollector(new RogueMetricsCollector());
  }

  if (weapon.hasBleedMechanic) {
    metricsEngine.registerCollector(new BleedMetricsCollector());
  }

  // Now run combat - metrics engine is clean and extensible!
  metricsEngine.startCombat('combat_1', { /* context */ });
  // ... combat happens ...
  const metrics = metricsEngine.finalizeCombat();

  // metrics = {
  //   universal: { attacks_made: 10, hits: 7, ... },
  //   classSpecific: { rogue: { sneak_attack_damage: 42 } },
  //   reportSpecific: { bleed: { bleed_damage: 15, ... } }
  // }
}
