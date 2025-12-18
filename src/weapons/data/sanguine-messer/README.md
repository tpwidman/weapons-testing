# Sanguine Messer Damage Simulator - README

## Overview
A Jest-based damage simulation suite for testing the **Sanguine Messer** D&D weapon mechanics across different character builds and scenarios.

## Purpose
Run thousands of combat simulations to analyze:
- Average damage per round (DPR)
- Hemorrhage trigger rates
- Damage variance/consistency
- Build comparisons (Rogue vs Barbarian vs Paladin)
- Critical hit synergy
- Advantage vs normal attack patterns

## What to Build

### Core Simulation Engine
```typescript
// dice.ts - Dice rolling utilities
- d4(), d6(), d8(), d10(), d12(), d20()
- rollWithAdvantage(die)
- rollWithDisadvantage(die)
- criticalRoll(die) // doubles dice

// weapon.ts - Weapon damage calculator
- calculateBaseDamage(weapon, stats)
- buildHemorrhageCounter(hasAdvantage, isCrit)
- checkHemorrhageThreshold(counter, creatureSize)
- calculateHemorrhageDamage(profBonus)
- resetCounter()

// combat.ts - Combat simulator
- simulateSingleAttack(character, hasAdvantage)
- simulateCombatRound(character, hasAdvantage)
- simulateFullCombat(character, rounds, advantageRate)
```

### Character Builds to Test

**1. Rogue (Swashbuckler)**
- Level: 5, 9, 13
- DEX modifier: +3, +4, +5
- Sneak Attack dice: 3d6, 5d6, 7d6
- Advantage rate: 90% (Cunning Action)
- Attack per round: 1

**2. Barbarian (Berserker)**
- Level: 5, 9, 13
- STR modifier: +3, +4, +5
- Rage damage: +2, +3, +4
- Advantage rate: 100% (Reckless Attack)
- Attacks per round: 2

**3. Paladin (Vengeance)**
- Level: 5, 9, 13
- STR modifier: +3, +4, +5
- Smite on Hemorrhage turn: 2nd, 3rd, 4th level
- Advantage rate: 50% (Vow of Enmity up half the time)
- Attacks per round: 1-2

**4. Fighter (Champion)**
- Level: 5, 9, 13
- STR modifier: +3, +4, +5
- Crit range: 19-20
- Advantage rate: 30% (situational)
- Attacks per round: 2, 3, 4

**5. Baseline Comparison**
- Same levels with +1, +2, +3 weapons
- No special features, just straight damage

### Test Scenarios

```typescript
describe('Sanguine Messer Simulations', () => {
  
  describe('Single Attack Mechanics', () => {
    test('normal hit builds 1d4 counter')
    test('advantage hit builds 1d8 counter')
    test('critical hit doubles counter dice')
    test('critical with advantage builds 2d8 counter')
  });

  describe('Hemorrhage Triggers', () => {
    test('trigger rate over 1000 combats - Rogue with advantage')
    test('average turns to trigger - Barbarian with Reckless')
    test('miss streak resets counter properly')
    test('switching targets resets counter')
  });

  describe('Level 5 Rogue - 10,000 simulations', () => {
    test('4-round combat average damage')
    test('damage distribution (min/max/percentiles)')
    test('Hemorrhage trigger percentage')
    test('comparison to +1 Rapier baseline')
  });

  describe('Level 9 Barbarian - 10,000 simulations', () => {
    test('4-round combat average damage')
    test('comparison to +1 Greataxe baseline')
    test('with vs without shield (AC trade-off)')
  });

  describe('Level 13 Paladin - 10,000 simulations', () => {
    test('burst damage on Hemorrhage + Smite turn')
    test('optimal smite timing (wait for Hemorrhage?)')
    test('critical hit with both features')
  });

  describe('Critical Hit Analysis', () => {
    test('Champion Fighter crit fishing (19-20 range)')
    test('Paladin smite crit + Hemorrhage')
    test('Rogue sneak attack crit + Hemorrhage')
  });

  describe('Edge Cases', () => {
    test('fighting bloodless creatures (constructs)')
    test('multiple misses in a row')
    test('Hemorrhage on killing blow (wasted damage)')
    test('Reaver\'s Feast temp HP accumulation')
  });

  describe('Build Comparisons', () => {
    test('Rogue vs Barbarian vs Paladin at level 9')
    test('with advantage vs without advantage')
    test('vs published magic weapons (Flame Tongue, Frost Brand)')
  });

  describe('Variance Analysis', () => {
    test('damage consistency (standard deviation)')
    test('best-case vs worst-case scenarios')
    test('reliability compared to +2 weapon')
  });
});
```

