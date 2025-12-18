/**
 * Unit tests for the character system
 */

import { Character, CharacterBuilder } from '../characters/character';
import { CharacterTemplate } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Character System', () => {
  const mockTemplate: CharacterTemplate = {
    name: "Test Character",
    level: 5,
    class: "Rogue",
    subclass: "Swashbuckler",
    abilityScores: {
      strength: 10,
      dexterity: 17,
      constitution: 14,
      intelligence: 12,
      wisdom: 13,
      charisma: 14
    },
    proficiencyBonus: 3,
    classFeatures: [
      {
        name: "Sneak Attack",
        type: "triggered",
        trigger: "hit",
        effect: {
          type: "damage",
          diceExpression: "3d6",
          condition: "advantage_or_flanking"
        }
      }
    ],
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
        trigger: "always"
      }
    ]
  };

  describe('Character class', () => {
    let character: Character;

    beforeEach(() => {
      character = new Character(mockTemplate);
    });

    test('calculates attack bonus correctly', () => {
      expect(character.getAttackBonus()).toBe(6); // 3 (Dex) + 3 (Prof)
    });

    test('calculates damage bonus correctly', () => {
      expect(character.getDamageBonus()).toBe(3); // Only "always" modifiers
    });

    test('gets advantage sources correctly', () => {
      const sources = character.getAdvantageSources();
      expect(sources).toHaveLength(0); // No advantage sources in base template
    });

    test('gets critical range correctly', () => {
      expect(character.getCritRange()).toBe(20); // Normal crit range
    });

    test('gets proficiency bonus', () => {
      expect(character.getProficiencyBonus()).toBe(3);
    });

    test('gets level', () => {
      expect(character.getLevel()).toBe(5);
    });

    test('gets name', () => {
      expect(character.getName()).toBe("Test Character");
    });

    test('gets class info', () => {
      const classInfo = character.getClassInfo();
      expect(classInfo.class).toBe("Rogue");
      expect(classInfo.subclass).toBe("Swashbuckler");
    });

    test('calculates ability modifiers correctly', () => {
      expect(character.getAbilityModifier('strength')).toBe(0); // 10 -> +0
      expect(character.getAbilityModifier('dexterity')).toBe(3); // 17 -> +3
      expect(character.getAbilityModifier('constitution')).toBe(2); // 14 -> +2
    });

    test('gets class features', () => {
      const features = character.getClassFeatures();
      expect(features).toHaveLength(1);
      expect(features[0]?.name).toBe("Sneak Attack");
    });

    test('gets triggered features', () => {
      const hitFeatures = character.getTriggeredFeatures('hit');
      expect(hitFeatures).toHaveLength(1);
      expect(hitFeatures[0]?.name).toBe("Sneak Attack");

      const critFeatures = character.getTriggeredFeatures('crit');
      expect(critFeatures).toHaveLength(0);
    });

    test('gets damage modifiers for trigger', () => {
      const alwaysModifiers = character.getDamageModifiersForTrigger('always');
      expect(alwaysModifiers).toHaveLength(1);
      expect(alwaysModifiers[0]?.name).toBe("Dexterity");

      const hitModifiers = character.getDamageModifiersForTrigger('hit');
      expect(hitModifiers).toHaveLength(0);
    });

    test('returns template copy', () => {
      const template = character.getTemplate();
      expect(template).toEqual(mockTemplate);
      expect(template).not.toBe(mockTemplate); // Should be a copy
    });
  });

  describe('CharacterBuilder', () => {
    test('creates character from template', () => {
      const character = CharacterBuilder.fromTemplate(mockTemplate);
      expect(character.getName()).toBe("Test Character");
      expect(character.getLevel()).toBe(5);
    });

    test('loads character from JSON string', () => {
      const jsonString = JSON.stringify(mockTemplate);
      const character = CharacterBuilder.loadFromJson(jsonString);
      expect(character.getName()).toBe("Test Character");
      expect(character.getLevel()).toBe(5);
    });

    test('validates template correctly', () => {
      const invalidTemplate = { ...mockTemplate };
      delete (invalidTemplate as any).name;

      expect(() => CharacterBuilder.fromTemplate(invalidTemplate as CharacterTemplate))
        .toThrow('Character template must have a valid name');
    });

    test('validates level range', () => {
      const invalidTemplate = { ...mockTemplate, level: 0 };

      expect(() => CharacterBuilder.fromTemplate(invalidTemplate))
        .toThrow('Character template must have a valid level (1-20)');
    });

    test('validates ability scores', () => {
      const invalidTemplate = { ...mockTemplate };
      delete (invalidTemplate.abilityScores as any).strength;

      expect(() => CharacterBuilder.fromTemplate(invalidTemplate))
        .toThrow('Character template must have a valid strength score');
    });

    test('calculates proficiency bonus correctly', () => {
      expect(CharacterBuilder.calculateProficiencyBonus(1)).toBe(2);
      expect(CharacterBuilder.calculateProficiencyBonus(5)).toBe(3);
      expect(CharacterBuilder.calculateProficiencyBonus(9)).toBe(4);
      expect(CharacterBuilder.calculateProficiencyBonus(13)).toBe(5);
      expect(CharacterBuilder.calculateProficiencyBonus(17)).toBe(6);
      expect(CharacterBuilder.calculateProficiencyBonus(20)).toBe(6);
    });

    test('calculates ability modifier correctly', () => {
      expect(CharacterBuilder.calculateAbilityModifier(8)).toBe(-1);
      expect(CharacterBuilder.calculateAbilityModifier(10)).toBe(0);
      expect(CharacterBuilder.calculateAbilityModifier(12)).toBe(1);
      expect(CharacterBuilder.calculateAbilityModifier(17)).toBe(3);
      expect(CharacterBuilder.calculateAbilityModifier(20)).toBe(5);
    });

    test('throws error for invalid proficiency bonus level', () => {
      expect(() => CharacterBuilder.calculateProficiencyBonus(0))
        .toThrow('Level must be between 1 and 20');
      expect(() => CharacterBuilder.calculateProficiencyBonus(21))
        .toThrow('Level must be between 1 and 20');
    });
  });

  describe('Level 5 Rogue Integration', () => {
    test('loads level 5 rogue template correctly', () => {
      const templatePath = path.join(__dirname, 'data', 'level-5-swashbuckler-rogue.json');
      
      // Check if file exists
      expect(fs.existsSync(templatePath)).toBe(true);
      
      const character = CharacterBuilder.loadFromFile(templatePath);
      
      expect(character.getName()).toBe("Level 5 Rogue");
      expect(character.getLevel()).toBe(5);
      expect(character.getProficiencyBonus()).toBe(3);
      
      const classInfo = character.getClassInfo();
      expect(classInfo.class).toBe("Rogue");
      expect(classInfo.subclass).toBe("Thief");
      
      // Check ability scores and modifiers
      expect(character.getAbilityModifier('dexterity')).toBe(3); // 17 -> +3
      expect(character.getAbilityModifier('constitution')).toBe(2); // 14 -> +2
      
      // Check attack bonus (Dex + Prof = 3 + 3 = 6)
      expect(character.getAttackBonus()).toBe(6);
      
      // Check damage bonus (Dex = 3)
      expect(character.getDamageBonus()).toBe(3);
      
      // Check class features
      const features = character.getClassFeatures();
      expect(features.length).toBeGreaterThan(0);
      
      const sneakAttack = features.find(f => f.name === "Sneak Attack");
      expect(sneakAttack).toBeDefined();
      expect(sneakAttack?.effect.diceExpression).toBe("3d6");
      
      // Check advantage sources from basic rogue features
      const advantageSources = character.getAdvantageSources();
      expect(advantageSources.length).toBeGreaterThan(0);
      
      const cunningAction = advantageSources.find(s => s.name === "Cunning Action");
      expect(cunningAction).toBeDefined();
      expect(cunningAction?.effect.description).toContain("Hide");
    });
  });
});