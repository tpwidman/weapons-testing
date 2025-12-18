# Combat Files Code Review - Current State

**Purpose**: These files are for **MEASUREMENT and REPORTING** of weapon damage for homebrew D&D content creation. They must be **PREDICTABLE, DETERMINISTIC, and ACCURATE**.

---

TPW: Mostly, I want types. I'm seeing a leaning on "any" that I really don't like here. We're doing math w/ this stuff and none of it outside the rolls can not be set in a type and known before the code runs. Say for classes or weapon features, include a types file with enum of those - then TS will be happy when they're included. I want typed everything if possible. This is a passion project outside work and I want as much typing as I can get because that makes me happy.

## Good News!
Most issues have been fixed:
- ✅ Random advantage calculation removed
- ✅ Registry pattern implemented
- ✅ Duplicate imports removed
- ✅ Duplicate methods removed
- ✅ Clean auto-registration via side-effect imports

---

## Remaining Issues

### 🔴 CRITICAL: Assumption in Crit Calculation

**File:** `combat-metrics-engine.ts:131-132`

```typescript
// Calculate critical bonus damage (damage beyond normal hit)
const normalDamage = result.baseDamage / 2; // Assuming critical doubles base damage
this.critBonusDamage += (result.baseDamage - normalDamage);
```

TPW: I agree - it's likely that we will need to double the base damage but I agree I don't like doing this here. It almost feels like we should expect our damage modifiers to do it. I'd love to see like a damage mod passed to the weapon that would double the damage dice for criticals. I don't agree w/ not all weapons double on crit but it's super sloppy code and we need to fix it.

**Problems:**
1. **Making assumptions** in a metrics/measurement engine
2. **Comment admits it's an assumption**: "Assuming critical doubles base damage"
3. **Unclear what baseDamage represents**:
   - If `baseDamage` is the CRIT damage (20), then normalDamage = 10, bonus = 10 ✓
   - If `baseDamage` is the NORMAL damage (10), then normalDamage = 5, bonus = 5 ✗
4. **Not all weapons double on crit** - some homebrew might have different multipliers

**Why this matters for measurements:**
- Reports need ACCURATE damage breakdowns
- Users comparing weapons need to know exact crit bonus contributions
- Homebrew weapons might have different crit mechanics

**Recommendation:**
Make `AttackResult` more explicit:
```typescript
interface AttackResult {
  baseDamage: number;      // Base damage rolled
  critExtraDamage: number; // Extra damage from crit (calculated by weapon)
  bonusDamage: number;     // Other bonuses
  totalDamage: number;     // Sum of all
  // ...
}
```

Then metrics engine just records what it's given - no assumptions!

---

### 🟡 MODERATE: Hardcoded Mechanic Check

**File:** `combat-metrics-engine.ts:178-192`

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
TPW: Yes, this is a big problem - I don't like this either. I will not see "bleed" in my combat metrics engine. It must be fixed. I realize there is special tracking for bleed - maybe there's an init that we can add for the feature to init bleed counter to 0 at start of combat --but only inside the bleed mechanic not in here.

**Problems:**
1. Hardcoded check for 'bleed' specifically
2. Comment says "Add other mechanics as needed" - implies this needs manual updates
3. Violates goal of being generic

**Note:** This method might not be used anymore since combat.ts does this generically at line 179-186.

**Recommendation:**
Either:
- A) Remove this method if it's not used
- B) Make it generic:
```typescript
detectWeaponMechanics(weapon: Weapon): void {
  if (!this.context) return;
  const definition = weapon.getDefinition();
  const mechanics = definition.specialMechanics?.map(m => m.type) || [];
  this.context.weaponMechanics = mechanics;
}
```

---

### 🟢 MINOR: Unused Method

**File:** `combat-metrics-engine.ts:149-152`

```typescript
recordDamage(_breakdown: any): void {
  // This method can be used for more detailed damage tracking if needed
  // Currently, damage is tracked through recordAttack
}
```

**Issue:** Method exists but does nothing. Underscore prefix suggests param is intentionally unused.

**Recommendation:** Remove if not needed, or implement if needed for future functionality.

---

### 🟢 MINOR: Misleading Comment

**File:** `combat.ts:125`

```typescript
hasAdvantage: false, // Will be determined by advantage rate in resolveAttack
```

