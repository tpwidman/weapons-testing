/**
 * Demo of the dice rolling system
 * Run with: npx ts-node examples/dice-demo.ts
 */

import { dice, rollAttack, rollDamage, DiceEngine } from '../core/dice';

console.log('=== Weapon Damage Simulator - Dice System Demo ===\n');

// Basic dice rolling
console.log('1. Basic Dice Rolling:');
console.log('Rolling 3d6+2:', dice.rollExpression('3d6+2').explanation);
console.log('Rolling 1d20:', dice.rollExpression('1d20').explanation);
console.log('Rolling 2d8-1:', dice.rollExpression('2d8-1').explanation);
console.log();

// Attack rolls with advantage/disadvantage
console.log('2. Attack Rolls:');
console.log('Normal attack (+5):', rollAttack(5).explanation);
console.log('Attack with advantage (+5):', rollAttack(5, true).explanation);
console.log('Attack with disadvantage (+5):', rollAttack(5, false, true).explanation);
console.log();

// Damage rolls
console.log('3. Damage Rolls:');
console.log('Normal damage (2d6+3):', rollDamage('2d6+3').explanation);
console.log('Critical damage (2d6+3):', rollDamage('2d6+3', true).explanation);
console.log();

// Hemorrhage counter simulation (for Sanguine Messer)
console.log('4. Hemorrhage Counter Simulation:');
let counter = 0;
const threshold = 15; // Medium creature threshold

for (let i = 1; i <= 5; i++) {
  const hasAdvantage = Math.random() > 0.5;
  const isCritical = Math.random() > 0.95;
  
  let counterDice: string;
  if (hasAdvantage) {
    counterDice = isCritical ? '2d8' : '1d8'; // Critical doubles dice
  } else {
    counterDice = isCritical ? '2d4' : '1d4';
  }
  
  const roll = dice.rollExpression(counterDice);
  counter += roll.total;
  
  console.log(`Attack ${i}: ${roll.explanation} (${hasAdvantage ? 'advantage' : 'normal'}${isCritical ? ', critical' : ''}) - Counter: ${counter}`);
  
  if (counter >= threshold) {
    const hemorrhageDamage = dice.rollExpression('3d6'); // Proficiency bonus 3 * d6
    console.log(`  🩸 HEMORRHAGE TRIGGERED! ${hemorrhageDamage.explanation} damage - Counter reset to 0`);
    counter = 0;
  }
}
console.log();

// Seeded dice for reproducible results
console.log('5. Reproducible Results (Seeded):');
const seededEngine = new DiceEngine(12345);
console.log('Seeded roll 1:', seededEngine.rollExpression('1d20+5').explanation);
console.log('Seeded roll 2:', seededEngine.rollExpression('2d6').explanation);

const seededEngine2 = new DiceEngine(12345);
console.log('Same seed roll 1:', seededEngine2.rollExpression('1d20+5').explanation);
console.log('Same seed roll 2:', seededEngine2.rollExpression('2d6').explanation);
console.log();

console.log('=== Demo Complete ===');