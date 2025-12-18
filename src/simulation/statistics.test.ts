/**
 * Tests for the StatisticalAnalyzer class
 */

import { StatisticalAnalyzer } from '../simulation/statistics';
import { CombatResult, CombatScenario, RoundResult } from '../combat/combat';
import { AttackResult } from '../core/types';

describe('StatisticalAnalyzer', () => {
  let analyzer: StatisticalAnalyzer;
  let mockScenario: CombatScenario;

  beforeEach(() => {
    analyzer = new StatisticalAnalyzer();
    mockScenario = {
      rounds: 10,
      targetAC: 15,
      targetSize: 'medium',
      advantageRate: 0.3,
      attacksPerRound: 1
    };
  });

  describe('analyze', () => {
    test('throws error for empty result set', () => {
      expect(() => analyzer.analyze([])).toThrow('Cannot analyze empty result set');
    });

    test('analyzes basic damage statistics correctly', () => {
      const results = createMockCombatResults([10, 20, 30, 40, 50], mockScenario);
      
      const analysis = analyzer.analyze(results);

      expect(analysis.damageStats.mean).toBe(30);
      expect(analysis.damageStats.median).toBe(30);
      expect(analysis.damageStats.min).toBe(10);
      expect(analysis.damageStats.max).toBe(50);
      expect(analysis.damageStats.range).toBe(40);
      expect(analysis.sampleSize).toBe(5);
      expect(analysis.analysisTimestamp).toBeInstanceOf(Date);
    });

    test('calculates percentiles correctly', () => {
      const damages = Array.from({ length: 100 }, (_, i) => i + 1); // 1 to 100
      const results = createMockCombatResults(damages, mockScenario);
      
      const analysis = analyzer.analyze(results);

      expect(analysis.damageStats.percentiles.p25).toBeCloseTo(25.75, 1);
      expect(analysis.damageStats.percentiles.p50).toBeCloseTo(50.5, 1);
      expect(analysis.damageStats.percentiles.p75).toBeCloseTo(75.25, 1);
      expect(analysis.damageStats.percentiles.p90).toBeCloseTo(90.1, 1);
      expect(analysis.damageStats.percentiles.p95).toBeCloseTo(95.05, 1);
      expect(analysis.damageStats.percentiles.p99).toBeCloseTo(99.01, 1);
    });

    test('calculates variance and standard deviation correctly', () => {
      const results = createMockCombatResults([2, 4, 4, 4, 5, 5, 7, 9], mockScenario);
      
      const analysis = analyzer.analyze(results);

      expect(analysis.damageStats.mean).toBe(5);
      expect(analysis.damageStats.variance).toBe(4);
      expect(analysis.damageStats.standardDeviation).toBe(2);
      expect(analysis.damageStats.coefficientOfVariation).toBe(0.4);
    });

    test('calculates consistency metrics correctly', () => {
      // Very consistent data (low CV)
      const consistentResults = createMockCombatResults([49, 50, 50, 50, 51], mockScenario);
      const consistentAnalysis = analyzer.analyze(consistentResults);

      expect(consistentAnalysis.consistencyMetrics.consistencyRating).toBe('very-consistent');
      expect(consistentAnalysis.consistencyMetrics.stabilityIndex).toBeGreaterThan(0.9);

      // Very inconsistent data (high CV)
      const inconsistentResults = createMockCombatResults([1, 50, 100], mockScenario);
      const inconsistentAnalysis = analyzer.analyze(inconsistentResults);

      expect(inconsistentAnalysis.consistencyMetrics.consistencyRating).toBe('very-inconsistent');
      expect(inconsistentAnalysis.consistencyMetrics.stabilityIndex).toBeLessThan(0.6);
    });

    test('identifies outliers correctly', () => {
      // Data with outliers: mean=10, stddev≈3.16, so values >16.32 or <3.68 are outliers
      const results = createMockCombatResults([10, 10, 10, 10, 10, 25], mockScenario);
      
      const analysis = analyzer.analyze(results);

      expect(analysis.consistencyMetrics.outlierCount).toBe(1);
      expect(analysis.consistencyMetrics.outlierPercentage).toBeCloseTo(16.67, 1);
    });

    test('returns null hemorrhage stats when no hemorrhage present', () => {
      const results = createMockCombatResults([10, 20, 30], mockScenario, false);
      
      const analysis = analyzer.analyze(results);

      expect(analysis.hemorrhageStats).toBeNull();
    });

    test('calculates hemorrhage statistics when present', () => {
      const results = createMockCombatResultsWithHemorrhage([
        { damage: 20, specialMechanicTriggers: 1, hemorrhageDamage: 15 },
        { damage: 30, specialMechanicTriggers: 2, hemorrhageDamage: 12 },
        { damage: 25, specialMechanicTriggers: 0, hemorrhageDamage: 0 }
      ], mockScenario);
      
      const analysis = analyzer.analyze(results);

      expect(analysis.hemorrhageStats).not.toBeNull();
      if (analysis.hemorrhageStats) {
        expect(analysis.hemorrhageStats.triggerFrequency).toBe(1); // 3 triggers / 3 combats
        expect(analysis.hemorrhageStats.triggerRate).toBeCloseTo(0.67, 2); // 2 of 3 combats had triggers
        expect(analysis.hemorrhageStats.maxTriggersInSingleCombat).toBe(2);
        expect(analysis.hemorrhageStats.averageDamagePerTrigger).toBeCloseTo(9, 1); // (15+12+12)/3
      }
    });

    test('calculates average turns to trigger correctly', () => {
      const results = createMockCombatResultsWithTurnsToTrigger([
        { damage: 20, turnsToFirstTrigger: 3 },
        { damage: 30, turnsToFirstTrigger: 5 },
        { damage: 25, turnsToFirstTrigger: null } // No trigger
      ], mockScenario);
      
      const analysis = analyzer.analyze(results);

      expect(analysis.hemorrhageStats).not.toBeNull();
      if (analysis.hemorrhageStats) {
        expect(analysis.hemorrhageStats.averageTurnsToTrigger).toBe(4); // (3+5)/2
      }
    });
  });

  describe('compare', () => {
    test('compares two analyses correctly', () => {
      const analysis1 = analyzer.analyze(createMockCombatResults([40, 50, 60], mockScenario));
      const analysis2 = analyzer.analyze(createMockCombatResults([30, 40, 50], mockScenario));
      
      const comparison = StatisticalAnalyzer.compare(analysis1, analysis2);

      expect(comparison.damageComparison.meanDifference).toBe(10); // 50 - 40
      expect(comparison.damageComparison.meanPercentageDifference).toBe(25); // (50-40)/40 * 100
      expect(comparison.overallAssessment).toBe('significantly-better'); // 25% is > 15%
    });

    test('assesses overall comparison correctly', () => {
      const baseAnalysis = analyzer.analyze(createMockCombatResults([40, 40, 40], mockScenario));
      
      // Similar performance (< 5% difference)
      const similarAnalysis = analyzer.analyze(createMockCombatResults([41, 41, 41], mockScenario));
      const similarComparison = StatisticalAnalyzer.compare(similarAnalysis, baseAnalysis);
      expect(similarComparison.overallAssessment).toBe('similar');

      // Better performance (5-15% difference)
      const betterAnalysis = analyzer.analyze(createMockCombatResults([45, 45, 45], mockScenario));
      const betterComparison = StatisticalAnalyzer.compare(betterAnalysis, baseAnalysis);
      expect(betterComparison.overallAssessment).toBe('better');

      // Significantly better (>15% difference)
      const muchBetterAnalysis = analyzer.analyze(createMockCombatResults([50, 50, 50], mockScenario));
      const muchBetterComparison = StatisticalAnalyzer.compare(muchBetterAnalysis, baseAnalysis);
      expect(muchBetterComparison.overallAssessment).toBe('significantly-better');

      // Worse performance
      const worseAnalysis = analyzer.analyze(createMockCombatResults([35, 35, 35], mockScenario));
      const worseComparison = StatisticalAnalyzer.compare(worseAnalysis, baseAnalysis);
      expect(worseComparison.overallAssessment).toBe('worse'); // 35 vs 40 is 12.5% worse
    });
  });

  describe('generateSummaryReport', () => {
    test('generates comprehensive summary report', () => {
      const results = createMockCombatResultsWithHemorrhage([
        { damage: 20, specialMechanicTriggers: 1, hemorrhageDamage: 15 },
        { damage: 30, specialMechanicTriggers: 0, hemorrhageDamage: 0 },
        { damage: 25, specialMechanicTriggers: 1, hemorrhageDamage: 12 }
      ], mockScenario);
      
      const analysis = analyzer.analyze(results);
      const report = StatisticalAnalyzer.generateSummaryReport(analysis);

      expect(report).toContain('STATISTICAL ANALYSIS SUMMARY');
      expect(report).toContain('Sample Size: 3');
      expect(report).toContain('DAMAGE STATISTICS');
      expect(report).toContain('Mean Damage: 25.00');
      expect(report).toContain('CONSISTENCY METRICS');
      expect(report).toContain('HEMORRHAGE STATISTICS');
      expect(report).toContain('Trigger Frequency:');
    });

    test('generates report without hemorrhage section when not applicable', () => {
      const results = createMockCombatResults([20, 30, 25], mockScenario, false);
      
      const analysis = analyzer.analyze(results);
      const report = StatisticalAnalyzer.generateSummaryReport(analysis);

      expect(report).toContain('STATISTICAL ANALYSIS SUMMARY');
      expect(report).toContain('DAMAGE STATISTICS');
      expect(report).toContain('CONSISTENCY METRICS');
      expect(report).not.toContain('HEMORRHAGE STATISTICS');
    });
  });
});

