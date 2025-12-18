/**
 * Tracks hemorrhage/bleed damage for weapons with bleed mechanics
 */

import { IMetricsTracker, CombatContext, TrackerMetrics } from '../../combat-metrics-engine';
import { MetricsRegistry } from '../../metrics-registry';
import { AttackResult } from '../../../core/types';

export class HemorrhageMetrics implements IMetricsTracker {
  private bleedDamage: number = 0;
  private bleedCounterAdded: number = 0;
  private bleedFromCrits: number = 0;
  private bleedFromNonCrits: number = 0;
  private bleedThreshold: number = 0;
  private hemorrhagesTriggered: number = 0;
  private bleedOverflow: number = 0;
  private firstHemorrhageRound: number | null = null;
  private currentRound: number = 0;

  getCategory(): 'reportSpecific' {
    return 'reportSpecific';
  }

  getName(): string {
    return 'bleed';
  }

  onCombatStart(context: CombatContext): void {
    this.bleedDamage = 0;
    this.bleedCounterAdded = 0;
    this.bleedFromCrits = 0;
    this.bleedFromNonCrits = 0;
    this.hemorrhagesTriggered = 0;
    this.bleedOverflow = 0;
    this.firstHemorrhageRound = null;
    this.currentRound = 0;

    // Set bleed threshold based on enemy size
    this.bleedThreshold = this.getBleedThresholdForSize(context.enemySize);
  }

  onAttack(result: AttackResult): void {
    this.currentRound++;

    // Look for bleed-related special effects
    for (const effect of result.specialEffects) {
      if (effect.name === 'Bleed Counter') {
        this.bleedCounterAdded += effect.damage;
        
        // Track whether bleed came from crit or non-crit
        if (result.critical) {
          this.bleedFromCrits += effect.damage;
        } else {
          this.bleedFromNonCrits += effect.damage;
        }
      }
      
      if (effect.name === 'Hemorrhage') {
        this.bleedDamage += effect.damage;
        this.hemorrhagesTriggered++;
        
        // Track first hemorrhage
        if (this.firstHemorrhageRound === null) {
          this.firstHemorrhageRound = this.currentRound;
        }
      }
    }
  }

  onCombatEnd(): TrackerMetrics {
    const metrics: TrackerMetrics = {
      bleed_damage: this.bleedDamage,
      bleed_counter_added: this.bleedCounterAdded,
      bleed_from_crits: this.bleedFromCrits,
      bleed_from_non_crits: this.bleedFromNonCrits,
      bleed_threshold: this.bleedThreshold,
      hemorrhages_triggered: this.hemorrhagesTriggered,
      bleed_overflow: this.bleedOverflow
    };

    if (this.firstHemorrhageRound !== null) {
      metrics['rounds_to_first_hemorrhage'] = this.firstHemorrhageRound;
    }

    return metrics;
  }

  private getBleedThresholdForSize(size: string): number {
    const thresholds: Record<string, number> = {
      tiny: 12,
      small: 12,
      medium: 12,
      large: 16,
      huge: 20,
      gargantuan: 24
    };

    return thresholds[size.toLowerCase()] || 12; // Default to medium
  }
}

// Auto-register when module loads!
MetricsRegistry.registerWeaponMechanicTracker('bleed', () => new HemorrhageMetrics());