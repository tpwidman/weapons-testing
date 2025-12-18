# Type Safety Improvements - Summary

## Completed Changes

### ✅ 1. Created Distributed Type System

**New Type Files:**
- `src/characters/classes/types.ts` - Character class enums and features
- `src/weapons/mechanics/types.ts` - Weapon mechanic enums
- `src/weapons/mechanics/bleed/types.ts` - Bleed-specific types (example implementation)
- `src/combat/types.ts` - Core combat types (damage, advantage, metrics)

**Key Types Created:**
- `CharacterClass` enum - All D&D classes
- `WeaponMechanic` enum - Weapon mechanics (bleed, poison, etc.)
- `DamageType` enum - All damage types
- `DamageModifierCategory` enum - **HIT_MODIFIER** vs **STATUS_EFFECT**
  - HIT_MODIFIER: Doubled on crit (Sneak Attack, Smite)
  - STATUS_EFFECT: NOT doubled on crit (Bleed/Hemorrhage, Poison)
- `DamageModifier` interface - Fully typed damage modifier
- `AdvantageStrategy` interface - Deterministic advantage distribution

### ✅ 2. Implemented Deterministic Advantage Calculator

**File:** `src/combat/advantage-calculator.ts`

**Features:**
- Calculates which specific rounds get advantage based on rate
- **Rounds UP** (10 rounds × 0.25 = 3 rounds with advantage)
- Distributes advantage evenly across combat
- Fully deterministic - same inputs = same outputs
- Human-readable strategy descriptions

**Example:**
```typescript
const strategy = AdvantageCalculator.calculateAdvantageStrategy(10, 0.25);
// Result: { advantageRounds: [3, 6, 9], advantageCount: 3 }
```

### ✅ 3. Fixed combat-metrics-engine.ts

**Changes:**
1. ❌ Removed ALL 'any' types
   - `data?: any` → `data?: SpecialEventData` (union type)
   - `Record<string, any>` → `TrackerMetrics` interface
   - `(rawMetrics as any)` → Proper typing

2. ❌ Removed hardcoded 'bleed' check
   ```typescript
   // Before (BAD):
   if (definition.specialMechanics?.some(mechanic => mechanic.type === 'bleed')) {
     mechanics.push('bleed');
   }

   // After (GOOD):
   const mechanics = definition.specialMechanics?.map(m => m.type) || [];
   ```

3. ❌ Removed unused `recordDamage()` method

4. ✅ Fixed crit damage calculation
   ```typescript
   // Before (BAD - making assumptions):
   const normalDamage = result.baseDamage / 2; // Assuming critical doubles base damage
   this.critBonusDamage += (result.baseDamage - normalDamage);

   // After (GOOD - uses explicit data):
   if (result.critDamage !== undefined) {
     this.critBonusDamage += result.critDamage;
   }
   ```

### ✅ 4. Updated AttackResult Type

**File:** `src/core/types.ts`

**Added Fields:**
```typescript
export interface AttackResult {
  // ... existing fields ...
  critDamage?: number;  // NEW: Explicit crit damage from weapon
  round?: number;       // NEW: Combat round for tracking
}
```

### ✅ 5. Created Bleed Example Implementation

**File:** `src/weapons/mechanics/bleed/types.ts`

**Demonstrates:**
- Bleed as both weapon mechanic AND status effect
- `BleedState` interface for tracking buildup
- `createBleedCounterModifier()` - Adds counter on hit (HIT_MODIFIER, not doubled)
- `createHemorrhageModifier()` - Status damage (STATUS_EFFECT, never doubled)
- Multiple sources can build bleed (dagger + arrows)

---

## Remaining Work

### 🔄 In Progress: combat.ts

**Still needs:**
1. Remove remaining 'any' types
2. Integrate AdvantageCalculator
3. Update advantage logic to be deterministic
4. Add advantage strategy to CombatResult metrics

### 📋 Next Steps:

1. **Update combat.ts**
   - Find and replace all 'any' types
   - Integrate advantage calculator
   - Add strategy description to metrics

2. **Update weapon implementations**
   - Weapons must provide explicit `critDamage` in AttackResult
   - No more assumptions about crit multiplication

3. **Update metrics trackers**
   - Change `onCombatEnd()` return type from `Record<string, any>` to `TrackerMetrics`

4. **Add advantage strategy to reports**
   - Include strategy description in combat results
   - Show exactly which rounds had advantage

---

## Key Principles Established

1. **NO 'any' TYPES** - Everything is strongly typed
2. **NO ASSUMPTIONS** - Metrics measure what's given, don't calculate
3. **NO HARDCODED MECHANICS** - Generic, extensible architecture
4. **DETERMINISTIC** - Same inputs always produce same outputs
5. **DISTRIBUTED TYPES** - Types live with their domains

---

## Benefits

✅ **Type Safety** - Catches errors at compile time
✅ **Self-Documenting** - Types show exactly what data flows where
✅ **Maintainable** - Easy to add new classes/mechanics without modifying core files
✅ **Predictable** - Deterministic advantage for accurate weapon comparisons
✅ **Correct** - No more assumptions about crit damage or mechanic behavior
