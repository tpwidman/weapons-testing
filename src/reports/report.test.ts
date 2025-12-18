/**
 * Tests for the ReportGenerator class
 */

import { ReportGenerator, ReportUtils } from '../reports/report';
import { SimulationResult } from '../simulation/simulation';
import { CombatScenario } from '../combat/combat';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let mockSimulationResult: SimulationResult;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
    
    // Create a mock simulation result
    mockSimulationResult = {
      characterName: 'Test Rogue',
      weaponName: 'Test Weapon',
      scenario: {
        rounds: 10,
        targetAC: 15,
        targetSize: 'medium',
        advantageRate: 0.3,
        attacksPerRound: 1
      } as CombatScenario,
      iterations: 1000,
      seed: 12345,
      analysis: {
        damageStats: {
          mean: 25.5,
          median: 24.0,
          standardDeviation: 8.2,
          min: 8,
          max: 48,
          percentiles: {
            p25: 19.5,
            p50: 24.0,
            p75: 31.2,
            p90: 36.8,
            p95: 40.1,
            p99: 45.2
          },
          variance: 67.24,
          coefficientOfVariation: 0.32,
          range: 40,
          interquartileRange: 11.7
        },
        hemorrhageStats: {
          triggerFrequency: 1.2,
          averageTurnsToTrigger: 4.5,
          triggerRate: 0.75,
          averageDamagePerTrigger: 12.3,
          totalHemorrhageDamage: 1476,
          maxTriggersInSingleCombat: 4,
          triggerDistribution: new Map([[0, 250], [1, 400], [2, 300], [3, 50]])
        },
        consistencyMetrics: {
          coefficientOfVariation: 0.32,
          relativeStandardDeviation: 32.0,
          consistencyRating: 'moderate',
          outlierCount: 15,
          outlierPercentage: 1.5,
          stabilityIndex: 0.76
        },
        sampleSize: 1000,
        analysisTimestamp: new Date('2024-01-01T12:00:00Z')
      },
      comparison: {
        baselineWeapon: 'Baseline Rapier +1',
        damagePercentageDifference: 12.5,
        consistencyComparison: 0.95,
        hemorrhageAdvantage: 8.2,
        balanceRating: 'balanced',
        confidenceInterval: {
          lower: 10.2,
          upper: 14.8
        }
      },
      rawResults: [], // Empty for testing
      timestamp: new Date('2024-01-01T12:00:00Z')
    };
  });

  describe('generateReport', () => {
    test('should generate a complete report with all sections', () => {
      const report = reportGenerator.generateReport([mockSimulationResult]);
      
      expect(report.title).toContain('Test Weapon');
      expect(report.title).toContain('Test Rogue');
      expect(report.summary).toContain('EXECUTIVE SUMMARY');
      expect(report.detailedAnalysis).toContain('DETAILED ANALYSIS');
      expect(report.recommendations).toContain('RECOMMENDATIONS');
    });

    test('should include user-friendly percentile explanations', () => {
      const report = reportGenerator.generateReport([mockSimulationResult]);
      
      expect(report.detailedAnalysis).toContain('25% of combats below this damage');
      expect(report.detailedAnalysis).toContain('90% of combats below this damage');
      expect(report.detailedAnalysis).toContain('99% of combats below this damage');
    });

    test('should include consistency explanations', () => {
      const report = reportGenerator.generateReport([mockSimulationResult]);
      
      expect(report.detailedAnalysis).toContain('how predictable your damage is');
      expect(report.detailedAnalysis).toContain('lower is more consistent');
      expect(report.detailedAnalysis).toContain('higher means more reliable');
    });

    test('should include stats guide', () => {
      const report = reportGenerator.generateReport([mockSimulationResult]);
      
      expect(report.detailedAnalysis).toContain('Quick Stats Guide');
      expect(report.detailedAnalysis).toContain('Mean = Average damage you can expect');
      expect(report.detailedAnalysis).toContain('Percentiles = What % of your damage rolls');
    });
  });

  describe('exportAsJSON', () => {
    test('should export valid JSON with metadata', () => {
      const jsonString = reportGenerator.exportAsJSON([mockSimulationResult]);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.totalSimulations).toBe(1);
      expect(parsed.metadata.totalIterations).toBe(1000);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].weaponName).toBe('Test Weapon');
    });
  });

  describe('exportAsCSV', () => {
    test('should export valid CSV with headers', () => {
      const csvString = reportGenerator.exportAsCSV([mockSimulationResult]);
      const lines = csvString.split('\n');
      
      expect(lines[0]).toContain('Character,Weapon,Scenario_Rounds');
      expect(lines[1]).toContain('Test Rogue,Test Weapon,10');
      expect(lines[1]).toContain('25.50'); // Mean damage
      expect(lines[1]).toContain('0.7500'); // Hemorrhage trigger rate
    });

    test('should handle empty results', () => {
      const csvString = reportGenerator.exportAsCSV([]);
      expect(csvString).toBe('');
    });
  });

  describe('generateBalanceRecommendations', () => {
    test('should generate recommendations for overpowered weapons', () => {
      // Create an overpowered weapon result
      const overpoweredResult = {
        ...mockSimulationResult,
        comparison: {
          ...mockSimulationResult.comparison!,
          damagePercentageDifference: 35.0, // Significantly overpowered
          balanceRating: 'overpowered' as const
        }
      };

      const recommendations = reportGenerator.generateBalanceRecommendations([overpoweredResult]);
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]?.severity).toBe('critical');
      expect(recommendations[0]?.category).toBe('damage');
      expect(recommendations[0]?.recommendation).toContain('Reduce base damage');
    });

    test('should generate recommendations for inconsistent weapons', () => {
      // Create a highly inconsistent weapon result
      const inconsistentResult = {
        ...mockSimulationResult,
        analysis: {
          ...mockSimulationResult.analysis,
          consistencyMetrics: {
            ...mockSimulationResult.analysis.consistencyMetrics,
            coefficientOfVariation: 0.6, // Very inconsistent
            consistencyRating: 'very-inconsistent' as const
          }
        }
      };

      const recommendations = reportGenerator.generateBalanceRecommendations([inconsistentResult]);
      
      expect(recommendations.length).toBeGreaterThan(0);
      const consistencyRec = recommendations.find(r => r.category === 'consistency');
      expect(consistencyRec).toBeDefined();
      expect(consistencyRec?.recommendation).toContain('Reduce damage variance');
    });
  });

  describe('displayToConsole', () => {
    test('should display report without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const report = reportGenerator.generateReport([mockSimulationResult]);
      reportGenerator.displayToConsole(report);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('configuration', () => {
    test('should use default configuration', () => {
      const config = reportGenerator.getConfig();
      expect(config.includeRawData).toBe(false);
      expect(config.colorOutput).toBe(true);
      expect(config.highlightThresholds.significantDifference).toBe(15);
    });

    test('should allow configuration updates', () => {
      reportGenerator.updateConfig({ includeRawData: true, colorOutput: false });
      const config = reportGenerator.getConfig();
      
      expect(config.includeRawData).toBe(true);
      expect(config.colorOutput).toBe(false);
    });
  });
});

describe('ReportUtils', () => {
  describe('quickSummary', () => {
    test('should generate a concise summary', () => {
      const mockResult = {
        weaponName: 'Test Weapon',
        characterName: 'Test Character',
        analysis: {
          damageStats: { mean: 25.5, standardDeviation: 8.2 },
          consistencyMetrics: { consistencyRating: 'moderate' },
          hemorrhageStats: { triggerRate: 0.75 }
        },
        comparison: {
          damagePercentageDifference: 12.5,
          balanceRating: 'balanced'
        }
      } as any;

      const summary = ReportUtils.quickSummary(mockResult);
      
      expect(summary).toContain('Test Weapon with Test Character');
      expect(summary).toContain('25.5');
      expect(summary).toContain('moderate');
      expect(summary).toContain('75.0%');
      expect(summary).toContain('12.5%');
    });
  });

  describe('formatNumber', () => {
    test('should format large numbers correctly', () => {
      expect(ReportUtils.formatNumber(1500000)).toBe('1.5M');
      expect(ReportUtils.formatNumber(2500)).toBe('2.5K');
      expect(ReportUtils.formatNumber(500)).toBe('500');
    });
  });

  describe('explainPercentile', () => {
    test('should provide clear percentile explanations', () => {
      const explanation = ReportUtils.explainPercentile(90, 36.8);
      expect(explanation).toBe('90% of damage results were 36.8 or lower');
    });
  });

  describe('interpretPercentiles', () => {
    test('should provide user-friendly percentile interpretation', () => {
      const percentiles = {
        p25: 19.5,
        p50: 24.0,
        p75: 31.2,
        p90: 36.8,
        p95: 40.1,
        p99: 45.2
      };

      const interpretation = ReportUtils.interpretPercentiles(percentiles);
      
      expect(interpretation).toContain('bad luck');
      expect(interpretation).toContain('good luck');
      expect(interpretation).toContain('Exceptional damage');
      expect(interpretation).toContain('19.5');
      expect(interpretation).toContain('45.2');
    });
  });
});