### Output Format

Each test should output:
```typescript
{
  characterBuild: "Level 9 Rogue (Swashbuckler)",
  simulations: 10000,
  combatRounds: 4,
  advantageRate: 0.9,
  
  results: {
    totalDamage: {
      min: 52,
      max: 176,
      average: 125.5,
      median: 119,
      percentile25: 98,
      percentile75: 138,
      standardDeviation: 28.4
    },
    
    damagePerRound: {
      average: 31.4,
      byRound: [27.2, 27.1, 44.3, 26.8]
    },
    
    hemorrhageTriggers: {
      total: 9847,  // out of 10000 combats
      averageTurn: 2.8,
      turnDistribution: {
        turn1: 156,
        turn2: 1847,
        turn3: 6744,
        turn4: 1100,
        never: 153
      }
    },
    
    criticalHits: {
      total: 780,  // 9.75% with advantage
      withHemorrhage: 234,
      averageDamage: 72.5
    },
    
    reaversFeast: {
      totalTempHP: 87235,
      averagePerCombat: 8.7
    }
  },
  
  comparison: {
    baseline: "+2 Rapier",
    baselineDPR: 28.0,
    percentageIncrease: 12.1,
    verdict: "Significantly stronger"
  }
}
```

### Visualization Helpers

```typescript
// Optional: Create histograms/graphs of data
function createDamageDistribution(results)
function createTriggerTimeline(results)
function createBuildComparison(results[])
```

## File Structure
```
/sanguine-messer-sim
  /src
    dice.ts           # Dice rolling utilities
    weapon.ts         # Weapon mechanics
    combat.ts         # Combat simulation
    characters.ts     # Character build definitions
    types.ts          # TypeScript interfaces
  /tests
    weapon.test.ts    # Unit tests for weapon mechanics
    combat.test.ts    # Combat simulation tests
    builds.test.ts    # Character build comparisons
    analysis.test.ts  # Statistical analysis tests
  package.json
  tsconfig.json
  jest.config.js
  README.md
```

## Run Instructions
```bash
npm install
npm test                    # Run all simulations
npm test -- weapon          # Run just weapon mechanics
npm test -- builds          # Run build comparisons
npm test -- --verbose       # See detailed output
```

## Key Metrics to Track

1. **DPR (Damage Per Round)** - Primary balance metric
2. **Trigger Rate** - How often Hemorrhage activates
3. **Variance** - How consistent is damage output
4. **Build Comparison** - Which classes benefit most
5. **Advantage Impact** - How much does advantage matter
6. **Crit Synergy** - Does crit fishing pay off

## Expected Insights

After running simulations, you should be able to answer:
- Is the weapon properly balanced for Very Rare tier?
- Which character build is optimal?
- How does advantage rate affect overall power?
- Is the variance too high (too swingy)?
- Does it outperform published magic weapons?
- Should threshold/damage/counter dice be adjusted?

## Notes for Claude Code

- Use TypeScript for type safety
- Seed random for reproducible tests
- Run 10,000+ simulations per test for statistical significance
- Include comparison baselines (+1/+2/+3 weapons)
- Output should be readable in test results
- Consider adding CSV export for graphing elsewhere
- Mock dice rolls for unit tests, use real random for simulations

---

Ready for Claude Code to implement! The goal is comprehensive damage analysis across all realistic combat scenarios.