**Issue:** Comment is outdated. Looking at `resolveAttack` (line 85-88), it just uses `context.hasAdvantage` directly - doesn't determine it from advantage rate.

**Current behavior:**
```typescript
const finalContext: AttackContext = {
  ...context,
  hasAdvantage: context.hasAdvantage  // Just passes through!
};
```

**Questions:**
1. What is `scenario.advantageRate` actually used for?
2. How does advantage get set on attacks?
3. Should there be logic to apply advantage based on the rate?

**Recommendation:** Either:
- Fix comment to match reality
- OR implement the advantage rate logic (deterministically!)

TPW: I like the idea that advantage is set deterministically per round. I would like to see like advantageRate:0.25
so like every 4 combat rounds expected to be w/ advantage w/ that rate. To get a exact .25 rate, we need to start looking at the total number of combat rounds. If there are 8 combat rounds, 2 of them *should* have advantage. If there are 10, then 3 of the combat rounds would have advantage. so we round *up* in this case, AND we should mark that in the summary of the execution. This advantage should be extremely clear. I don't even like the syntax of the current behavior w/ the spread context
---

### 🟢 MINOR: Scenario Comment Needs Clarity

**File:** `combat.ts:25`

```typescript
advantageRate: number; // 0.0 to 1.0 - probability of having advantage on attacks
```

**Issue:** "probability" implies randomness, but for measurement/reporting it should be deterministic.

**Recommendation:** Clarify the comment:
```typescript
advantageRate: number; // 0.0 to 1.0 - percentage of attacks with advantage (deterministic)
```

And then implement it deterministically in the combat logic.

---

## Questions to Clarify

### 1. What should `advantageRate` do?

Currently it's defined but not really used. Options:

**A) Deterministic Pattern (RECOMMENDED for measurement)**
```typescript
// If advantageRate = 0.5, every other attack has advantage
// If advantageRate = 0.33, every third attack has advantage
const shouldHaveAdvantage = (attackNumber % Math.round(1 / advantageRate)) === 0;
```

**B) It's just metadata**
```typescript
// advantageRate just goes into metrics for context
// Actual advantage is set externally per attack
// Just remove the misleading comment
```

**C) Remove it entirely**
```typescript
// If it's not being used, remove it from CombatScenario
```
TPW: Yes I addressed that above in the comment on line 145
### 2. How should crit damage be calculated?

Options:

**A) Weapon provides explicit crit bonus (RECOMMENDED)**
```typescript
// Weapon calculates and returns exact crit damage
result.critExtraDamage = 10; // Explicit value from weapon
```
TPW: Yes, the weapon should do this. But it should fit into a category of damageModifier. So, lets take the bleed mechanic Im working on. If hemorrhage occurs, bleed damage should be added to the round but importantly THAT DAMAGE IS NOT DOUBLED, and the damage for that should be calculated as part of the bleed mechanic feature. Bleed is like a status effect. The dagger could be a source of bleed build up but I may add more of them. Say you have an archer w/ bleed arrows and a rogue with bleed dagger -- both build bleed status, but either could proc it. It's different from like smite or sneak attack damage rolls which doubles the damage as a part of crit bc importantly, the damage from those sources is like a modifier to the hit NOT TO THE STATUS EFFECT PROC. Say we have a bleed buildup aura or something -- hemorrhage could proc on the targets turn in that case.

**B) Metrics engine calculates it**
```typescript
// Keep current approach but document the assumption clearly
// And validate it's correct for all weapon types
```

### 3. Should `detectWeaponMechanics` exist?

- It seems redundant with the generic mechanic detection in combat.ts:179-186
- Is there a reason to keep it?
TPW: correct - I don't actually mind leaving this but for a specific purpose - if multiple attackers are added to calculation as mentioned in line 202.
---

## Overall Assessment

**Much better than before!** The major architectural issues are fixed:
- ✅ No random advantage calculation
- ✅ Registry pattern implemented
- ✅ No duplicate code
- ✅ Clean organization

**Remaining work:**
1. Fix the assumption-based crit calculation (CRITICAL for accurate measurements)
2. Clarify/implement advantage rate behavior (or remove if not needed)
3. Clean up unused/redundant methods
4. Update misleading comments

**These files are now 90% of the way there!** Just need to nail down the crit calculation and advantage rate semantics.
