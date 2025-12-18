/**
 * Demo script showing character system functionality
 */

import { CharacterBuilder } from '../characters/character';
import * as path from 'path';

// Load the Level 5 Swashbuckler Rogue
const rogueTemplate = path.join(__dirname, '..', 'characters', 'level-5-swashbuckler-rogue.json');
const rogue = CharacterBuilder.loadFromFile(rogueTemplate);

console.log('=== Character System Demo ===');
console.log(`Character: ${rogue.getName()}`);
console.log(`Level: ${rogue.getLevel()}`);
console.log(`Class: ${rogue.getClassInfo().class} (${rogue.getClassInfo().subclass})`);
console.log(`Proficiency Bonus: +${rogue.getProficiencyBonus()}`);
console.log();

console.log('=== Ability Scores ===');
console.log(`Strength: ${rogue.getAbilityModifier('strength') >= 0 ? '+' : ''}${rogue.getAbilityModifier('strength')}`);
console.log(`Dexterity: ${rogue.getAbilityModifier('dexterity') >= 0 ? '+' : ''}${rogue.getAbilityModifier('dexterity')}`);
console.log(`Constitution: ${rogue.getAbilityModifier('constitution') >= 0 ? '+' : ''}${rogue.getAbilityModifier('constitution')}`);
console.log(`Intelligence: ${rogue.getAbilityModifier('intelligence') >= 0 ? '+' : ''}${rogue.getAbilityModifier('intelligence')}`);
console.log(`Wisdom: ${rogue.getAbilityModifier('wisdom') >= 0 ? '+' : ''}${rogue.getAbilityModifier('wisdom')}`);
console.log(`Charisma: ${rogue.getAbilityModifier('charisma') >= 0 ? '+' : ''}${rogue.getAbilityModifier('charisma')}`);
console.log();

console.log('=== Combat Stats ===');
console.log(`Attack Bonus: +${rogue.getAttackBonus()}`);
console.log(`Damage Bonus: +${rogue.getDamageBonus()}`);
const advantageSources = rogue.getAdvantageSources();
console.log(`Advantage Sources: ${advantageSources.length > 0 ? advantageSources.map(s => s.name).join(', ') : 'None'}`);
console.log(`Critical Range: ${rogue.getCritRange()}-20`);
console.log();

console.log('=== Class Features ===');
const features = rogue.getClassFeatures();
features.forEach(feature => {
  console.log(`- ${feature.name} (${feature.type})`);
  if (feature.effect.diceExpression) {
    console.log(`  Damage: ${feature.effect.diceExpression}`);
  }
  if (feature.effect.value !== undefined) {
    console.log(`  Value: ${feature.effect.value}`);
  }
});
console.log();

console.log('=== Triggered Features ===');
const hitFeatures = rogue.getTriggeredFeatures('hit');
console.log(`On Hit: ${hitFeatures.map(f => f.name).join(', ') || 'None'}`);

const critFeatures = rogue.getTriggeredFeatures('crit');
console.log(`On Crit: ${critFeatures.map(f => f.name).join(', ') || 'None'}`);
console.log();

console.log('=== Advantage Sources ===');
advantageSources.forEach(source => {
  console.log(`- ${source.name}: ${source.effect.description || 'No description'}`);
});
console.log();

console.log('=== Damage Modifiers ===');
const alwaysModifiers = rogue.getDamageModifiersForTrigger('always');
console.log('Always Applied:');
alwaysModifiers.forEach(mod => {
  console.log(`  - ${mod.name}: +${mod.damageBonus} ${mod.damageType}`);
});

const hitModifiers = rogue.getDamageModifiersForTrigger('hit');
if (hitModifiers.length > 0) {
  console.log('On Hit:');
  hitModifiers.forEach(mod => {
    console.log(`  - ${mod.name}: ${mod.diceExpression || `+${mod.damageBonus}`} ${mod.damageType}`);
  });
}