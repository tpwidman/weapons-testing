/**
 * Bleed Counter Mechanics Test Suite
 * Tests the hemorrhage/bleed counter system in detail
 */

import { CombatResolver } from '../combat/combat';
import { Character, CharacterBuilder } from '../characters/character';
import { WeaponBuilder, WeaponWithHemorrhage, hasHemorrhageFeature } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';
import { AttackContext } from '../core/types';

describe('Bleed Counter Mechanics', () => {
  let combatResolver: CombatResolver;
  let diceEngine: DiceEngine;
  let character: Character;
  let sanguineDagger: WeaponWithHemorrhage;

  beforeEach(() => {
    // Use fixed seed for reproducible tests
    diceEngine = new DiceEngine(12345);
    combatResolver = new CombatResolver(diceEngine);
    
    // Create Level 5 Rogue
    const characterTemplate = {
      name: "Level 5 Rogue",
      level: 5,
      class: "Rogue",
      subclass: "Thief",
      abilityScores: {
        strength: 10,
        dexterity: 17,
        constitution: 14,
        intelligence: 12,
        wisdom: 13,
        charisma: 14
      },
      proficiencyBonus: 3,
      classFeatures: [],
      attackModifiers: [
        {
          name: "Dexterity",
          hitBonus: 3,
          critRange: 20
        },
        {
          name: "Proficiency",
          hitBonus: 3,
          critRange: 20
        }
      ],
      damageModifiers: [
        {
          name: "Dexterity",
          damageBonus: 3,
          damageType: "piercing",
          trigger: "always" as const
        }
      ]
    };
    
    character = CharacterBuilder.fromTemplate(characterTemplate);
    
    // Load Sanguine Dagger from file
    const weapon = WeaponBuilder.loadFromFile('src/weapons/data/sanguine-dagger/sanguine-dagger.json', diceEngine);
    if (hasHemorrhageFeature(weapon)) {
      sanguineDagger = weapon;
    } else {
      throw new Error('Sanguine Dagger should have hemorrhage feature');
    }
  });

  test('should build bleed counter on normal hits', () => {
    console.log('\n=== BLEED COUNTER - NORMAL HITS ===');
    
    const initialCounter = sanguineDagger.getHemorrhageCounter();
    console.log(`Initial counter: ${initialCounter}`);
    
    // Perform several attacks without advantage
    for (let i = 1; i <= 5; i++) {
      const context: AttackContext = {
        attacker: character,
        weapon: sanguineDagger,
        hasAdvantage: false,
        targetAC: 5, // Low AC to ensure hits
        targetSize: 'medium',
        round: 1,
        turn: i
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const bleedCounterEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Counter');
        const hemorrhageEffect = result.specialEffects?.find(effect => effect.name === 'Hemorrhage');
        const currentCounter = sanguineDagger.getHemorrhageCounter();
        
        console.log(`Attack ${i}: Hit=${result.hit}, Counter+=${bleedCounterEffect?.damage || 0}, Total=${currentCounter}, Hemorrhage=${!!hemorrhageEffect}`);
        
        // Verify bleed counter was added
        expect(bleedCounterEffect).toBeDefined();
        expect(bleedCounterEffect?.damage).toBeGreaterThan(0);
        expect(bleedCounterEffect?.damage).toBeLessThanOrEqual(4); // 1d4 max
        
        // If hemorrhage triggered, counter should reset to 0
        if (hemorrhageEffect) {
          expect(currentCounter).toBe(0);
          console.log(`  -> Hemorrhage triggered! ${hemorrhageEffect.damage} damage, counter reset`);
          break;
        }
      } else {
        console.log(`Attack ${i}: MISS`);
      }
    }
  });

  test('should build higher bleed counter with advantage', () => {
    console.log('\n=== BLEED COUNTER - WITH ADVANTAGE ===');
    
    const initialCounter = sanguineDagger.getHemorrhageCounter();
    console.log(`Initial counter: ${initialCounter}`);
    
    // Perform several attacks with advantage
    for (let i = 1; i <= 5; i++) {
      const context: AttackContext = {
        attacker: character,
        weapon: sanguineDagger,
        hasAdvantage: true, // Advantage gives 1d8 instead of 1d4
        targetAC: 5, // Low AC to ensure hits
        targetSize: 'medium',
        round: 1,
        turn: i
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const bleedCounterEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Counter');
        const hemorrhageEffect = result.specialEffects?.find(effect => effect.name === 'Hemorrhage');
        const currentCounter = sanguineDagger.getHemorrhageCounter();
        
        console.log(`Attack ${i}: Hit=${result.hit}, Counter+=${bleedCounterEffect?.damage || 0}, Total=${currentCounter}, Hemorrhage=${!!hemorrhageEffect}`);
        
        // Verify bleed counter was added
        expect(bleedCounterEffect).toBeDefined();
        expect(bleedCounterEffect?.damage).toBeGreaterThan(0);
        expect(bleedCounterEffect?.damage).toBeLessThanOrEqual(16); // 1d8 max, 2d8 on crit
        
        // If hemorrhage triggered, counter should reset to 0
        if (hemorrhageEffect) {
          expect(currentCounter).toBe(0);
          console.log(`  -> Hemorrhage triggered! ${hemorrhageEffect.damage} damage, counter reset`);
          break;
        }
      } else {
        console.log(`Attack ${i}: MISS`);
      }
    }
  });

  test('should trigger hemorrhage at threshold for medium creatures', () => {
    console.log('\n=== HEMORRHAGE THRESHOLD - MEDIUM CREATURE ===');
    
    // Medium creatures have threshold of 12
    const threshold = 12;
    console.log(`Medium creature hemorrhage threshold: ${threshold}`);
    
    let attackCount = 0;
    let hemorrhageTriggered = false;
    
    // Keep attacking until hemorrhage triggers
    while (!hemorrhageTriggered && attackCount < 20) {
      attackCount++;
      
      const context: AttackContext = {
        attacker: character,
        weapon: sanguineDagger,
        hasAdvantage: true, // Use advantage for faster counter buildup
        targetAC: 5,
        targetSize: 'medium',
        round: 1,
        turn: attackCount
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const bleedCounterEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Counter');
        const hemorrhageEffect = result.specialEffects?.find(effect => effect.name === 'Hemorrhage');
        const counterBeforeAttack = sanguineDagger.getHemorrhageCounter() - (bleedCounterEffect?.damage || 0);
        const counterAfterAttack = sanguineDagger.getHemorrhageCounter();
        
        console.log(`Attack ${attackCount}: Counter ${counterBeforeAttack} -> ${counterAfterAttack} (+${bleedCounterEffect?.damage || 0})`);
        
        if (hemorrhageEffect) {
          hemorrhageTriggered = true;
          console.log(`  -> HEMORRHAGE! ${hemorrhageEffect.damage} damage, counter reset to ${sanguineDagger.getHemorrhageCounter()}`);
          
          // Verify hemorrhage damage is 6d6
          expect(hemorrhageEffect.damage).toBeGreaterThanOrEqual(6); // Min 6d6
          expect(hemorrhageEffect.damage).toBeLessThanOrEqual(36); // Max 6d6
          
          // Verify counter was reset
          expect(sanguineDagger.getHemorrhageCounter()).toBe(0);
        }
      }
    }
    
    expect(hemorrhageTriggered).toBe(true);
    expect(attackCount).toBeLessThan(20); // Should trigger within reasonable attempts
  });

  test('should have different thresholds for different creature sizes', () => {
    console.log('\n=== CREATURE SIZE THRESHOLDS ===');
    
    const creatureSizes = [
      { size: 'tiny', threshold: 12 },
      { size: 'small', threshold: 12 },
      { size: 'medium', threshold: 12 },
      { size: 'large', threshold: 16 },
      { size: 'huge', threshold: 20 },
      { size: 'gargantuan', threshold: 24 }
    ];
    
    creatureSizes.forEach(({ size, threshold }) => {
      // Reset counter for each test
      sanguineDagger.resetCounter();
      
      console.log(`\n${size.toUpperCase()} (threshold ${threshold}):`);
      
      let attackCount = 0;
      let hemorrhageTriggered = false;
      
      // Keep attacking until hemorrhage triggers or we hit max attempts
      while (!hemorrhageTriggered && attackCount < 15) {
        attackCount++;
        
        const context: AttackContext = {
          attacker: character,
          weapon: sanguineDagger,
          hasAdvantage: true,
          targetAC: 5,
          targetSize: size,
          round: 1,
          turn: attackCount
        };

        const result = combatResolver.resolveAttack(context);
        
        if (result.hit) {
          const hemorrhageEffect = result.specialEffects?.find(effect => effect.name === 'Hemorrhage');
          const bleedCounterEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Counter');
          const counterBeforeAttack = sanguineDagger.getHemorrhageCounter() - (bleedCounterEffect?.damage || 0);
          
          console.log(`  Attack ${attackCount}: Counter ${counterBeforeAttack} -> ${sanguineDagger.getHemorrhageCounter()} (+${bleedCounterEffect?.damage || 0})`);
          
          if (hemorrhageEffect) {
            hemorrhageTriggered = true;
            console.log(`    -> HEMORRHAGE! ${hemorrhageEffect.damage} damage after ${attackCount} attacks`);
            
            // Verify hemorrhage damage is 6d6
            expect(hemorrhageEffect.damage).toBeGreaterThanOrEqual(6);
            expect(hemorrhageEffect.damage).toBeLessThanOrEqual(36);
            
            // Verify counter was reset
            expect(sanguineDagger.getHemorrhageCounter()).toBe(0);
            break;
          }
        }
      }
      
      // Should have triggered hemorrhage within reasonable attempts
      expect(hemorrhageTriggered).toBe(true);
      expect(attackCount).toBeLessThan(15);
    });
  });

  test('should not build bleed counter on immune targets', () => {
    console.log('\n=== BLEED IMMUNITY ===');
    
    const immuneTargets = [
      'medium construct',
      'large undead',
      'huge elemental'
    ];
    
    immuneTargets.forEach(targetType => {
      console.log(`\nTesting ${targetType}:`);
      
      const context: AttackContext = {
        attacker: character,
        weapon: sanguineDagger,
        hasAdvantage: true,
        targetAC: 5,
        targetSize: targetType,
        round: 1,
        turn: 1
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const bleedCounterEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Counter');
        const immunityEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Immunity');
        
        console.log(`  Hit: ${result.hit}, Bleed Counter: ${!!bleedCounterEffect}, Immunity: ${!!immunityEffect}`);
        
        // Should not build bleed counter
        expect(bleedCounterEffect).toBeUndefined();
        
        // Should show immunity effect
        expect(immunityEffect).toBeDefined();
        
        // Counter should remain at 0
        expect(sanguineDagger.getHemorrhageCounter()).toBe(0);
      }
    });
  });

  test('should reset counter when switching targets', () => {
    console.log('\n=== TARGET SWITCHING ===');
    
    // Build up counter on first target
    const context1: AttackContext = {
      attacker: character,
      weapon: sanguineDagger,
      hasAdvantage: true,
      targetAC: 5,
      targetSize: 'medium',
      round: 1,
      turn: 1
    };

    const result1 = combatResolver.resolveAttack(context1);
    
    if (result1.hit) {
      const counterAfterFirstAttack = sanguineDagger.getHemorrhageCounter();
      console.log(`First attack: Counter = ${counterAfterFirstAttack}`);
      expect(counterAfterFirstAttack).toBeGreaterThan(0);
      
      // Manually switch target (simulating target switching mechanic)
      sanguineDagger.switchTarget();
      const counterAfterSwitch = sanguineDagger.getHemorrhageCounter();
      console.log(`After target switch: Counter = ${counterAfterSwitch}`);
      expect(counterAfterSwitch).toBe(0);
      
      // Attack new target should start fresh
      const context2: AttackContext = {
        attacker: character,
        weapon: sanguineDagger,
        hasAdvantage: true,
        targetAC: 5,
        targetSize: 'large', // Different size to simulate different target
        round: 1,
        turn: 2
      };

      const result2 = combatResolver.resolveAttack(context2);
      
      if (result2.hit) {
        const bleedCounterEffect = result2.specialEffects?.find(effect => effect.name === 'Bleed Counter');
        const finalCounter = sanguineDagger.getHemorrhageCounter();
        
        console.log(`New target attack: Counter +${bleedCounterEffect?.damage}, Total = ${finalCounter}`);
        expect(finalCounter).toBe(bleedCounterEffect?.damage || 0);
      }
    }
  });

  test('should double bleed counter on critical hits', () => {
    console.log('\n=== CRITICAL HIT BLEED COUNTER ===');
    
    // Test multiple times to find critical hits
    let normalHits: number[] = [];
    let criticalHits: number[] = [];
    let attempts = 0;
    const maxAttempts = 100;
    
    while ((normalHits.length < 5 || criticalHits.length < 2) && attempts < maxAttempts) {
      attempts++;
      
      // Reset counter for each test
      sanguineDagger.resetCounter();
      
      const context: AttackContext = {
        attacker: character,
        weapon: sanguineDagger,
        hasAdvantage: true,
        targetAC: 5,
        targetSize: 'medium',
        round: 1,
        turn: 1
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const bleedCounterEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Counter');
        
        if (bleedCounterEffect) {
          if (result.critical) {
            criticalHits.push(bleedCounterEffect.damage);
          } else {
            normalHits.push(bleedCounterEffect.damage);
          }
        }
      }
    }
    
    console.log(`Found ${normalHits.length} normal hits and ${criticalHits.length} critical hits in ${attempts} attempts`);
    
    if (normalHits.length > 0) {
      const avgNormal = normalHits.reduce((sum, val) => sum + val, 0) / normalHits.length;
      console.log(`Normal hits bleed counter average: ${avgNormal.toFixed(1)} (expected ~4.5 for 1d8)`);
      console.log(`Normal hits range: ${Math.min(...normalHits)} - ${Math.max(...normalHits)}`);
      
      // Normal hits should be 1d8 (1-8)
      normalHits.forEach(counter => {
        expect(counter).toBeGreaterThanOrEqual(1);
        expect(counter).toBeLessThanOrEqual(8);
      });
    }
    
    if (criticalHits.length > 0) {
      const avgCritical = criticalHits.reduce((sum, val) => sum + val, 0) / criticalHits.length;
      console.log(`Critical hits bleed counter average: ${avgCritical.toFixed(1)} (expected ~9 for 2d8)`);
      console.log(`Critical hits range: ${Math.min(...criticalHits)} - ${Math.max(...criticalHits)}`);
      
      // Critical hits should be 2d8 (2-16)
      criticalHits.forEach(counter => {
        expect(counter).toBeGreaterThanOrEqual(2);
        expect(counter).toBeLessThanOrEqual(16);
      });
      
      // Critical hits should have higher average than normal hits
      if (normalHits.length > 0) {
        const avgNormal = normalHits.reduce((sum, val) => sum + val, 0) / normalHits.length;
        expect(avgCritical).toBeGreaterThan(avgNormal);
        
        const ratio = avgCritical / avgNormal;
        console.log(`Critical/Normal bleed counter ratio: ${ratio.toFixed(2)} (expected ~2.0)`);
        expect(ratio).toBeGreaterThan(1.5);
        expect(ratio).toBeLessThan(2.5);
      }
    }
  });

  test('should show detailed bleed counter progression without advantage', () => {
    console.log('\n=== BLEED COUNTER PROGRESSION (NO ADVANTAGE) ===');
    
    const threshold = 12; // Medium creature threshold
    let dieRolls: number[] = [];
    let attackCount = 0;
    let hemorrhageTriggered = false;
    
    // Reset counter
    sanguineDagger.resetCounter();
    
    while (!hemorrhageTriggered && attackCount < 20) {
      attackCount++;
      
      const context: AttackContext = {
        attacker: character,
        weapon: sanguineDagger,
        hasAdvantage: false, // No advantage = 1d4
        targetAC: 5, // Low AC to ensure hits
        targetSize: 'medium',
        round: 1,
        turn: attackCount
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const bleedCounterEffect = result.specialEffects?.find(effect => effect.name === 'Bleed Counter');
        const hemorrhageEffect = result.specialEffects?.find(effect => effect.name === 'Hemorrhage');
        
        if (bleedCounterEffect) {
          dieRolls.push(bleedCounterEffect.damage);
          
          // Show progression
          const currentTotal = dieRolls.reduce((sum, roll) => sum + roll, 0);
          const rollsDisplay = dieRolls.join(' + ');
          console.log(`${rollsDisplay} / ${threshold}`);
          
          if (hemorrhageEffect) {
            hemorrhageTriggered = true;
            console.log(`BLEED: ${currentTotal}/${threshold}`);
            
            // Verify the math
            expect(currentTotal).toBeGreaterThanOrEqual(threshold);
            
            // With baseBleedDamageDieCount: 6 + proficiencyBonus: 3 = 9d6 damage (9-54)
            expect(hemorrhageEffect.damage).toBeGreaterThanOrEqual(9); // 9d6 min
            expect(hemorrhageEffect.damage).toBeLessThanOrEqual(54); // 9d6 max
            break;
          }
        }
      } else {
        console.log(`MISS`);
      }
    }
    
    expect(hemorrhageTriggered).toBe(true);
    expect(attackCount).toBeLessThan(20);
    
    // Verify all die rolls are within expected range
    // Normal hits: 1d4 (1-4), Critical hits: 2d4 (2-8)
    dieRolls.forEach(roll => {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(8); // Allow for critical hits
    });
  });

  test('should use configurable baseBleedDamageDieCount for hemorrhage damage', () => {
    console.log('\n=== CONFIGURABLE BLEED DAMAGE ===');
    
    // Create a test weapon with different bleed damage die counts
    const testWeaponDef = {
      name: "Test Sanguine Dagger",
      rarity: "rare" as const,
      baseDamage: "1d4",
      damageType: "piercing",
      properties: ["finesse", "light", "thrown"],
      magicalBonus: 1,
      baseBleedDamageDieCount: 3, // 3d6 instead of 6d6
      specialMechanics: [
        {
          name: "Hemorrhage",
          type: "bleed" as const,
          parameters: {
            counterDice: {
              normal: "1d4",
              advantage: "1d8",
              critical: true
            },
            thresholds: {
              tiny: 12,
              small: 12,
              medium: 12,
              large: 16,
              huge: 20,
              gargantuan: 24
            },
            hemorrhageDamage: "6d6" // This should be overridden by baseBleedDamageDieCount
          }
        }
      ]
    };
    
    const testDagger = WeaponBuilder.fromDefinition(testWeaponDef, diceEngine);
    
    // Build counter by performing attacks until we get close to threshold
    testDagger.resetCounter();
    let attempts = 0;
    while (testDagger.getHemorrhageCounter() < 8 && attempts < 10) {
      const context: AttackContext = {
        attacker: character,
        weapon: testDagger,
        hasAdvantage: true,
        targetAC: 5,
        targetSize: 'medium',
        round: 1,
        turn: attempts + 1
      };

      const result = combatResolver.resolveAttack(context);
      if (!result.hit || result.specialEffects?.find(effect => effect.name === 'Hemorrhage')) {
        break; // Stop if we miss or trigger hemorrhage early
      }
      attempts++;
    }
    
    console.log(`Counter built to ${testDagger.getHemorrhageCounter()} after ${attempts} attempts`);
    
    // Now perform an attack that should trigger hemorrhage
    const context: AttackContext = {
      attacker: character,
      weapon: testDagger,
      hasAdvantage: true,
      targetAC: 5,
      targetSize: 'medium',
      round: 1,
      turn: attempts + 1
    };

    const result = combatResolver.resolveAttack(context);
    
    if (result.hit) {
      const hemorrhageEffect = result.specialEffects?.find(effect => effect.name === 'Hemorrhage');
      
      if (hemorrhageEffect) {
        console.log(`Hemorrhage damage with baseBleedDamageDieCount=3: ${hemorrhageEffect.damage}`);
        
        // Should be 3d6 (3-18) since baseBleedDamageDieCount=3
        expect(hemorrhageEffect.damage).toBeGreaterThanOrEqual(3); // 3d6 min
        expect(hemorrhageEffect.damage).toBeLessThanOrEqual(18); // 3d6 max
        
        console.log(`✓ Configurable bleed damage working: ${hemorrhageEffect.damage} damage from 3d6`);
      } else {
        console.log('No hemorrhage triggered - counter may not have reached threshold');
        console.log(`Final counter: ${testDagger.getHemorrhageCounter()}`);
      }
    } else {
      console.log('Attack missed');
    }
  });

  test('should track hemorrhage frequency in combat simulation', () => {
    console.log('\n=== HEMORRHAGE FREQUENCY IN COMBAT ===');
    
    const scenario = {
      rounds: 10,
      targetAC: 15,
      targetSize: 'medium',
      advantageRate: 1.0, // Always advantage
      attacksPerRound: 1
    };

    const result = combatResolver.simulateCombat(character, sanguineDagger, scenario);
    
    console.log(`Combat Results:`);
    console.log(`  Total Attacks: ${result.rounds.length * scenario.attacksPerRound}`);
    console.log(`  Total Hits: ${Math.round(result.hitRate * result.rounds.length * scenario.attacksPerRound)}`);
    console.log(`  Hemorrhage Triggers: ${result.hemorrhageTriggers}`);
    console.log(`  Hit Rate: ${(result.hitRate * 100).toFixed(1)}%`);
    console.log(`  Hemorrhage Rate: ${result.hemorrhageTriggers > 0 ? (result.hemorrhageTriggers / (result.hitRate * result.rounds.length * scenario.attacksPerRound) * 100).toFixed(1) : 0}%`);
    console.log(`  Average Damage: ${result.averageDamagePerRound.toFixed(1)} per round`);
    
    // Verify hemorrhage triggered at least once in 10 rounds with advantage
    expect(result.hemorrhageTriggers).toBeGreaterThan(0);
    
    // Check individual rounds for hemorrhage effects
    let roundsWithHemorrhage = 0;
    result.rounds.forEach((round, index) => {
      if (round.hemorrhageTriggered) {
        roundsWithHemorrhage++;
        console.log(`  Round ${index + 1}: Hemorrhage triggered, ${round.totalDamage} total damage`);
      }
    });
    
    expect(roundsWithHemorrhage).toBe(result.hemorrhageTriggers);
  });
});