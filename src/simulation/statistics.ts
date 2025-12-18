/**
 * Statistical analysis system for weapon damage simulation results
 * Provides comprehensive statistical metrics and hemorrhage frequency tracking
 */

import { CombatResult } from '../combat/combat';

/**
 * Comprehensive damage statistics with all required metrics
 */
export interface DamageStatistics {
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  percentiles: {
    p25: number;
    p50: number; // median
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  variance: number;
  coefficientOfVariation: number;
  range: number;
  interquartileRange: number;
}

/**
 * Hemorrhage-specific statistics tracking
 */
export interface HemorrhageStatistics {
  triggerFrequency: number; // triggers per combat
  averageTurnsToTrigger: number;
  triggerRate: number; // percentage of combats with at least one trigger
  averageDamagePerTrigger: number;
  totalHemorrhageDamage: number;
  maxTriggersInSingleCombat: number;
  triggerDistribution: Map<number, number>; // number of triggers -> frequency
}

/**
 * Consistency and variance measurements
 */
export interface ConsistencyMetrics {
  coefficientOfVariation: number;
  relativeStandardDeviation: number;
  consistencyRating: 'very-consistent' | 'consistent' | 'moderate' | 'inconsistent' | 'very-inconsistent';
  outlierCount: number;
  outlierPercentage: number;
  stabilityIndex: number; // 0-1, higher is more stable
}

/**
 * Complete statistical analysis result
 */
export interface StatisticalAnalysis {
  damageStats: DamageStatistics;
  hemorrhageStats: HemorrhageStatistics | null;
  consistencyMetrics: ConsistencyMetrics;
  sampleSize: number;
  analysisTimestamp: Date;
}

/**
 * Core statistical analyzer for simulation results
 */
export class StatisticalAnalyzer {
  
  /**
   * Analyze a collection of combat results and produce comprehensive statistics
   */
  analyze(results: CombatResult[]): StatisticalAnalysis {
    if (results.length === 0) {
      throw new Error('Cannot analyze empty result set');
    }

    const damageValues = results.map(result => result.totalDamage);
    
    const damageStats = this.calculateDamageStatistics(damageValues);
    const hemorrhageStats = this.calculateHemorrhageStatistics(results);
    const consistencyMetrics = this.calculateConsistencyMetrics(damageValues);

    return {
      damageStats,
      hemorrhageStats,
      consistencyMetrics,
      sampleSize: results.length,
      analysisTimestamp: new Date()
    };
  }

