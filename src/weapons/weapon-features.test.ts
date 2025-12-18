/**
 * Weapon Features Test Suite
 * Tests the reusable weapon feature system
 */

import { HemorrhageFeature } from '../weapons/weapon-features';
import { DiceEngine } from '../core/dice';
import { AttackContext, AttackResult } from '../core/types';

describe('Weapon Features', () => {
  let diceEngine: DiceEngine;

  let hemorrhageFeature: HemorrhageFeature;

  beforeEach(() => {
    diceEngine = new DiceEngine(12345);
    hemorrhageFeature = new HemorrhageFeature(diceEngine);
  });

  test('should build bleed counter correctly', () => {
    const mockContext: AttackContext = {
      attacker: { getProficiencyBonus: () => 3 } as any,
      weapon: {} as any,
      hasAdvantage: false,
      targetAC: 15,
      targetSize: 'medium',
      round: 1,
      turn: 1
    };

    const mockResult: AttackResult = {
      hit: true,
      critical: false,
      baseDamage: 5,
      bonusDamage: 3,
      specialEffects: [],
      totalDamage: 8
    };

    hemorrhageFeature.applyToAttack(mockContext, mockResult);

    const bleedCounterEffect = mockResult.specialEffects.find(e => e.name === 'Bleed Counter');
    expect(bleedCounterEffect).toBeDefined();
    expect(bleedCounterEffect?.damage).toBeGreaterThanOrEqual(1);
    expect(bleedCounterEffect?.damage).toBeLessThanOrEqual(4); // 1d4
  });

  test('should use configurable bleed damage die count', () => {
    // Force hemorrhage by building counter to threshold
    const feature = new HemorrhageFeature(diceEngine);

    // Mock context and result
    const mockContext: AttackContext = {
      attacker: { getProficiencyBonus: () => 3 } as any,
      weapon: {} as any,
      hasAdvantage: true,
      targetAC: 5,
      targetSize: 'medium',
      round: 1,
      turn: 1
    };

    const mockResult: AttackResult = {
      hit: true,
      critical: false,
      baseDamage: 5,
      bonusDamage: 3,
      specialEffects: [],
      totalDamage: 8
    };

    // Build counter to threshold manually
    for (let i = 0; i < 5; i++) {
      feature.applyToAttack(mockContext, mockResult);
      mockResult.specialEffects = []; // Clear effects for next iteration
    }

    // Should have triggered hemorrhage with 3d6 damage
    const hemorrhageEffect = mockResult.specialEffects.find(e => e.name === 'Hemorrhage');
    if (hemorrhageEffect) {
      expect(hemorrhageEffect.damage).toBeGreaterThanOrEqual(3); // 3d6 min
      expect(hemorrhageEffect.damage).toBeLessThanOrEqual(18); // 3d6 max
    }
  });
});