/**
 * Demonstration of the weapon system with Sanguine Messer
 */

import { WeaponBuilder, SanguineMesser } from '../weapons/weapon';
import { CharacterBuilder } from '../characters/character';
import { DiceEngine } from '../core/dice';

// Create a seeded dice engine for consistent results
const dice = new DiceEngine(42);

// Load the Level 5 Swashbuckler Rogue
const rogue = CharacterBuilder.loadFromFile('characters/level-5-swashbuckler-rogue.json');

// Load the Sanguine Messer
const sanguineMesser = WeaponBuilder.loadFromFile('weapons/sanguine-messer/sanguine-messer.json', dice) as SanguineMesser;

console.log('=== Weapon Damage Simulator Demo ===\n');

console.log(`Character: ${rogue.getName()}`);
console.log(`Level: ${rogue.getLevel()}`);
console.log(`Class: ${rogue.getClassInfo().class} (${rogue.getClassInfo().subclass})`);
console.log(`Attack Bonus: +${rogue.getAttackBonus()}`);
console.log(`Damage Bonus: +${rogue.getDamageBonus()}`);
console.log(`Proficiency Bonus: +${rogue.getProficiencyBonus()}\n`);

console.log(`Weapon: ${sanguineMesser.getDisplayName()}`);
console.log(`Rarity: ${sanguineMesser.getRarity()}`);
console.log(`Base Damage: ${sanguineMesser.getBaseDamage()}`);
console.log(`Damage Type: ${sanguineMesser.getDamageType()}`);
console.log(`Properties: ${sanguineMesser.getProperties().join(', ')}\n`);

console.log('=== Combat Simulation ===\n');

// Simulate a combat encounter against a Medium creature (AC 15)
const attackContext = {
  attacker: rogue,
  weapon: sanguineMesser,
  hasAdvantage: true, // Rogue with Cunning Action
  targetAC: 15,
  targetSize: 'medium',
  round: 1,
  turn: 1
};

let totalDamage = 0;
let hemorrhageCount = 0;
let tempHPGained = 0;

console.log('Attacking Medium creature (AC 15) with advantage...\n');

// Simulate 10 attacks to show hemorrhage mechanics
for (let i = 1; i <= 10; i++) {
  console.log(`--- Attack ${i} ---`);
  console.log(`Hemorrhage Counter: ${sanguineMesser.getHemorrhageCounter()}`);
  
  const result = sanguineMesser.applySpecialMechanics(attackContext);
  
  if (result.hit) {
    console.log(`HIT! ${result.critical ? '(CRITICAL!) ' : ''}Total Damage: ${result.totalDamage}`);
    console.log(`  Base Damage: ${result.baseDamage}`);
    console.log(`  Bonus Damage: ${result.bonusDamage}`);
    
    // Show special effects
    result.specialEffects.forEach(effect => {
      if (effect.triggered) {
        console.log(`  ${effect.name}: ${effect.damage} ${effect.type}`);
      }
    });
    
    if (result.hemorrhageTriggered) {
      console.log(`  🩸 HEMORRHAGE TRIGGERED! ${result.hemorrhageDamage} necrotic damage`);
      console.log(`  ❤️ Reaver's Feast: ${result.tempHPGained} temporary HP`);
      hemorrhageCount++;
      tempHPGained += result.tempHPGained || 0;
    }
    
    totalDamage += result.totalDamage;
  } else {
    console.log('MISS!');
  }
  
  console.log(`New Counter: ${sanguineMesser.getHemorrhageCounter()}\n`);
  
  // Update context for next attack
  attackContext.turn = i + 1;
}

console.log('=== Combat Summary ===');
console.log(`Total Damage Dealt: ${totalDamage}`);
console.log(`Average Damage per Attack: ${(totalDamage / 10).toFixed(1)}`);
console.log(`Hemorrhage Triggers: ${hemorrhageCount}`);
console.log(`Total Temporary HP Gained: ${tempHPGained}`);
console.log(`Final Hemorrhage Counter: ${sanguineMesser.getHemorrhageCounter()}`);

// Demonstrate baseline comparison
console.log('\n=== Baseline Comparison ===');
const rapierPlus1 = WeaponBuilder.createBaseline('Rapier +1', '1d8', 1, 'piercing');
console.log(`Baseline: ${rapierPlus1.getDisplayName()}`);

// Simulate 5 attacks with baseline weapon for comparison
let baselineDamage = 0;
for (let i = 1; i <= 5; i++) {
  const baselineContext = { ...attackContext, weapon: rapierPlus1 };
  const result = rapierPlus1.applySpecialMechanics(baselineContext);
  if (result.hit) {
    baselineDamage += result.totalDamage;
  }
}

console.log(`Baseline Average Damage: ${(baselineDamage / 5).toFixed(1)}`);
console.log(`Sanguine Messer Average: ${(totalDamage / 10).toFixed(1)}`);

const improvement = ((totalDamage / 10) / (baselineDamage / 5) - 1) * 100;
console.log(`Performance Improvement: ${improvement.toFixed(1)}%`);