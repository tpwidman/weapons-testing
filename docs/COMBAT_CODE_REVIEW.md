# Combat Files Code Review - Critical Issues

**Purpose**: These files are for **MEASUREMENT and REPORTING** of weapon damage for homebrew D&D content creation. They must be **PREDICTABLE, DETERMINISTIC, and ACCURATE**.

---

## CRITICAL ISSUES - combat.ts

### 🔴 CRITICAL: Random Advantage Assignment (Lines 82-84)

```typescript
// Line 82-84
const randomValue = (this.dice.roll({ count: 1, type: 'd10', bonus: 0 }).total - 1) / 10;
const hasAdvantage = context.hasAdvantage || randomValue < this.getAdvantageRate(context);
```

**Problems:**
1. **Adds randomness to advantage** - This is for MEASUREMENT, not simulation!
2. **Inconsistent with scenario** - Scenario has `advantageRate` which should be deterministic
3. **Unpredictable results** - Same scenario can produce different metrics due to random advantage
4. **Confusing logic** - Why is advantage being randomly determined?

**What it should be:**
- If scenario says `advantageRate: 0.5`, then exactly 50% of attacks should have advantage (deterministic pattern)
- OR advantage should be explicit per attack, not randomly determined
- NO dice rolling to determine if you have advantage!

**Expected behavior:**
```typescript
// Option 1: Deterministic pattern based on attack number
const hasAdvantage = context.hasAdvantage ||
                     (this.attackCounter % (1 / this.getAdvantageRate(context)) === 0);

// Option 2: Use context advantage only (no rate calculation)
const hasAdvantage = context.hasAdvantage;
```

---

### 🟡 MAJOR: Duplicate Imports (Lines 11-13)

```typescript
import { RogueMetricsCollector } from './collectors/rogue-metrics-collector';
import { BleedMetricsCollector } from './collectors/bleed-metrics-collector';
import { BleedMetricsCollector, RogueMetricsCollector } from './collectors';
```

**Problem:** Same classes imported twice! Lines 11-12 and line 13.

**Fix:** Remove lines 11-12, keep only line 13 (or vice versa).

---

### 🟡 MAJOR: Duplicate Method (Lines 263-274 AND 574-588)

```typescript
// Method appears TWICE in the file!
private setupMetricsCollectors(character: Character, weapon: Weapon): void {
  // ... implementation ...
}
```

**Problem:** Same method defined twice with slightly different implementations.

**Fix:** Keep only ONE version (probably the second one at line 574-588).

---

### 🟠 MODERATE: Hardcoded Feature Checks (Lines 264-273, 579-587)

```typescript
// Combat resolver shouldn't know about specific classes/weapons!
if (character.getClassInfo().class === 'Rogue') {
  this.metricsEngine.registerCollector(new RogueMetricsCollector());
}
if (weaponDefinition.specialMechanics?.some(m => m.type === 'bleed')) {
  this.metricsEngine.registerCollector(new BleedMetricsCollector());
}
```

**Problem:** Violates open/closed principle. Adding new class requires modifying this file.

**Fix:** Use registry pattern (see REGISTRY_BASED_ARCHITECTURE.md).

---

### 🟠 MODERATE: Inconsistent Advantage Rate Logic (Line 248-250)

```typescript
private getAdvantageRate(context: AttackContext): number {
  return context.scenario?.advantageRate || 0;
}
```

**Problem:** This method just returns the rate, but line 84 uses it with random dice roll. Confusing purpose.

**Questions:**
- What is advantageRate supposed to mean?
- Is it "% of attacks with advantage" or something else?
- Should it be deterministic or random?

---

### 🟢 MINOR: Target Switching Creates New Engine Instance (Line 576)

```typescript
private setupMetricsCollectors(character: Character, weapon: Weapon): void {
  // Clear existing collectors by creating new engine
  this.metricsEngine = new CombatMetricsEngine();
  // ...
}
```

**Problem:** This discards any previous configuration/state. Seems wasteful.

**Suggestion:** Add `clearTrackers()` method to engine instead.

---

## CRITICAL ISSUES - combat-metrics-engine.ts

### 🔴 CRITICAL: Assumption-Based Calculation (Lines 131-132)

```typescript
// Calculate critical bonus damage (damage beyond normal hit)
const normalDamage = result.baseDamage / 2; // Assuming critical doubles base damage
this.critBonusDamage += (result.baseDamage - normalDamage);
```

**Problems:**
1. **ASSUMPTION** - "Assuming critical doubles base damage" - this is a METRICS ENGINE!
2. **Incorrect calculation** - If crit doubles damage, shouldn't normalDamage = baseDamage, and critBonus = baseDamage?
3. **Data should be explicit** - Don't calculate what you can measure directly

