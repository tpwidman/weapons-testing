/**
 * Tests for the baseline weapon comparison system
 */

import { BaselineComparison, BaselineUtils } from '../simulation/baseline';
import { WeaponBuilder } from '../weapons/weapon';

describe('BaselineComparison', () => {
  let baselineComparison: BaselineComparison;

  beforeEach(() => {
    baselineComparison = new BaselineComparison();
  });

  describe('Baseline Templates', () => {
    test('creates standard baseline templates', () => {
      const templates = baselineComparison.getBaselineTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for expected baseline weapons
      const rapierPlus1 = templates.find(t => t.name === 'Baseline Rapier +1');
      expect(rapierPlus1).toBeDefined();
      expect(rapierPlus1?.magicalBonus).toBe(1);
      expect(rapierPlus1?.rarity).toBe('uncommon');
      expect(rapierPlus1?.levelRange.min).toBe(5);
      expect(rapierPlus1?.levelRange.max).toBe(7);
    });

    test('gets appropriate baselines for character level', () => {
      const level5Baselines = baselineComparison.getBaselinesForLevel(5);
      const level10Baselines = baselineComparison.getBaselinesForLevel(10);
      
      expect(level5Baselines.length).toBeGreaterThan(0);
      expect(level10Baselines.length).toBeGreaterThan(0);
      
      // Level 5 should include +1 weapons
      const hasPlus1 = level5Baselines.some(b => b.magicalBonus === 1);
      expect(hasPlus1).toBe(true);
      
      // Level 10 should include +2 weapons
      const hasPlus2 = level10Baselines.some(b => b.magicalBonus === 2);
      expect(hasPlus2).toBe(true);
    });

    test('creates baseline weapons from templates', () => {
      const templates = baselineComparison.getBaselinesForLevel(5);
      const weapons = baselineComparison.createBaselineWeapons(templates);
      
      expect(weapons.length).toBe(templates.length);
      
      const firstWeapon = weapons[0];
      const firstTemplate = templates[0];
      expect(firstWeapon).toBeDefined();
      expect(firstTemplate).toBeDefined();
      expect(firstWeapon!.getName()).toBe(firstTemplate!.name);
      expect(firstWeapon!.getMagicalBonus()).toBe(firstTemplate!.magicalBonus);
    });
  });

  describe('Weapon Comparison', () => {
    test('creates baseline weapon definitions for export', () => {
      const definitions = baselineComparison.exportBaselineDefinitions();
      
      expect(Object.keys(definitions).length).toBeGreaterThan(0);
      
      // Check that filenames are properly formatted
      const filenames = Object.keys(definitions);
      expect(filenames.every(name => name.endsWith('.json'))).toBe(true);
      expect(filenames.every(name => name.includes('baseline'))).toBe(true);
    });

    test('adds custom baseline template', () => {
      const initialCount = baselineComparison.getBaselineTemplates().length;
      
      baselineComparison.addBaselineTemplate({
        name: 'Custom Test Weapon +1',
        magicalBonus: 1,
        rarity: 'uncommon',
        baseDamage: '1d6',
        damageType: 'slashing',
        properties: ['finesse'],
        levelRange: { min: 5, max: 7 }
      });
      
      const newCount = baselineComparison.getBaselineTemplates().length;
      expect(newCount).toBe(initialCount + 1);
      
      const customTemplate = baselineComparison.getBaselineTemplates()
        .find(t => t.name === 'Custom Test Weapon +1');
      expect(customTemplate).toBeDefined();
    });
  });

  describe('Comparison Report Generation', () => {
    test('generates comparison report from empty comparisons', () => {
      const report = baselineComparison.generateComparisonReport([]);
      
      expect(report.baselineWeapons).toEqual([]);
      expect(report.weaponComparisons).toEqual([]);
      expect(report.overallRankings).toEqual([]);
      expect(report.summary.balancedWeapons).toEqual([]);
      expect(report.summary.overpoweredWeapons).toEqual([]);
      expect(report.summary.underpoweredWeapons).toEqual([]);
      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('BaselineUtils', () => {
    test('formats empty comparison report', () => {
      const report = baselineComparison.generateComparisonReport([]);
      const formatted = BaselineUtils.formatComparisonReport(report);
      
      expect(formatted).toContain('WEAPON BASELINE COMPARISON REPORT');
      expect(formatted).toContain('Generated:');
      expect(formatted).toContain('OVERALL WEAPON RANKINGS');
      expect(formatted).toContain('SUMMARY');
    });

    test('exports empty comparison as CSV', () => {
      const report = baselineComparison.generateComparisonReport([]);
      const csv = BaselineUtils.exportComparisonCSV(report);
      
      // Should have headers even with no data
      expect(csv).toContain('Weapon_Name');
      expect(csv).toContain('Baseline_Name');
      expect(csv).toContain('Damage_Percentage_Difference');
    });
  });

  describe('WeaponBuilder baseline creation', () => {
    test('creates baseline weapons using WeaponBuilder', () => {
      const baseline = WeaponBuilder.createBaseline(
        'Test Baseline +1',
        '1d8',
        1,
        'slashing'
      );
      
      expect(baseline.getName()).toBe('Test Baseline +1');
      expect(baseline.getDisplayName()).toBe('Test Baseline +1 +1');
      expect(baseline.getMagicalBonus()).toBe(1);
      expect(baseline.getBaseDamage()).toBe('1d8');
      expect(baseline.getDamageType()).toBe('slashing');
      expect(baseline.getRarity()).toBe('uncommon');
    });

    test('creates baseline weapons with different magical bonuses', () => {
      const baseline0 = WeaponBuilder.createBaseline('Test +0', '1d8', 0);
      const baseline2 = WeaponBuilder.createBaseline('Test +2', '1d8', 2);
      const baseline3 = WeaponBuilder.createBaseline('Test +3', '1d8', 3);
      
      expect(baseline0.getRarity()).toBe('common');
      expect(baseline2.getRarity()).toBe('rare');
      expect(baseline3.getRarity()).toBe('very-rare');
    });
  });
});