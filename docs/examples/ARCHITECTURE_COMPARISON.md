# Combat Metrics Engine Architecture Options

## The Problem
The current `CombatMetricsEngine` is polluted with hardcoded references to specific game mechanics (bleed, rogue, sneak attack). We want it to be **generic and extensible** - a framework that knows nothing about specific mechanics.

---

## Option 1: Plugin/Callback System ⭐ (RECOMMENDED)

### Overview
Metrics engine accepts "collector" plugins that implement a simple interface. Each plugin listens to attack events and tracks its own metrics.

### File
See: `docs/examples/option1-plugin-system.ts`

### Structure
```
src/combat/
  combat-metrics-engine.ts        # Generic engine + MetricsCollector interface
  collectors/
    bleed-metrics-collector.ts    # Bleed-specific tracking
    rogue-metrics-collector.ts    # Rogue-specific tracking
```

### How it works in CombatResolver
```typescript
const metricsEngine = new CombatMetricsEngine();

// Inspect character/weapon and register appropriate collectors
if (character.getClass() === 'Rogue') {
  metricsEngine.registerCollector(new RogueMetricsCollector());
}

if (weapon.hasBleedMechanic()) {
  metricsEngine.registerCollector(new BleedMetricsCollector());
}

// Engine stays generic, collectors handle specifics
```

### Pros
✅ **Clean separation** - engine knows nothing about game mechanics
✅ **Easy to test** - test collectors independently
✅ **Easy to extend** - just add new collector classes
✅ **Follows open/closed principle** - open for extension, closed for modification
✅ **Simple interface** - only 5 methods: `getCategory()`, `getName()`, `onCombatStart()`, `onAttack()`, `onCombatEnd()`
✅ **Type-safe** - no string manipulation or path parsing

### Cons
❌ Slightly more boilerplate (one class per mechanic)

---

## Option 2: Inheritance-based Mods

### Overview
Characters/weapons provide `MetricsMod` subclasses. The engine calls methods on these mods to let them track their metrics.

### File
See: `docs/examples/option2-inheritance-mods.ts`

### Structure
```
src/combat/
  combat-metrics-engine.ts        # Generic engine + MetricsMod base class
src/characters/
  rogue-metrics-mod.ts            # Rogue mod
src/weapons/
  bleed-metrics-mod.ts            # Bleed mod
```

### How it works in CombatResolver
```typescript
const metricsEngine = new CombatMetricsEngine();

// Ask game objects for their mods
const characterMod = character.getMetricsMod();
if (characterMod) metricsEngine.addMod(characterMod);

const weaponMod = weapon.getMetricsMod();
if (weaponMod) metricsEngine.addMod(weaponMod);
```

### Pros
✅ **OOP-style** - if you like inheritance
✅ **Metrics live with game objects** - character knows its metrics needs
✅ **Type-safe categories** - getCategory() returns union type

### Cons
❌ **More coupling** - metrics logic lives in character/weapon folders
❌ **Inheritance overhead** - must extend abstract class
❌ **Less flexible** - harder to compose multiple mods

---

## Option 3: Event Observer Pattern

### Overview
Metrics engine is a pure event emitter. Observers subscribe to events and track their own state completely independently.

### File
See: `docs/examples/option3-observer-pattern.ts`

### Structure
```
src/combat/
  combat-metrics-engine.ts        # Generic engine (event emitter)
  observers/
    bleed-metrics-observer.ts     # Bleed observer
    rogue-metrics-observer.ts     # Rogue observer
```

### How it works in CombatResolver
```typescript
const metricsEngine = new CombatMetricsEngine();

// Create and subscribe observers
if (character.getClass() === 'Rogue') {
  metricsEngine.subscribe(new RogueMetricsObserver());
}

if (weapon.hasBleedMechanic()) {
  metricsEngine.subscribe(new BleedMetricsObserver());
}
```

### Pros
✅ **Maximum decoupling** - engine just emits events, doesn't care who listens
✅ **Runtime flexibility** - can subscribe/unsubscribe dynamically
✅ **Standard pattern** - familiar to many developers

### Cons
❌ **Overkill for this use case** - more complex than needed
❌ **Event typing complexity** - union types for events
❌ **Harder to debug** - event flow is implicit

---

## Recommendation: Option 1 (Plugin/Callback System)

**Why?**
1. **Right level of abstraction** - not too simple, not too complex
2. **Testability** - easy to unit test each collector in isolation
3. **Extensibility** - adding new mechanics = adding new collector file
4. **Clean code** - `CombatMetricsEngine` has ZERO references to game mechanics
5. **Registration in CombatResolver** - centralized logic for what metrics to collect

**What you'll tell Kiro:**
> "I want CombatMetricsEngine to be completely generic. No references to bleed, rogue, sneak attack, etc. Instead, let's use a plugin system where we can register 'metric collectors' that listen to attack events. The CombatResolver will inspect the character/weapon and register the appropriate collectors. Check out `docs/examples/option1-plugin-system.ts` for the full example."

---

## Migration Path

### Current Code (BAD)
```typescript
// Inside CombatMetricsEngine
private isRogue: boolean = false;
private bleedDamage: number = 0;
// ... hardcoded game mechanics everywhere
```

### Option 1 Refactor (GOOD)
```typescript
// CombatMetricsEngine - clean and generic
export class CombatMetricsEngine {
  private collectors: MetricsCollector[] = [];

  registerCollector(collector: MetricsCollector) { ... }
  // NO references to specific mechanics!
}

// Separate files for each mechanic
// src/combat/collectors/bleed-metrics-collector.ts
// src/combat/collectors/rogue-metrics-collector.ts
```
