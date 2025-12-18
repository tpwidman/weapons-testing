/**
 * Demo script for testing the Sanguine Dagger weapon
 */

import { WeaponBuilder } from '../weapons/weapon';
import { CharacterBuilder } from '../characters/character';
import { CombatResolver } from '../combat/combat';
import { DiceEngine } from '../core/dice';

async function testSanguineDagger() {
  console.log('=== Sanguine Dagger Demo ===\n');

  try {
    // Load the Sanguine Dagger
    const dagger = WeaponBuilder.loadFromFile('weapons/sanguine-dagger/sanguine-dagger.json');
    console.log(`Loaded weapon: ${dagger.getDisplayName()}`);
    console.log(`Rarity: ${dagger.getRarity()}`);
    console.log(`Base damage: ${dagger.getBaseDamage()}`);
    console.log(`Properties: ${dagger.getProperties().join(', ')}\n`);

    // Load a character
    const character = CharacterBuilder.loadFromFile('characters/level-5-swashbuckler-rogue.json');
    console.log(`Character: ${character.getName()} (Level ${character.getLevel()} ${character.getClassInfo().class})`);
    console.log(`Attack bonus: +${character.getAttackBonus()}`);
    console.log(`Damage bonus: +${character.getDamageBonus()}\n`);

    // Create combat resolver with seeded dice for consistent results
    const dice = new DiceEngine(12345);
    const resolver = new CombatResolver(dice);

    // Test against a medium creature
    console.log('=== Combat Test: Medium Creature ===');
    const scenario = CombatResolver.createStandardScenario(15, 'medium');
    const combat = resolver.simulateCombat(character, dagger, scenario);

    console.log(`Total damage over ${scenario.rounds} rounds: ${combat.totalDamage}`);
    console.log(`Average damage per round: ${combat.averageDamagePerRound.toFixed(2)}`);
    console.log(`Hemorrhage triggers: ${combat.hemorrhageTriggers}`);
    console.log(`Hit rate: ${(combat.hitRate * 100).toFixed(1)}%`);
    console.log(`Critical rate: ${(combat.criticalRate * 100).toFixed(1)}%\n`);

    // Show some individual round details
    console.log('=== Sample Round Details ===');
    for (let i = 0; i < Math.min(3, combat.rounds.length); i++) {
      const round = combat.rounds[i];
      if (round) {
        console.log(`Round ${round.round}:`);
        for (const attack of round.attacks) {
        if (attack.hit) {
          console.log(`  Hit! Base: ${attack.baseDamage}, Bonus: ${attack.bonusDamage}, Total: ${attack.totalDamage}`);
          if (attack.specialEffects.length > 0) {
            for (const effect of attack.specialEffects) {
              console.log(`    ${effect.name}: ${effect.damage} (${effect.type})`);
            }
          }
          if (attack.hemorrhageTriggered) {
            console.log(`    HEMORRHAGE! ${attack.hemorrhageDamage} necrotic damage`);
          }
        } else {
          console.log(`  Miss`);
        }
      }
    }
    }

    // Test against a large creature
    console.log('\n=== Combat Test: Large Creature ===');
    const largeScenario = CombatResolver.createStandardScenario(15, 'large');
    const largeCombat = resolver.simulateCombat(character, dagger, largeScenario);

    console.log(`Total damage over ${largeScenario.rounds} rounds: ${largeCombat.totalDamage}`);
    console.log(`Hemorrhage triggers: ${largeCombat.hemorrhageTriggers}`);
    console.log(`Average damage per round: ${largeCombat.averageDamagePerRound.toFixed(2)}\n`);

    // Test against bleed immune creature
    console.log('=== Combat Test: Bleed Immune Construct ===');
    const immuneScenario = CombatResolver.createBleedImmuneScenario(15, 'medium construct');
    const immuneCombat = resolver.simulateCombat(character, dagger, immuneScenario);

    console.log(`Total damage over ${immuneScenario.rounds} rounds: ${immuneCombat.totalDamage}`);
    console.log(`Hemorrhage triggers: ${immuneCombat.hemorrhageTriggers} (should be 0)`);
    console.log(`Average damage per round: ${immuneCombat.averageDamagePerRound.toFixed(2)}\n`);

  } catch (error) {
    console.error('Error during demo:', error);
  }
}

// Run the demo
testSanguineDagger().catch(console.error);