**What it should be:**
- AttackResult should include `critBonusDamage` explicitly from the weapon
- OR calculate it correctly: if crit doubles, bonus = baseDamage (not baseDamage / 2)
- NO assumptions in a measurement engine!

**Math check:**
- Normal hit: 10 damage (baseDamage = 10)
- Critical hit: 20 damage (baseDamage = 20, doubled from 10)
- Current code: normalDamage = 20/2 = 10, critBonus = 20-10 = 10 ✓ (works by accident!)
- BUT if baseDamage is already the non-crit amount: normalDamage = 10/2 = 5, critBonus = 10-5 = 5 ✗ (wrong!)

**Conclusion:** Logic is ambiguous and relies on unclear assumptions about what `baseDamage` means.

---

### 🟡 MAJOR: Hardcoded Mechanic Detection (Lines 178-192)

```typescript
detectWeaponMechanics(weapon: Weapon): void {
  // ...
  // Check for bleed mechanics
  if (definition.specialMechanics?.some(mechanic => mechanic.type === 'bleed')) {
    mechanics.push('bleed');
  }
  // Add other mechanics as needed
  // ...
}
```

**Problem:** Metrics engine shouldn't know about specific weapon mechanics like 'bleed'.

**Fix:**
- Either remove this method entirely
- OR make it generic: `mechanics = definition.specialMechanics.map(m => m.type)`

---

### 🟠 MODERATE: Unused Method (Lines 148-152)

```typescript
recordDamage(_breakdown: any): void {
  // This method can be used for more detailed damage tracking if needed
  // Currently, damage is tracked through recordAttack
}
```

**Problem:** Method exists but does nothing. Underscore prefix on param suggests it's intentionally unused.

**Fix:** Either implement it or remove it.

---

### 🟢 MINOR: Tracker Exposure (Lines 285-288)

```typescript
getTrackers(): IMetricsTracker[] {
  return [...this.trackers];
}
```

**Note:** Comment says "for testing" - consider if this should be in production code or test utilities.

---

## DESIGN CONCERNS

### Advantage Rate Implementation

**Current behavior is unclear:**
- Does `advantageRate: 0.5` mean:
  - A) Exactly 50% of attacks have advantage (deterministic)?
  - B) Each attack has 50% chance of advantage (random)?
  - C) Something else?

**For MEASUREMENT purposes, option A (deterministic) is correct.**

Example with `advantageRate: 0.5` and 10 attacks:
- **Deterministic:** Attacks 1,3,5,7,9 have advantage (every other attack)
- **Random:** Could be 3 attacks, could be 7 attacks, could be 5 attacks
- Random produces inconsistent metrics - BAD for weapon comparison!

---

### Critical Bonus Damage Calculation

**What does `baseDamage` represent?**
- The weapon's base damage die result?
- The total damage before crits are applied?
- The final damage after crit multiplication?

**Recommendation:** Make AttackResult more explicit:
```typescript
interface AttackResult {
  baseRoll: number;          // The weapon die roll (e.g., 1d8 = 6)
  normalDamage: number;      // What it would be without crit (e.g., 6 + 3 mod = 9)
  criticalMultiplier: number; // How much to multiply (e.g., 2x)
  critDamage: number;        // Extra damage from crit (e.g., 9 * 2 = 18, extra = 9)
  totalDamage: number;       // Final total
}
```

This removes all assumptions from metrics engine.

---

## RECOMMENDATIONS

### Immediate Fixes Required:

1. **REMOVE random advantage calculation** (combat.ts:82-84)
   - Make advantage deterministic based on `advantageRate`
   - Document what `advantageRate` means

2. **REMOVE assumption-based crit calculation** (combat-metrics-engine.ts:131-132)
   - Get explicit data from AttackResult
   - No calculations based on assumptions

3. **FIX duplicate imports** (combat.ts:11-13)

4. **FIX duplicate method** (combat.ts:263-274 & 574-588)

5. **REMOVE hardcoded mechanic checks** (both files)
   - Use registry pattern

### Design Improvements:

1. **Document the purpose** of these files at the top:
   - "For deterministic measurement and weapon comparison"
   - "NOT a simulation - results must be reproducible"

2. **Add configuration validation:**
   - Throw errors for invalid scenarios
   - Validate that inputs make sense

3. **Add reproducibility tests:**
   - Same inputs should always produce same outputs
   - Seed random number generator if dice are used for damage

---

## SUMMARY

**Critical Issues:** 2
- Random advantage determination
- Assumption-based crit calculation

**Major Issues:** 3
- Duplicate imports
- Duplicate method
- Hardcoded feature checks

**These files are for MEASUREMENT, not SIMULATION.**
**Randomness and assumptions are UNACCEPTABLE.**
