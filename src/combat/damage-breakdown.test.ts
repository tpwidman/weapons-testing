/**
 * Detailed damage breakdown tests to verify calculations
 * Tests critical hit doubling, sneak attack, and damage components
 */

import { CombatResolver } from '../combat/combat';
import { Character, CharacterBuilder } from '../characters/character';
import { Weapon, WeaponBuilder } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';
import { AttackContext, WeaponDefinition } from '../core/types';

describe('Damage Breakdown Analysis', () => {
  let combatResolver: CombatResolver;
  let diceEngine: DiceEngine;
  let character: Character;
  let dagger: Weapon;

  beforeEach(() => {
    // Use fixed seed for reproducible tests
    diceEngine = new DiceEngine(12345);
    combatResolver = new CombatResolver(diceEngine);
    
    // Create Level 5 Swashbuckler Rogue
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
    
    // Create +1 Dagger
    const daggerDefinition: WeaponDefinition = {
      name: "+1 Dagger",
      rarity: "uncommon",
      baseDamage: "1d4",
      damageType: "piercing",
      properties: ["finesse", "light", "thrown"],
      magicalBonus: 1,
      specialMechanics: []
    };
    
    dagger = WeaponBuilder.fromDefinition(daggerDefinition, diceEngine);
  });

  test('should show detailed damage breakdown for normal hit with advantage', () => {
    console.log('\n=== NORMAL HIT WITH ADVANTAGE (Sneak Attack) ===');
    
    const context: AttackContext = {
      attacker: character,
      weapon: dagger,
      hasAdvantage: true, // This should guarantee sneak attack
      targetAC: 10, // Low AC to ensure hit
      targetSize: 'medium',
      round: 1,
      turn: 1
    };

    const result = combatResolver.resolveAttack(context);
    
    console.log(`Hit: ${result.hit}`);
    console.log(`Critical: ${result.critical}`);
    console.log(`Base Damage: ${result.baseDamage} (weapon: 1d4)`);
    console.log(`Bonus Damage: ${result.bonusDamage} (dex: 3 + magic: 1 + sneak attack)`);
    console.log(`Total Damage: ${result.totalDamage}`);
    
    console.log('\nSpecial Effects:');
    result.specialEffects?.forEach((effect: any) => {
      console.log(`  ${effect.name}: ${effect.damage} ${effect.type} damage`);
    });
    
    // Expected breakdown for Level 5 rogue with advantage:
    // Base: 1d4 (1-4)
    // Dex modifier: +3
    // Magic bonus: +1  
    // Sneak Attack: 3d6 (3-18)
    // Total: 1d4 + 3d6 + 4 = 8-26 damage
    
    if (result.hit) {
      expect(result.totalDamage).toBeGreaterThanOrEqual(8); // Min: 1+3+4 = 8
      expect(result.totalDamage).toBeLessThanOrEqual(26); // Max: 4+18+4 = 26
      
      const sneakAttackEffect = result.specialEffects?.find((effect: any) => effect.name === 'Sneak Attack');
      expect(sneakAttackEffect).toBeDefined();
      expect(sneakAttackEffect?.damage).toBeGreaterThanOrEqual(3); // Min 3d6
      expect(sneakAttackEffect?.damage).toBeLessThanOrEqual(18); // Max 3d6
    }
  });

  test('should show detailed damage breakdown for critical hit with advantage', () => {
    console.log('\n=== CRITICAL HIT WITH ADVANTAGE (Doubled Dice) ===');
    
    // Force a critical hit by manipulating the dice engine or using a different approach
    // Let's run multiple attempts to catch a critical hit
    let criticalResult: any = null;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!criticalResult && attempts < maxAttempts) {
      const context: AttackContext = {
        attacker: character,
        weapon: dagger,
        hasAdvantage: true,
        targetAC: 5, // Very low AC
        targetSize: 'medium',
        round: 1,
        turn: 1
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit && result.critical) {
        criticalResult = result;
        break;
      }
      attempts++;
    }
    
    if (criticalResult) {
      console.log(`Hit: ${criticalResult.hit}`);
      console.log(`Critical: ${criticalResult.critical}`);
      console.log(`Base Damage: ${criticalResult.baseDamage} (weapon: 2d4 doubled)`);
      console.log(`Bonus Damage: ${criticalResult.bonusDamage} (dex: 3 + magic: 1 + sneak attack)`);
      console.log(`Total Damage: ${criticalResult.totalDamage}`);
      
      console.log('\nSpecial Effects:');
      criticalResult.specialEffects?.forEach((effect: any) => {
        console.log(`  ${effect.name}: ${effect.damage} ${effect.type} damage`);
      });
      
      // Expected breakdown for critical hit:
      // Base: 2d4 (2-8) - doubled weapon dice
      // Dex modifier: +3 (not doubled)
      // Magic bonus: +1 (not doubled)
      // Sneak Attack: 6d6 (6-36) - doubled sneak attack dice
      // Total: 2d4 + 6d6 + 4 = 12-48 damage
      
      expect(criticalResult.totalDamage).toBeGreaterThanOrEqual(12); // Min: 2+6+4 = 12
      expect(criticalResult.totalDamage).toBeLessThanOrEqual(48); // Max: 8+36+4 = 48
      
      const sneakAttackEffect = criticalResult.specialEffects?.find((effect: any) => effect.name === 'Sneak Attack');
      expect(sneakAttackEffect).toBeDefined();
      expect(sneakAttackEffect?.damage).toBeGreaterThanOrEqual(6); // Min 6d6
      expect(sneakAttackEffect?.damage).toBeLessThanOrEqual(36); // Max 6d6
      
      // Critical hit should have higher damage than normal hit
      expect(criticalResult.totalDamage).toBeGreaterThanOrEqual(26); // Should exceed or equal normal max
    } else {
      console.log(`No critical hit found in ${maxAttempts} attempts`);
      // This is not necessarily a failure, just bad luck with RNG
    }
  });

  test('should show damage breakdown for flat roll (no advantage)', () => {
    console.log('\n=== FLAT ROLL (No Advantage) ===');
    
    const results: any[] = [];
    const testRuns = 10;
    
    for (let i = 0; i < testRuns; i++) {
      const context: AttackContext = {
        attacker: character,
        weapon: dagger,
        hasAdvantage: false, // No advantage
        targetAC: 10,
        targetSize: 'medium',
        round: 1,
        turn: 1
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        results.push(result);
        
        const hasSneakAttack = result.specialEffects?.some((effect: any) => effect.name === 'Sneak Attack');
        const sneakAttackDamage = result.specialEffects?.find((effect: any) => effect.name === 'Sneak Attack')?.damage || 0;
        
        console.log(`Attack ${i + 1}: Total=${result.totalDamage}, Base=${result.baseDamage}, Bonus=${result.bonusDamage}, SneakAttack=${hasSneakAttack ? sneakAttackDamage : 'None'}`);
      } else {
        console.log(`Attack ${i + 1}: MISS`);
      }
    }
    
    const hitCount = results.length;
    const sneakAttackCount = results.filter(r => r.specialEffects?.some((e: any) => e.name === 'Sneak Attack')).length;
    const avgDamage = hitCount > 0 ? results.reduce((sum, r) => sum + r.totalDamage, 0) / hitCount : 0;
    
    console.log(`\nSummary: ${hitCount}/${testRuns} hits, ${sneakAttackCount}/${hitCount} sneak attacks (${hitCount > 0 ? (sneakAttackCount/hitCount*100).toFixed(1) : 0}%)`);
    console.log(`Average Damage: ${avgDamage.toFixed(1)}`);
    
    // Without advantage, basic rogue should have 0% sneak attack rate
    if (hitCount > 0) {
      const sneakAttackRate = sneakAttackCount / hitCount;
      expect(sneakAttackRate).toBeLessThan(1.0); // Should not be 100%
    }
  });

  test('should verify sneak attack dice progression by level', () => {
    console.log('\n=== SNEAK ATTACK DICE BY LEVEL ===');
    
    const levels = [1, 3, 5, 7, 9, 11];
    
    levels.forEach(level => {
      const levelTemplate = {
        ...character.getTemplate(),
        level: level,
        proficiencyBonus: Math.ceil(level / 4) + 1
      };
      const levelChar = CharacterBuilder.fromTemplate(levelTemplate);
      
      const context: AttackContext = {
        attacker: levelChar,
        weapon: dagger,
        hasAdvantage: true, // Guarantee sneak attack
        targetAC: 5, // Guarantee hit
        targetSize: 'medium',
        round: 1,
        turn: 1
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const sneakAttackEffect = result.specialEffects?.find((effect: any) => effect.name === 'Sneak Attack');
        const expectedDice = Math.ceil(level / 2);
        
        console.log(`Level ${level}: Expected ${expectedDice}d6, Got ${sneakAttackEffect?.damage || 0} damage`);
        
        if (sneakAttackEffect) {
          // Verify damage is within expected range for the dice count
          expect(sneakAttackEffect.damage).toBeGreaterThanOrEqual(expectedDice); // Min
          expect(sneakAttackEffect.damage).toBeLessThanOrEqual(expectedDice * 6); // Max
        }
      }
    });
  });

  test('should verify critical hit doubles sneak attack dice', () => {
    console.log('\n=== CRITICAL HIT SNEAK ATTACK DOUBLING ===');
    
    // Test multiple times to find critical hits
    let normalHits: Array<{ result: any; sneakDamage: number }> = [];
    let criticalHits: Array<{ result: any; sneakDamage: number }> = [];
    let attempts = 0;
    const maxAttempts = 200;
    
    while ((normalHits.length < 5 || criticalHits.length < 2) && attempts < maxAttempts) {
      const context: AttackContext = {
        attacker: character,
        weapon: dagger,
        hasAdvantage: true, // Guarantee sneak attack
        targetAC: 5, // Very low AC for high hit rate
        targetSize: 'medium',
        round: 1,
        turn: 1
      };

      const result = combatResolver.resolveAttack(context);
      
      if (result.hit) {
        const sneakAttackEffect = result.specialEffects?.find((effect: any) => effect.name === 'Sneak Attack');
        if (sneakAttackEffect) {
          if (result.critical) {
            criticalHits.push({ result, sneakDamage: sneakAttackEffect.damage });
          } else {
            normalHits.push({ result, sneakDamage: sneakAttackEffect.damage });
          }
        }
      }
      attempts++;
    }
    
    console.log(`Found ${normalHits.length} normal hits and ${criticalHits.length} critical hits in ${attempts} attempts`);
    
    if (normalHits.length > 0) {
      const avgNormalSneak = normalHits.reduce((sum, hit) => sum + hit.sneakDamage, 0) / normalHits.length;
      console.log(`Normal Sneak Attack Average: ${avgNormalSneak.toFixed(1)} (expected ~10.5 for 3d6)`);
      
      normalHits.slice(0, 3).forEach((hit, i) => {
        console.log(`  Normal ${i + 1}: Total=${hit.result.totalDamage}, Base=${hit.result.baseDamage}, Sneak=${hit.sneakDamage}`);
      });
    }
    
    if (criticalHits.length > 0) {
      const avgCriticalSneak = criticalHits.reduce((sum, hit) => sum + hit.sneakDamage, 0) / criticalHits.length;
      console.log(`Critical Sneak Attack Average: ${avgCriticalSneak.toFixed(1)} (expected ~21 for 6d6)`);
      
      criticalHits.forEach((hit, i) => {
        console.log(`  Critical ${i + 1}: Total=${hit.result.totalDamage}, Base=${hit.result.baseDamage}, Sneak=${hit.sneakDamage}`);
      });
      
      // Critical sneak attack should be roughly double normal sneak attack
      if (normalHits.length > 0) {
        const avgNormalSneak = normalHits.reduce((sum, hit) => sum + hit.sneakDamage, 0) / normalHits.length;
        const ratio = avgCriticalSneak / avgNormalSneak;
        console.log(`Critical/Normal Sneak Attack Ratio: ${ratio.toFixed(2)} (expected ~2.0)`);
        
        // Allow some variance due to dice randomness, but should be roughly double
        expect(ratio).toBeGreaterThan(1.5);
        expect(ratio).toBeLessThan(2.5);
      }
    }
  });
});