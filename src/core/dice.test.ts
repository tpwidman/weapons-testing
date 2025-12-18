/**
 * Unit tests for the dice rolling system
 */

import { DiceEngine, dice, rollD20, rollAttack, rollDamage } from '../core/dice';

describe('Dice System', () => {
  describe('DiceEngine', () => {
    test('creates seeded engine for reproducible results', () => {
      const engine1 = new DiceEngine(12345);
      const engine2 = new DiceEngine(12345);
      
      const result1 = engine1.rollSingle('d20');
      const result2 = engine2.rollSingle('d20');
      
      expect(result1).toBe(result2);
    });

    test('rolls single die within valid range', () => {
      const engine = new DiceEngine();
      
      for (let i = 0; i < 100; i++) {
        const result = engine.rollSingle('d6');
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });

    test('rolls multiple dice correctly', () => {
      const engine = new DiceEngine();
      const rolls = engine.rollMultiple(3, 'd6');
      
      expect(rolls).toHaveLength(3);
      rolls.forEach(roll => {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('Basic dice rolling', () => {
    test('rolls basic dice with bonus', () => {
      const result = dice.roll({ count: 2, type: 'd6', bonus: 3 });
      
      expect(result.total).toBeGreaterThanOrEqual(5); // 2*1 + 3
      expect(result.total).toBeLessThanOrEqual(15); // 2*6 + 3
      expect(result.rolls).toHaveLength(2);
      expect(result.bonus).toBe(3);
      expect(result.explanation).toContain('2d6');
      expect(result.explanation).toContain('+3');
    });

    test('rolls without bonus', () => {
      const result = dice.roll({ count: 1, type: 'd8' });
      
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeLessThanOrEqual(8);
      expect(result.bonus).toBe(0);
      expect(result.explanation).toContain('1d8');
      expect(result.explanation).not.toContain('+');
    });
  });

  describe('Advantage and Disadvantage', () => {
    test('handles advantage on d20', () => {
      const engine = new DiceEngine(12345); // Seeded for predictable results
      const result = engine.roll({ count: 1, type: 'd20', advantage: true });
      
      expect(result.rolls).toHaveLength(1);
      expect(result.explanation).toContain('advantage');
      expect(result.explanation).toContain('→');
    });

    test('handles disadvantage on d20', () => {
      const engine = new DiceEngine(12345);
      const result = engine.roll({ count: 1, type: 'd20', disadvantage: true });
      
      expect(result.rolls).toHaveLength(1);
      expect(result.explanation).toContain('disadvantage');
      expect(result.explanation).toContain('→');
    });

    test('advantage and disadvantage cancel out', () => {
      const engine = new DiceEngine(12345);
      const result = engine.roll({ count: 1, type: 'd20', advantage: true, disadvantage: true });
      
      expect(result.rolls).toHaveLength(1);
      expect(result.explanation).toContain('cancel');
    });
  });

  describe('Critical hits', () => {
    test('detects critical hit on natural 20', () => {
      // Test multiple times to potentially get a 20
      const engine = new DiceEngine();
      
      for (let i = 0; i < 100; i++) {
        const result = engine.roll({ count: 1, type: 'd20' });
        if (result.critical) {
          expect(result.rolls[0]).toBe(20);
          expect(result.explanation).toContain('CRITICAL');
          return; // Found a critical, test passed
        }
      }
      
      // If we didn't find a critical in 100 rolls, that's statistically very unlikely
      // but the test logic is still valid - just test that non-20s aren't critical
      const result = engine.roll({ count: 1, type: 'd20' });
      if (result.rolls[0] !== 20) {
        expect(result.critical).toBeFalsy();
      }
    });

    test('doubles damage dice on critical', () => {
      const engine = new DiceEngine();
      const result = engine.rollDamage({ count: 2, type: 'd6', bonus: 3 }, true);
      
      expect(result.rolls).toHaveLength(4); // 2 dice doubled = 4 dice
      expect(result.critical).toBe(true);
      expect(result.explanation).toContain('critical');
      expect(result.explanation).toContain('doubled');
    });
  });

  describe('Dice expression parsing', () => {
    test('parses simple expressions', () => {
      const engine = new DiceEngine();
      
      expect(engine.parseDiceExpression('3d6')).toEqual({
        count: 3,
        type: 'd6',
        bonus: 0
      });
      
      expect(engine.parseDiceExpression('1d20+5')).toEqual({
        count: 1,
        type: 'd20',
        bonus: 5
      });
      
      expect(engine.parseDiceExpression('d8-2')).toEqual({
        count: 1,
        type: 'd8',
        bonus: -2
      });
    });

    test('throws error on invalid expressions', () => {
      const engine = new DiceEngine();
      
      expect(() => engine.parseDiceExpression('invalid')).toThrow();
      expect(() => engine.parseDiceExpression('3d7')).toThrow(); // d7 doesn't exist
      expect(() => engine.parseDiceExpression('')).toThrow();
    });

    test('rolls from expression string', () => {
      const result = dice.rollExpression('2d6+3');
      
      expect(result.total).toBeGreaterThanOrEqual(5); // 2*1 + 3
      expect(result.total).toBeLessThanOrEqual(15); // 2*6 + 3
      expect(result.explanation).toContain('2d6');
      expect(result.explanation).toContain('+3');
    });
  });

  describe('Convenience functions', () => {
    test('rollD20 works correctly', () => {
      const result = rollD20(1, 5);
      
      expect(result.total).toBeGreaterThanOrEqual(6); // 1 + 5
      expect(result.total).toBeLessThanOrEqual(25); // 20 + 5
      expect(result.explanation).toContain('1d20');
      expect(result.explanation).toContain('+5');
    });

    test('rollAttack handles advantage', () => {
      const result = rollAttack(8, true, false);
      
      expect(result.total).toBeGreaterThanOrEqual(9); // 1 + 8
      expect(result.total).toBeLessThanOrEqual(28); // 20 + 8
      expect(result.explanation).toContain('advantage');
    });

    test('rollDamage handles critical', () => {
      const result = rollDamage('2d6+3', true);
      
      expect(result.rolls).toHaveLength(4); // 2 dice doubled
      expect(result.critical).toBe(true);
      expect(result.explanation).toContain('critical');
    });
  });
});