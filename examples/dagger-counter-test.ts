/**
 * Test script to verify Sanguine Dagger counter mechanics
 */

import { WeaponBuilder, SanguineDagger } from '../weapons/weapon';
import { CharacterBuilder } from '../characters/character';
import { DiceEngine } from '../core/dice';
import { AttackContext } from '../core/types';

async function testDaggerCounter() {
  console.log('=== Sanguine Dagger Counter Test ===\n');

  try {
    // Load the Sanguine Dagger
    const dagger = WeaponBuilder.loadFromFile('weapons/sanguine-dagger/sanguine-dagger.json') as SanguineDagger;
    console.log(`Testing: ${dagger.getDisplayName()}\n`);

    // Load a character
    const character = CharacterBuilder.loadFromFile('characters/level-5-swashbuckler-rogue.json');

    // Create dice engine with fixed seed for predictable results
    const dice = new DiceEngine(42);
    
    // Pass the dice engine to the dagger for consistent results
    (dagger as any).dice = dice;

    // Create attack context
    const context: AttackContext = {
      attacker: character,
      weapon: dagger,
      hasAdvantage: false,
      targetAC: 15,
      targetSize: 'medium',
      round: 1,
      turn: 1
    };

    console.log('=== Testing Counter Building ===');
    console.log('Target: Medium creature (threshold: 12)\n');

    let totalCounter = 0;
    for (let i = 1; i <= 15; i++) {
      // Update context for this attack
      context.round = i;
      context.hasAdvantage = i % 3 === 0; // Every 3rd attack has advantage

      const result = dagger.applySpecialMechanics(context);
      
      if (result.hit) {
        const counterEffect = result.specialEffects.find(e => e.name === 'Bleed Counter');
        const counterIncrease = counterEffect ? counterEffect.damage : 0;
        totalCounter += counterIncrease;

        console.log(`Attack ${i}: ${result.hit ? 'HIT' : 'MISS'} ${context.hasAdvantage ? '(ADV)' : ''} ${result.critical ? '(CRIT)' : ''}`);
        console.log(`  Counter +${counterIncrease}, Total: ${dagger.getHemorrhageCounter()}`);
        
        if (result.hemorrhageTriggered) {
          console.log(`  *** HEMORRHAGE! ${result.hemorrhageDamage} necrotic damage ***`);
          console.log(`  Counter reset to: ${dagger.getHemorrhageCounter()}`);
        }
        
        console.log('');

        // Stop if we've triggered hemorrhage
        if (result.hemorrhageTriggered) {
          break;
        }
      } else {
        console.log(`Attack ${i}: MISS\n`);
      }
    }

    // Test with advantage
    console.log('\n=== Testing with High Advantage Rate ===');
    dagger.resetCounter();
    
    for (let i = 1; i <= 10; i++) {
      context.round = i;
      context.hasAdvantage = true; // Always advantage
      
      const result = dagger.applySpecialMechanics(context);
      
      if (result.hit) {
        const counterEffect = result.specialEffects.find(e => e.name === 'Bleed Counter');
        const counterIncrease = counterEffect ? counterEffect.damage : 0;

        console.log(`Attack ${i}: HIT (ADV) ${result.critical ? '(CRIT)' : ''}`);
        console.log(`  Counter +${counterIncrease}, Total: ${dagger.getHemorrhageCounter()}`);
        
        if (result.hemorrhageTriggered) {
          console.log(`  *** HEMORRHAGE! ${result.hemorrhageDamage} necrotic damage ***`);
          console.log(`  Counter reset to: ${dagger.getHemorrhageCounter()}`);
          break;
        }
        
        console.log('');
      }
    }

    // Test against large creature
    console.log('\n=== Testing Against Large Creature ===');
    console.log('Target: Large creature (threshold: 16)\n');
    
    dagger.resetCounter();
    context.targetSize = 'large';
    
    for (let i = 1; i <= 20; i++) {
      context.round = i;
      context.hasAdvantage = i % 2 === 0; // Every other attack has advantage
      
      const result = dagger.applySpecialMechanics(context);
      
      if (result.hit) {
        const counterEffect = result.specialEffects.find(e => e.name === 'Bleed Counter');
        const counterIncrease = counterEffect ? counterEffect.damage : 0;

        console.log(`Attack ${i}: HIT ${context.hasAdvantage ? '(ADV)' : ''} ${result.critical ? '(CRIT)' : ''}`);
        console.log(`  Counter +${counterIncrease}, Total: ${dagger.getHemorrhageCounter()}`);
        
        if (result.hemorrhageTriggered) {
          console.log(`  *** HEMORRHAGE! ${result.hemorrhageDamage} necrotic damage ***`);
          console.log(`  Counter reset to: ${dagger.getHemorrhageCounter()}`);
          break;
        }
        
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testDaggerCounter().catch(console.error);