/**
 * Tracks sneak attack damage for rogues
 */

import { IMetricsTracker, CombatContext, TrackerMetrics } from '../../../combat/combat-metrics-engine';
import { MetricsRegistry } from '../../../combat/metrics-registry';
import { AttackResult } from '../../../core/types';

export class SneakAttackMetrics implements IMetricsTracker {
  private sneakAttackDamage: number = 0;

  getCategory(): 'classSpecific' {
    return 'classSpecific';
  }

  getName(): string {
    return 'rogue';
  }

  onCombatStart(_context: CombatContext): void {
    this.sneakAttackDamage = 0;
  }

  onAttack(result: AttackResult): void {
    for (const effect of result.specialEffects) {
      if (effect.name === 'Sneak Attack') {
        this.sneakAttackDamage += effect.damage;
      }
    }
  }

  onCombatEnd(): TrackerMetrics {
    return {
      sneak_attack_damage: this.sneakAttackDamage
    };
  }
}

// Auto-register when module loads!
MetricsRegistry.registerClassTracker('Rogue', () => new SneakAttackMetrics());