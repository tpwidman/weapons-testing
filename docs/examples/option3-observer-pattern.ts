/**
 * OPTION 3: Event Observer Pattern
 *
 * Metrics engine emits events, observers subscribe and track their own metrics.
 * Most decoupled but more complex for simple cases.
 */

import { AttackResult } from '../../core/types';

// ============================================================================
// GENERIC METRICS ENGINE (stays in combat-metrics-engine.ts)
// ============================================================================

/**
 * Event types the metrics engine can emit
 */
export type MetricsEvent =
  | { type: 'combat_start'; data: { combatId: string; context: any } }
  | { type: 'attack'; data: AttackResult }
  | { type: 'combat_end'; data: { combatId: string } };

/**
 * Observer interface - anything can observe metrics events
 */
export interface MetricsObserver {
  /**
   * Called when a metrics event occurs
   */
  onEvent(event: MetricsEvent): void;

  /**
   * Get category and name for these metrics
   */
  getCategory(): 'classSpecific' | 'reportSpecific';
  getName(): string;

  /**
   * Get metrics data when combat ends
   */
  getMetrics(): Record<string, any> | null;
}

/**
 * Generic Combat Metrics Engine - NO references to game mechanics
 * Pure event emitter, completely decoupled
 */
export class CombatMetricsEngine {
  private combatId: string = '';
  private observers: MetricsObserver[] = [];

  // Only tracks UNIVERSAL metrics
  private attacksMade: number = 0;
  private hits: number = 0;
  private totalDamage: number = 0;

  /**
   * Add an observer to listen to metrics events
   */
  subscribe(observer: MetricsObserver): void {
    this.observers.push(observer);
  }

  /**
   * Remove an observer
   */
  unsubscribe(observer: MetricsObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  startCombat(combatId: string, context: any): void {
    this.combatId = combatId;
    this.resetMetrics();

    // Emit combat start event
    this.emit({
      type: 'combat_start',
      data: { combatId, context }
    });
  }

  recordAttack(result: AttackResult): void {
    // Track universal metrics
    this.attacksMade++;
    if (result.hit) {
      this.hits++;
      this.totalDamage += result.totalDamage;
    }

    // Emit attack event
    this.emit({
      type: 'attack',
      data: result
    });
  }

  finalizeCombat(): any {
    // Emit combat end event
    this.emit({
      type: 'combat_end',
      data: { combatId: this.combatId }
    });

    const metrics: any = {
      universal: {
        combat_id: this.combatId,
        attacks_made: this.attacksMade,
        hits: this.hits,
        total_damage: this.totalDamage
      }
    };

    // Collect metrics from observers
    for (const observer of this.observers) {
      const observerMetrics = observer.getMetrics();
      if (observerMetrics) {
        const category = observer.getCategory();
        const name = observer.getName();

        if (!metrics[category]) {
          metrics[category] = {};
        }
        metrics[category][name] = observerMetrics;
      }
    }

    return metrics;
  }

  private emit(event: MetricsEvent): void {
    for (const observer of this.observers) {
      observer.onEvent(event);
    }
  }

  private resetMetrics(): void {
    this.attacksMade = 0;
    this.hits = 0;
    this.totalDamage = 0;
  }
}

// ============================================================================
// SPECIFIC OBSERVERS (live in separate files)
// ============================================================================

/**
 * Example: Bleed Metrics Observer
 * Lives in: src/combat/observers/bleed-metrics-observer.ts
 */
export class BleedMetricsObserver implements MetricsObserver {
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

  onEvent(event: MetricsEvent): void {
    switch (event.type) {
      case 'combat_start':
        this.reset();
        break;

      case 'attack':
        this.handleAttack(event.data);
        break;

      case 'combat_end':
        // Nothing special to do
        break;
    }
  }

  getMetrics(): Record<string, any> | null {
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

  private handleAttack(result: AttackResult): void {
    this.currentRound = result.round || this.currentRound;

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

  private reset(): void {
    this.bleedDamage = 0;
    this.hemorrhagesTriggered = 0;
    this.bleedCounterAdded = 0;
    this.firstHemorrhageRound = null;
    this.currentRound = 0;
  }
}

/**
 * Example: Rogue Metrics Observer
 * Lives in: src/combat/observers/rogue-metrics-observer.ts
 */
export class RogueMetricsObserver implements MetricsObserver {
  private sneakAttackDamage: number = 0;

  getCategory(): 'classSpecific' {
    return 'classSpecific';
  }

  getName(): string {
    return 'rogue';
  }

  onEvent(event: MetricsEvent): void {
    if (event.type === 'attack') {
      this.handleAttack(event.data);
    } else if (event.type === 'combat_start') {
      this.reset();
    }
  }

  getMetrics(): Record<string, any> | null {
    return {
      sneak_attack_damage: this.sneakAttackDamage
    };
  }

  private handleAttack(result: AttackResult): void {
    for (const effect of result.specialEffects) {
      if (effect.name === 'Sneak Attack') {
        this.sneakAttackDamage += effect.damage;
      }
    }
  }

  private reset(): void {
    this.sneakAttackDamage = 0;
  }
}

// ============================================================================
// USAGE IN COMBAT RESOLVER
// ============================================================================

export function exampleUsageInCombatResolver() {
  const metricsEngine = new CombatMetricsEngine();

  // CombatResolver creates and subscribes observers based on character/weapon
  const character = { class: 'Rogue' };
  const weapon = { hasBleedMechanic: true };

  if (character.class === 'Rogue') {
    const rogueObserver = new RogueMetricsObserver();
    metricsEngine.subscribe(rogueObserver);
  }

  if (weapon.hasBleedMechanic) {
    const bleedObserver = new BleedMetricsObserver();
    metricsEngine.subscribe(bleedObserver);
  }

  // Run combat
  metricsEngine.startCombat('combat_1', {});
  // ... combat happens ...
  const metrics = metricsEngine.finalizeCombat();

  // Later, can unsubscribe if needed
  // metricsEngine.unsubscribe(rogueObserver);
}

/**
 * ALTERNATIVE: Observers could be created by character/weapon themselves
 */
export class CharacterWithObserver {
  getMetricsObserver(): MetricsObserver | null {
    // Character creates its own observer
    return new RogueMetricsObserver();
  }
}