// Helper functions for creating mock data

function createMockCombatResults(damages: number[], scenario: CombatScenario, includeHemorrhage: boolean = false): CombatResult[] {
  return damages.map((damage, index) => ({
    character: 'Test Character',
    weapon: 'Test Weapon',
    scenario,
    rounds: createMockRounds(damage, scenario.rounds, includeHemorrhage),
    totalDamage: damage,
    averageDamagePerRound: damage / scenario.rounds,
    specialMechanicTriggers: includeHemorrhage ? (index % 2) : 0, // Alternate hemorrhage triggers
    totalTempHP: 0,
    hitRate: 0.8,
    criticalRate: 0.05,
    totalWastedDamage: 0,
    missStreaks: [],
    targetSwitches: 0,
    advantageStrategy: {
      totalRounds: scenario.rounds,
      rate: scenario.advantageRate,
      advantageRounds: [],
      advantageCount: 0
    }
  }));
}

function createMockCombatResultsWithHemorrhage(
  configs: Array<{ damage: number; specialMechanicTriggers: number; hemorrhageDamage: number }>,
  scenario: CombatScenario
): CombatResult[] {
  return configs.map(config => ({
    character: 'Test Character',
    weapon: 'Test Weapon',
    scenario,
    rounds: createMockRoundsWithHemorrhage(config.damage, config.specialMechanicTriggers, config.hemorrhageDamage, scenario.rounds),
    totalDamage: config.damage,
    averageDamagePerRound: config.damage / scenario.rounds,
    specialMechanicTriggers: config.specialMechanicTriggers,
    totalTempHP: 0,
    hitRate: 0.8,
    criticalRate: 0.05,
    totalWastedDamage: 0,
    missStreaks: [],
    targetSwitches: 0,
    advantageStrategy: {
      totalRounds: scenario.rounds,
      rate: scenario.advantageRate,
      advantageRounds: [],
      advantageCount: 0
    }
  }));
}

