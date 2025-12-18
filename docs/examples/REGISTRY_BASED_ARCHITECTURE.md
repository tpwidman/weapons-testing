# Registry-Based Metrics Architecture

## The Real Problem

Current code has **hardcoded knowledge** in CombatResolver:
```typescript
// BAD - Combat resolver knows about specific features!
if (character.getClassInfo().class === 'Rogue') {
  this.metricsEngine.registerCollector(new RogueMetricsCollector());
}
if (weapon has bleed) {
  this.metricsEngine.registerCollector(new BleedMetricsCollector());
}
```

This violates open/closed principle. Adding a new class/weapon requires modifying CombatResolver!

---

## The Solution: Registry Pattern

**Features register themselves globally**. CombatResolver just asks the registry for trackers.

### Better Naming (No "Collector" Spam!)

Instead of:
- ❌ `RogueMetricsCollector`
- ❌ `BleedMetricsCollector`

Use:
- ✅ `RogueMetrics`
- ✅ `BleedMetrics`

Or even better:
- ✅ `SneakAttackTracker`
- ✅ `HemorrhageTracker`

---

## Directory Structure

```
src/
  combat/
    combat-metrics-engine.ts        # Generic engine
    metrics-registry.ts             # Central registry

  characters/
    classes/
      rogue/
        index.ts                    # Rogue character class
        sneak-attack-metrics.ts     # Rogue metrics tracker
      paladin/
        index.ts
        smite-metrics.ts

  weapons/
    mechanics/
      bleed/
        index.ts                    # Bleed mechanic implementation
        hemorrhage-metrics.ts       # Bleed metrics tracker
      poison/
        index.ts
        poison-metrics.ts
```

Each feature lives in its own directory with its metrics tracker!

---

## Code Example

### 1. Generic Interface (combat-metrics-engine.ts)

```typescript
/**
 * Interface for tracking custom metrics
 * No more "Collector" - just "MetricsTracker" or keep interface simple
 */
export interface IMetricsTracker {
  onCombatStart(context: any): void;
  onAttack(result: AttackResult): void;
  onCombatEnd(): Record<string, any>;
  getCategory(): 'classSpecific' | 'reportSpecific';
  getName(): string;
}

export class CombatMetricsEngine {
  private trackers: IMetricsTracker[] = [];

  registerTracker(tracker: IMetricsTracker): void {
    this.trackers.push(tracker);
  }

  // ... rest of generic implementation
}
```

### 2. Metrics Registry (combat/metrics-registry.ts)

```typescript
/**
 * Central registry for metrics trackers
 * Features register themselves here on module load
 */
export class MetricsRegistry {
  private static classTrackers = new Map<string, () => IMetricsTracker>();
  private static weaponMechanicTrackers = new Map<string, () => IMetricsTracker>();

  /**
   * Register a tracker for a character class
   */
  static registerClassTracker(className: string, factory: () => IMetricsTracker): void {
    this.classTrackers.set(className, factory);
  }

  /**
   * Register a tracker for a weapon mechanic
   */
  static registerWeaponMechanicTracker(mechanicType: string, factory: () => IMetricsTracker): void {
    this.weaponMechanicTrackers.set(mechanicType, factory);
  }

  /**
   * Get tracker for a character class (if exists)
   */
  static getClassTracker(className: string): IMetricsTracker | null {
    const factory = this.classTrackers.get(className);
    return factory ? factory() : null;
  }

  /**
   * Get tracker for a weapon mechanic (if exists)
   */
  static getWeaponMechanicTracker(mechanicType: string): IMetricsTracker | null {
    const factory = this.weaponMechanicTrackers.get(mechanicType);
    return factory ? factory() : null;
  }
}
```

### 3. Rogue Metrics (characters/classes/rogue/sneak-attack-metrics.ts)

```typescript
import { IMetricsTracker } from '../../../combat/combat-metrics-engine';
import { MetricsRegistry } from '../../../combat/metrics-registry';
import { AttackResult } from '../../../core/types';

/**
 * Tracks sneak attack damage for rogues
 */
export class SneakAttackMetrics implements IMetricsTracker {
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

// Auto-register when module loads!
MetricsRegistry.registerClassTracker('Rogue', () => new SneakAttackMetrics());
```

### 4. Bleed Metrics (weapons/mechanics/bleed/hemorrhage-metrics.ts)

```typescript
import { IMetricsTracker } from '../../../combat/combat-metrics-engine';
import { MetricsRegistry } from '../../../combat/metrics-registry';
import { AttackResult } from '../../../core/types';

/**
 * Tracks hemorrhage/bleed damage
 */
export class HemorrhageMetrics implements IMetricsTracker {
  private bleedDamage: number = 0;
  private hemorrhagesTriggered: number = 0;

  getCategory(): 'reportSpecific' {
    return 'reportSpecific';
  }

  getName(): string {
    return 'bleed';
  }

  onCombatStart(context: any): void {
    this.bleedDamage = 0;
    this.hemorrhagesTriggered = 0;
  }

  onAttack(result: AttackResult): void {
    for (const effect of result.specialEffects) {
      if (effect.name === 'Hemorrhage') {
        this.bleedDamage += effect.damage;
        this.hemorrhagesTriggered++;
      }
    }
  }

  onCombatEnd(): Record<string, any> {
    return {
      bleed_damage: this.bleedDamage,
      hemorrhages_triggered: this.hemorrhagesTriggered
    };
  }
}

// Auto-register when module loads!
MetricsRegistry.registerWeaponMechanicTracker('bleed', () => new HemorrhageMetrics());
```

### 5. Clean Combat Resolver (combat/combat.ts)

```typescript
import { MetricsRegistry } from './metrics-registry';

// NO MORE IMPORTS OF SPECIFIC TRACKERS!
// NO "RogueMetricsCollector", "BleedMetricsCollector", etc.

class CombatResolver {
  private setupMetricsTrackers(character: Character, weapon: Weapon): void {
    // Ask registry for class tracker
    const classTracker = MetricsRegistry.getClassTracker(character.getClassInfo().class);
    if (classTracker) {
      this.metricsEngine.registerTracker(classTracker);
    }

    // Ask registry for weapon mechanic trackers
    const weaponDefinition = weapon.getDefinition();
    if (weaponDefinition.specialMechanics) {
      for (const mechanic of weaponDefinition.specialMechanics) {
        const mechanicTracker = MetricsRegistry.getWeaponMechanicTracker(mechanic.type);
        if (mechanicTracker) {
          this.metricsEngine.registerTracker(mechanicTracker);
        }
      }
    }
  }
}
```

---

## Benefits

✅ **No hardcoded feature checks** - CombatResolver doesn't know about Rogue or bleed
✅ **Auto-registration** - Import feature once, it registers itself
✅ **Better organization** - Each feature in its own directory with its metrics
✅ **Cleaner naming** - `SneakAttackMetrics` instead of `RogueMetricsCollector`
✅ **Extensible** - Add new class/weapon by creating new directory, no changes to combat code!

---

## What to Tell Kiro

> "The current approach still has hardcoded if-checks for 'Rogue' and 'bleed' in CombatResolver. I want a **registry pattern** where features register themselves. Each feature (class/weapon mechanic) should live in its own directory with its metrics tracker. CombatResolver should be completely generic and just ask the registry for trackers. Check out `docs/examples/REGISTRY_BASED_ARCHITECTURE.md` for the full design."