  /**
   * Calculate comprehensive damage statistics
   */
  private calculateDamageStatistics(damages: number[]): DamageStatistics {
    const sortedDamages = [...damages].sort((a, b) => a - b);
    const n = sortedDamages.length;

    // Basic statistics
    const min = sortedDamages[0] ?? 0;
    const max = sortedDamages[n - 1] ?? 0;
    const mean = damages.reduce((sum, damage) => sum + damage, 0) / n;
    const median = this.calculatePercentile(sortedDamages, 0.5);

    // Variance and standard deviation
    const variance = damages.reduce((sum, damage) => sum + Math.pow(damage - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;

    // Percentiles
    const percentiles = {
      p25: this.calculatePercentile(sortedDamages, 0.25),
      p50: median,
      p75: this.calculatePercentile(sortedDamages, 0.75),
      p90: this.calculatePercentile(sortedDamages, 0.90),
      p95: this.calculatePercentile(sortedDamages, 0.95),
      p99: this.calculatePercentile(sortedDamages, 0.99)
    };

    // Additional metrics
    const range = max - min;
    const interquartileRange = percentiles.p75 - percentiles.p25;

    return {
      mean,
      median,
      standardDeviation,
      min,
      max,
      percentiles,
      variance,
      coefficientOfVariation,
      range,
      interquartileRange
    };
  }

  /**
   * Calculate hemorrhage-specific statistics
   */
  private calculateHemorrhageStatistics(results: CombatResult[]): HemorrhageStatistics | null {
    // Check if any results have hemorrhage mechanics
    const hasHemorrhage = results.some(result => result.hemorrhageTriggers > 0);
    if (!hasHemorrhage) {
      return null;
    }

    const totalTriggers = results.reduce((sum, result) => sum + result.hemorrhageTriggers, 0);
    const combatsWithTriggers = results.filter(result => result.hemorrhageTriggers > 0).length;
    
    // Calculate trigger frequency (triggers per combat)
    const triggerFrequency = totalTriggers / results.length;
    
    // Calculate trigger rate (percentage of combats with at least one trigger)
    const triggerRate = combatsWithTriggers / results.length;

    // Calculate average turns to trigger
    const turnsToTrigger = this.calculateAverageTurnsToTrigger(results);
    
    // Calculate hemorrhage damage statistics
    const hemorrhageDamageStats = this.calculateHemorrhageDamageStats(results);
    
    // Calculate trigger distribution
    const triggerDistribution = this.calculateTriggerDistribution(results);
    
    // Find maximum triggers in a single combat
    const maxTriggersInSingleCombat = Math.max(...results.map(result => result.hemorrhageTriggers));

    return {
      triggerFrequency,
      averageTurnsToTrigger: turnsToTrigger,
      triggerRate,
      averageDamagePerTrigger: hemorrhageDamageStats.averagePerTrigger,
      totalHemorrhageDamage: hemorrhageDamageStats.total,
      maxTriggersInSingleCombat,
      triggerDistribution
    };
  }

  /**
   * Calculate consistency and variance measurements
   */
  private calculateConsistencyMetrics(damages: number[]): ConsistencyMetrics {
    const mean = damages.reduce((sum, damage) => sum + damage, 0) / damages.length;
    const variance = damages.reduce((sum, damage) => sum + Math.pow(damage - mean, 2), 0) / damages.length;
    const standardDeviation = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    const relativeStandardDeviation = coefficientOfVariation * 100;

    // Determine consistency rating based on coefficient of variation
    let consistencyRating: ConsistencyMetrics['consistencyRating'];
    if (coefficientOfVariation < 0.1) {
      consistencyRating = 'very-consistent';
    } else if (coefficientOfVariation < 0.2) {
      consistencyRating = 'consistent';
    } else if (coefficientOfVariation < 0.4) {
      consistencyRating = 'moderate';
    } else if (coefficientOfVariation < 0.6) {
      consistencyRating = 'inconsistent';
    } else {
      consistencyRating = 'very-inconsistent';
    }

    // Calculate outliers (values more than 2 standard deviations from mean)
    const outliers = damages.filter(damage => 
      Math.abs(damage - mean) > 2 * standardDeviation
    );
    const outlierCount = outliers.length;
    const outlierPercentage = (outlierCount / damages.length) * 100;

    // Calculate stability index (inverse of coefficient of variation, capped at 1)
    const stabilityIndex = Math.min(1, 1 / (1 + coefficientOfVariation));

    return {
      coefficientOfVariation,
      relativeStandardDeviation,
      consistencyRating,
      outlierCount,
      outlierPercentage,
      stabilityIndex
    };
  }

  /**
   * Calculate average turns to first hemorrhage trigger
   */
  private calculateAverageTurnsToTrigger(results: CombatResult[]): number {
    const turnsToFirstTrigger: number[] = [];

    for (const result of results) {
      let foundFirstTrigger = false;
      
      for (let roundIndex = 0; roundIndex < result.rounds.length && !foundFirstTrigger; roundIndex++) {
        const round = result.rounds[roundIndex];
        if (round && round.hemorrhageTriggered) {
          // Calculate turn number (round * attacks per round + attack within round)
          const turnNumber = (roundIndex * result.scenario.attacksPerRound) + 1;
          turnsToFirstTrigger.push(turnNumber);
          foundFirstTrigger = true;
        }
      }
    }

    if (turnsToFirstTrigger.length === 0) {
      return 0; // No triggers found
    }

    return turnsToFirstTrigger.reduce((sum, turns) => sum + turns, 0) / turnsToFirstTrigger.length;
  }

  /**
   * Calculate hemorrhage damage statistics
   */
  private calculateHemorrhageDamageStats(results: CombatResult[]): { total: number; averagePerTrigger: number } {
    let totalHemorrhageDamage = 0;
    let totalTriggers = 0;

    for (const result of results) {
      for (const round of result.rounds) {
        for (const attack of round.attacks) {
          if (attack.hemorrhageTriggered && attack.hemorrhageDamage) {
            totalHemorrhageDamage += attack.hemorrhageDamage;
            totalTriggers++;
          }
        }
      }
    }

    const averagePerTrigger = totalTriggers > 0 ? totalHemorrhageDamage / totalTriggers : 0;

    return {
      total: totalHemorrhageDamage,
      averagePerTrigger
    };
  }

  /**
   * Calculate distribution of trigger counts per combat
   */
  private calculateTriggerDistribution(results: CombatResult[]): Map<number, number> {
    const distribution = new Map<number, number>();

    for (const result of results) {
      const triggerCount = result.hemorrhageTriggers;
      const currentCount = distribution.get(triggerCount) || 0;
      distribution.set(triggerCount, currentCount + 1);
    }

    return distribution;
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) {
      return 0;
    }

    const index = percentile * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower] ?? 0;
    }
    
    const weight = index - lower;
    const lowerValue = sortedArray[lower] ?? 0;
    const upperValue = sortedArray[upper] ?? 0;
    return lowerValue * (1 - weight) + upperValue * weight;
  }

