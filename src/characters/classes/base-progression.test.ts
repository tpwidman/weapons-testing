/**
 * Tests for base progression utilities
 */

import { BaseProgression } from './base-progression';

describe('BaseProgression', () => {
  describe('getProficiencyBonus', () => {
    test('should return correct proficiency bonus for all levels', () => {
      // Levels 1-4: +2
      expect(BaseProgression.getProficiencyBonus(1)).toBe(2);
      expect(BaseProgression.getProficiencyBonus(2)).toBe(2);
      expect(BaseProgression.getProficiencyBonus(3)).toBe(2);
      expect(BaseProgression.getProficiencyBonus(4)).toBe(2);
      
      // Levels 5-8: +3
      expect(BaseProgression.getProficiencyBonus(5)).toBe(3);
      expect(BaseProgression.getProficiencyBonus(6)).toBe(3);
      expect(BaseProgression.getProficiencyBonus(7)).toBe(3);
      expect(BaseProgression.getProficiencyBonus(8)).toBe(3);
      
      // Levels 9-12: +4
      expect(BaseProgression.getProficiencyBonus(9)).toBe(4);
      expect(BaseProgression.getProficiencyBonus(10)).toBe(4);
      expect(BaseProgression.getProficiencyBonus(11)).toBe(4);
      expect(BaseProgression.getProficiencyBonus(12)).toBe(4);
      
      // Levels 13-16: +5
      expect(BaseProgression.getProficiencyBonus(13)).toBe(5);
      expect(BaseProgression.getProficiencyBonus(14)).toBe(5);
      expect(BaseProgression.getProficiencyBonus(15)).toBe(5);
      expect(BaseProgression.getProficiencyBonus(16)).toBe(5);
      
      // Levels 17-20: +6
      expect(BaseProgression.getProficiencyBonus(17)).toBe(6);
      expect(BaseProgression.getProficiencyBonus(18)).toBe(6);
      expect(BaseProgression.getProficiencyBonus(19)).toBe(6);
      expect(BaseProgression.getProficiencyBonus(20)).toBe(6);
    });

    test('should throw error for invalid levels', () => {
      expect(() => BaseProgression.getProficiencyBonus(0)).toThrow('Invalid level: 0');
      expect(() => BaseProgression.getProficiencyBonus(21)).toThrow('Invalid level: 21');
      expect(() => BaseProgression.getProficiencyBonus(-5)).toThrow('Invalid level: -5');
    });
  });

  describe('isASILevel', () => {
    test('should identify standard ASI levels', () => {
      expect(BaseProgression.isASILevel(4)).toBe(true);
      expect(BaseProgression.isASILevel(8)).toBe(true);
      expect(BaseProgression.isASILevel(12)).toBe(true);
      expect(BaseProgression.isASILevel(16)).toBe(true);
      expect(BaseProgression.isASILevel(19)).toBe(true);
      
      expect(BaseProgression.isASILevel(1)).toBe(false);
      expect(BaseProgression.isASILevel(5)).toBe(false);
      expect(BaseProgression.isASILevel(20)).toBe(false);
    });

    test('should identify fighter ASI levels', () => {
      expect(BaseProgression.isASILevel(4, 'fighter')).toBe(true);
      expect(BaseProgression.isASILevel(6, 'fighter')).toBe(true);
      expect(BaseProgression.isASILevel(8, 'fighter')).toBe(true);
      expect(BaseProgression.isASILevel(12, 'fighter')).toBe(true);
      expect(BaseProgression.isASILevel(14, 'fighter')).toBe(true);
      expect(BaseProgression.isASILevel(16, 'fighter')).toBe(true);
      expect(BaseProgression.isASILevel(19, 'fighter')).toBe(true);
      
      expect(BaseProgression.isASILevel(10, 'fighter')).toBe(false);
    });

    test('should identify rogue ASI levels', () => {
      expect(BaseProgression.isASILevel(4, 'rogue')).toBe(true);
      expect(BaseProgression.isASILevel(8, 'rogue')).toBe(true);
      expect(BaseProgression.isASILevel(10, 'rogue')).toBe(true);
      expect(BaseProgression.isASILevel(12, 'rogue')).toBe(true);
      expect(BaseProgression.isASILevel(16, 'rogue')).toBe(true);
      expect(BaseProgression.isASILevel(19, 'rogue')).toBe(true);
      
      expect(BaseProgression.isASILevel(6, 'rogue')).toBe(false);
      expect(BaseProgression.isASILevel(14, 'rogue')).toBe(false);
    });
  });

  describe('getASILevels', () => {
    test('should return ASI levels up to max level for standard classes', () => {
      expect(BaseProgression.getASILevels(10)).toEqual([4, 8]);
      expect(BaseProgression.getASILevels(20)).toEqual([4, 8, 12, 16, 19]);
    });

    test('should return ASI levels for fighter', () => {
      expect(BaseProgression.getASILevels(10, 'fighter')).toEqual([4, 6, 8]);
      expect(BaseProgression.getASILevels(20, 'fighter')).toEqual([4, 6, 8, 12, 14, 16, 19]);
    });

    test('should return ASI levels for rogue', () => {
      expect(BaseProgression.getASILevels(10, 'rogue')).toEqual([4, 8, 10]);
      expect(BaseProgression.getASILevels(20, 'rogue')).toEqual([4, 8, 10, 12, 16, 19]);
    });
  });

  describe('getCantripsKnown', () => {
    test('should return correct cantrip progression', () => {
      expect(BaseProgression.getCantripsKnown(1, 'wizard')).toBe(1);
      expect(BaseProgression.getCantripsKnown(3, 'wizard')).toBe(1);
      expect(BaseProgression.getCantripsKnown(4, 'wizard')).toBe(2);
      expect(BaseProgression.getCantripsKnown(9, 'wizard')).toBe(2);
      expect(BaseProgression.getCantripsKnown(10, 'wizard')).toBe(3);
      expect(BaseProgression.getCantripsKnown(16, 'wizard')).toBe(3);
      expect(BaseProgression.getCantripsKnown(17, 'wizard')).toBe(4);
      expect(BaseProgression.getCantripsKnown(20, 'wizard')).toBe(4);
    });
  });

  describe('getFullCasterSpellSlots', () => {
    test('should return correct spell slots for level 1', () => {
      const slots = BaseProgression.getFullCasterSpellSlots(1);
      expect(slots['first']).toBe(2);
      expect(slots['second']).toBeUndefined();
    });

    test('should return correct spell slots for level 5', () => {
      const slots = BaseProgression.getFullCasterSpellSlots(5);
      expect(slots['first']).toBe(4);
      expect(slots['second']).toBe(3);
      expect(slots['third']).toBe(2);
      expect(slots['fourth']).toBeUndefined();
    });

    test('should return correct spell slots for level 20', () => {
      const slots = BaseProgression.getFullCasterSpellSlots(20);
      expect(slots['first']).toBe(4);
      expect(slots['second']).toBe(3);
      expect(slots['third']).toBe(3);
      expect(slots['fourth']).toBe(3);
      expect(slots['fifth']).toBe(3);
      expect(slots['sixth']).toBe(2);
      expect(slots['seventh']).toBe(2);
      expect(slots['eighth']).toBe(1);
      expect(slots['ninth']).toBe(1);
    });
  });

  describe('getHalfCasterSpellSlots', () => {
    test('should return empty object for level 1', () => {
      const slots = BaseProgression.getHalfCasterSpellSlots(1);
      expect(Object.keys(slots)).toHaveLength(0);
    });

    test('should return correct spell slots for level 2 (caster level 1)', () => {
      const slots = BaseProgression.getHalfCasterSpellSlots(2);
      expect(slots['first']).toBe(2);
      expect(slots['second']).toBeUndefined();
    });

    test('should return correct spell slots for level 6 (caster level 3)', () => {
      const slots = BaseProgression.getHalfCasterSpellSlots(6);
      expect(slots['first']).toBe(4);
      expect(slots['second']).toBe(2);
      expect(slots['third']).toBeUndefined();
    });
  });

  describe('getThirdCasterSpellSlots', () => {
    test('should return empty object for levels 1-2', () => {
      expect(Object.keys(BaseProgression.getThirdCasterSpellSlots(1))).toHaveLength(0);
      expect(Object.keys(BaseProgression.getThirdCasterSpellSlots(2))).toHaveLength(0);
    });

    test('should return correct spell slots for level 3 (caster level 1)', () => {
      const slots = BaseProgression.getThirdCasterSpellSlots(3);
      expect(slots['first']).toBe(2);
      expect(slots['second']).toBeUndefined();
    });

    test('should return correct spell slots for level 9 (caster level 3)', () => {
      const slots = BaseProgression.getThirdCasterSpellSlots(9);
      expect(slots['first']).toBe(4);
      expect(slots['second']).toBe(2);
      expect(slots['third']).toBeUndefined();
    });
  });
});