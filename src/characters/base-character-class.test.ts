/**
 * Tests for base character class system
 */

import { 
  AbstractCharacterClass, 
  BaseCharacterClass, 
  CharacterClassUtils, 
  AbilityScore, 
  ClassFeature 
} from './base-character-class';
import { CharacterClass } from './classes/types';
import { DiceType } from '../core/types';

// Test implementation of AbstractCharacterClass
class TestCharacterClass extends AbstractCharacterClass {
  readonly className = CharacterClass.FIGHTER;
  readonly hitDie: DiceType = 'd10';
  readonly primaryAbility = AbilityScore.STRENGTH;
  readonly savingThrowProficiencies = [AbilityScore.STRENGTH, AbilityScore.CONSTITUTION];

  getFeatures(level: number): ClassFeature[] {
    this.validateLevel(level);
    const features: ClassFeature[] = [];
    
    if (level >= 1) {
      features.push({
        name: 'Fighting Style',
        level: 1,
        description: 'Choose a fighting style',
        type: 'passive'
      });
    }
    
    if (level >= 2) {
      features.push({
        name: 'Action Surge',
        level: 2,
        description: 'Take an additional action',
        type: 'resource'
      });
    }
    
    return features;
  }

  getClassSpecificData(level: number): Record<string, any> {
    this.validateLevel(level);
    return {
      actionSurgeUses: level >= 2 ? (level >= 17 ? 2 : 1) : 0,
      extraAttacks: level >= 5 ? (level >= 11 ? (level >= 20 ? 4 : 3) : 2) : 1
    };
  }
}

describe('BaseCharacterClass System', () => {
  let testClass: TestCharacterClass;

  beforeEach(() => {
    testClass = new TestCharacterClass();
  });

  describe('AbstractCharacterClass', () => {
    test('should have correct class properties', () => {
      expect(testClass.className).toBe(CharacterClass.FIGHTER);
      expect(testClass.hitDie).toBe('d10');
      expect(testClass.primaryAbility).toBe(AbilityScore.STRENGTH);
      expect(testClass.savingThrowProficiencies).toEqual([
        AbilityScore.STRENGTH, 
        AbilityScore.CONSTITUTION
      ]);
    });

    test('should calculate proficiency bonus correctly', () => {
      expect(testClass.getProficiencyBonus(1)).toBe(2);
      expect(testClass.getProficiencyBonus(4)).toBe(2);
      expect(testClass.getProficiencyBonus(5)).toBe(3);
      expect(testClass.getProficiencyBonus(8)).toBe(3);
      expect(testClass.getProficiencyBonus(9)).toBe(4);
      expect(testClass.getProficiencyBonus(12)).toBe(4);
      expect(testClass.getProficiencyBonus(13)).toBe(5);
      expect(testClass.getProficiencyBonus(16)).toBe(5);
      expect(testClass.getProficiencyBonus(17)).toBe(6);
      expect(testClass.getProficiencyBonus(20)).toBe(6);
    });

    test('should throw error for invalid levels', () => {
      expect(() => testClass.getProficiencyBonus(0)).toThrow('Invalid character level: 0');
      expect(() => testClass.getProficiencyBonus(21)).toThrow('Invalid character level: 21');
      expect(() => testClass.getProficiencyBonus(-1)).toThrow('Invalid character level: -1');
    });

    test('should get features for specific levels', () => {
      const level1Features = testClass.getFeatures(1);
      expect(level1Features).toHaveLength(1);
      expect(level1Features[0]?.name).toBe('Fighting Style');

      const level2Features = testClass.getFeatures(2);
      expect(level2Features).toHaveLength(2);
      expect(level2Features.map(f => f.name)).toContain('Fighting Style');
      expect(level2Features.map(f => f.name)).toContain('Action Surge');
    });

    test('should get class-specific data', () => {
      const level1Data = testClass.getClassSpecificData(1);
      expect(level1Data['actionSurgeUses']).toBe(0);
      expect(level1Data['extraAttacks']).toBe(1);

      const level2Data = testClass.getClassSpecificData(2);
      expect(level2Data['actionSurgeUses']).toBe(1);
      expect(level2Data['extraAttacks']).toBe(1);

      const level5Data = testClass.getClassSpecificData(5);
      expect(level5Data['extraAttacks']).toBe(2);
    });

    test('should get complete progression data', () => {
      const progression = testClass.getProgression(5);
      
      expect(progression.level).toBe(5);
      expect(progression.proficiencyBonus).toBe(3);
      expect(progression.features).toEqual(['Fighting Style', 'Action Surge']);
      expect(progression.classSpecificData['extraAttacks']).toBe(2);
    });
  });

  describe('CharacterClassUtils', () => {
    test('should calculate proficiency bonus correctly', () => {
      expect(CharacterClassUtils.calculateProficiencyBonus(1)).toBe(2);
      expect(CharacterClassUtils.calculateProficiencyBonus(5)).toBe(3);
      expect(CharacterClassUtils.calculateProficiencyBonus(9)).toBe(4);
      expect(CharacterClassUtils.calculateProficiencyBonus(13)).toBe(5);
      expect(CharacterClassUtils.calculateProficiencyBonus(17)).toBe(6);
    });

    test('should calculate ability modifiers correctly', () => {
      expect(CharacterClassUtils.getAbilityModifier(8)).toBe(-1);
      expect(CharacterClassUtils.getAbilityModifier(10)).toBe(0);
      expect(CharacterClassUtils.getAbilityModifier(11)).toBe(0);
      expect(CharacterClassUtils.getAbilityModifier(12)).toBe(1);
      expect(CharacterClassUtils.getAbilityModifier(16)).toBe(3);
      expect(CharacterClassUtils.getAbilityModifier(20)).toBe(5);
    });

    test('should validate character class enums', () => {
      expect(CharacterClassUtils.isValidCharacterClass('Rogue')).toBe(true);
      expect(CharacterClassUtils.isValidCharacterClass('Fighter')).toBe(true);
      expect(CharacterClassUtils.isValidCharacterClass('InvalidClass')).toBe(false);
      expect(CharacterClassUtils.isValidCharacterClass('')).toBe(false);
    });
  });

  describe('Interface Compliance', () => {
    test('should implement BaseCharacterClass interface', () => {
      // This test verifies that our implementation satisfies the interface
      const baseClass: BaseCharacterClass = testClass;
      
      expect(baseClass.className).toBeDefined();
      expect(baseClass.hitDie).toBeDefined();
      expect(baseClass.primaryAbility).toBeDefined();
      expect(baseClass.savingThrowProficiencies).toBeDefined();
      
      expect(typeof baseClass.getProgression).toBe('function');
      expect(typeof baseClass.getFeatures).toBe('function');
      expect(typeof baseClass.getProficiencyBonus).toBe('function');
      expect(typeof baseClass.getClassSpecificData).toBe('function');
    });

    test('should return consistent progression data', () => {
      const progression1 = testClass.getProgression(5);
      const progression2 = testClass.getProgression(5);
      
      expect(progression1).toEqual(progression2);
    });
  });
});