  /**
   * Compare two statistical analyses
   */
  static compare(analysis1: StatisticalAnalysis, analysis2: StatisticalAnalysis): ComparisonResult {
    const damageComparison = {
      meanDifference: analysis1.damageStats.mean - analysis2.damageStats.mean,
      meanPercentageDifference: analysis2.damageStats.mean > 0 
        ? ((analysis1.damageStats.mean - analysis2.damageStats.mean) / analysis2.damageStats.mean) * 100
        : 0,
      consistencyComparison: analysis1.consistencyMetrics.coefficientOfVariation - analysis2.consistencyMetrics.coefficientOfVariation,
      stabilityComparison: analysis1.consistencyMetrics.stabilityIndex - analysis2.consistencyMetrics.stabilityIndex
    };

    let hemorrhageComparison = null;
    if (analysis1.hemorrhageStats && analysis2.hemorrhageStats) {
      hemorrhageComparison = {
        triggerFrequencyDifference: analysis1.hemorrhageStats.triggerFrequency - analysis2.hemorrhageStats.triggerFrequency,
        triggerRateDifference: analysis1.hemorrhageStats.triggerRate - analysis2.hemorrhageStats.triggerRate,
        averageDamageDifference: analysis1.hemorrhageStats.averageDamagePerTrigger - analysis2.hemorrhageStats.averageDamagePerTrigger
      };
    }

    return {
      damageComparison,
      hemorrhageComparison,
      overallAssessment: this.assessOverallComparison(damageComparison, hemorrhageComparison)
    };
  }

  /**
   * Assess overall comparison between two analyses
   */
  private static assessOverallComparison(
    damageComparison: any, 
    _hemorrhageComparison: any
  ): 'significantly-better' | 'better' | 'similar' | 'worse' | 'significantly-worse' {
    const meanDiffPercent = Math.abs(damageComparison.meanPercentageDifference);
    
    if (meanDiffPercent < 5) {
      return 'similar';
    } else if (meanDiffPercent < 15) {
      return damageComparison.meanPercentageDifference > 0 ? 'better' : 'worse';
    } else {
      return damageComparison.meanPercentageDifference > 0 ? 'significantly-better' : 'significantly-worse';
    }
  }

  /**
   * Generate a summary report of the statistical analysis
   */
  static generateSummaryReport(analysis: StatisticalAnalysis): string {
    const lines: string[] = [];
    
    lines.push('=== STATISTICAL ANALYSIS SUMMARY ===');
    lines.push(`Sample Size: ${analysis.sampleSize}`);
    lines.push(`Analysis Date: ${analysis.analysisTimestamp.toISOString()}`);
    lines.push('');
    
    // Damage statistics
    lines.push('--- DAMAGE STATISTICS ---');
    lines.push(`Mean Damage: ${analysis.damageStats.mean.toFixed(2)}`);
    lines.push(`Median Damage: ${analysis.damageStats.median.toFixed(2)}`);
    lines.push(`Standard Deviation: ${analysis.damageStats.standardDeviation.toFixed(2)}`);
    lines.push(`Range: ${analysis.damageStats.min} - ${analysis.damageStats.max}`);
    lines.push(`25th-75th Percentile: ${analysis.damageStats.percentiles.p25.toFixed(1)} - ${analysis.damageStats.percentiles.p75.toFixed(1)}`);
    lines.push('');
    
    // Consistency metrics
    lines.push('--- CONSISTENCY METRICS ---');
    lines.push(`Consistency Rating: ${analysis.consistencyMetrics.consistencyRating}`);
    lines.push(`Coefficient of Variation: ${(analysis.consistencyMetrics.coefficientOfVariation * 100).toFixed(1)}%`);
    lines.push(`Stability Index: ${analysis.consistencyMetrics.stabilityIndex.toFixed(3)}`);
    lines.push(`Outliers: ${analysis.consistencyMetrics.outlierCount} (${analysis.consistencyMetrics.outlierPercentage.toFixed(1)}%)`);
    lines.push('');
    
    // Hemorrhage statistics (if applicable)
    if (analysis.hemorrhageStats) {
      lines.push('--- HEMORRHAGE STATISTICS ---');
      lines.push(`Trigger Frequency: ${analysis.hemorrhageStats.triggerFrequency.toFixed(2)} per combat`);
      lines.push(`Trigger Rate: ${(analysis.hemorrhageStats.triggerRate * 100).toFixed(1)}% of combats`);
      lines.push(`Average Turns to Trigger: ${analysis.hemorrhageStats.averageTurnsToTrigger.toFixed(1)}`);
      lines.push(`Average Damage per Trigger: ${analysis.hemorrhageStats.averageDamagePerTrigger.toFixed(1)}`);
      lines.push(`Max Triggers in Single Combat: ${analysis.hemorrhageStats.maxTriggersInSingleCombat}`);
    }
    
    return lines.join('\n');
  }
}

/**
 * Result of comparing two statistical analyses
 */
export interface ComparisonResult {
  damageComparison: {
    meanDifference: number;
    meanPercentageDifference: number;
    consistencyComparison: number;
    stabilityComparison: number;
  };
  hemorrhageComparison: {
    triggerFrequencyDifference: number;
    triggerRateDifference: number;
    averageDamageDifference: number;
  } | null;
  overallAssessment: 'significantly-better' | 'better' | 'similar' | 'worse' | 'significantly-worse';
}