function createMockCombatResultsWithTurnsToTrigger(
  configs: Array<{ damage: number; turnsToFirstTrigger: number | null }>,
  scenario: CombatScenario
): CombatResult[] {
  return configs.map(config => ({
    character: 'Test Character',
    weapon: 'Test Weapon',
    scenario,
    rounds: createMockRoundsWithTriggerTiming(config.damage, config.turnsToFirstTrigger, scenario.rounds),
    totalDamage: config.damage,
    averageDamagePerRound: config.damage / scenario.rounds,
    specialMechanicTriggers: config.turnsToFirstTrigger ? 1 : 0,
    totalTempHP: 0,
    hitRate: 0.8,
    criticalRate: 0.05,
    totalWastedDamage: 0,
    missStreaks: [],
    targetSwitches: 0,
    advantageStrategy: {
      totalRounds: scenario.rounds,
      rate: scenario.advantageRate,
      advantageRounds: [],
      advantageCount: 0
    }
  }));
}

function createMockRounds(totalDamage: number, roundCount: number, includeHemorrhage: boolean): RoundResult[] {
  const damagePerRound = totalDamage / roundCount;
  
  return Array.from({ length: roundCount }, (_, index) => ({
    round: index + 1,
    attacks: [createMockAttack(damagePerRound, includeHemorrhage && index === 0)],
    totalDamage: damagePerRound,
    specialMechanicsTriggered: includeHemorrhage && index === 0,
    tempHPGained: 0
  }));
}

function createMockRoundsWithHemorrhage(
  totalDamage: number, 
  specialMechanicTriggers: number, 
  hemorrhageDamage: number, 
  roundCount: number
): RoundResult[] {
  const damagePerRound = totalDamage / roundCount;
  
  return Array.from({ length: roundCount }, (_, index) => {
    const hasHemorrhage = index < specialMechanicTriggers;
    const hemorrhageDamageThisRound = hasHemorrhage ? hemorrhageDamage / specialMechanicTriggers : 0;
    
    return {
      round: index + 1,
      attacks: [createMockAttack(damagePerRound, hasHemorrhage, hemorrhageDamageThisRound)],
      totalDamage: damagePerRound,
      specialMechanicsTriggered: hasHemorrhage,
      tempHPGained: 0
    };
  });
}

function createMockRoundsWithTriggerTiming(
  totalDamage: number, 
  turnsToFirstTrigger: number | null, 
  roundCount: number
): RoundResult[] {
  const damagePerRound = totalDamage / roundCount;
  
  return Array.from({ length: roundCount }, (_, index) => {
    const roundNumber = index + 1;
    const hasHemorrhage = turnsToFirstTrigger !== null && roundNumber === turnsToFirstTrigger;
    
    return {
      round: roundNumber,
      attacks: [createMockAttack(damagePerRound, hasHemorrhage)],
      totalDamage: damagePerRound,
      specialMechanicsTriggered: hasHemorrhage,
      tempHPGained: 0
    };
  });
}

function createMockAttack(damage: number, hemorrhageTriggered: boolean = false, hemorrhageDamage: number = 0): AttackResult {
  return {
    hit: true,
    critical: false,
    baseDamage: damage,
    bonusDamage: 0,
    specialEffects: [],
    totalDamage: damage,
    hemorrhageTriggered,
    hemorrhageDamage,
    tempHPGained: 0
  };
}