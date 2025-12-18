/**
 * Report generation system for weapon damage simulation results
 * Provides formatted output, console display, and structured data export
 */

import { SimulationResult } from '../simulation/simulation';
import { ComparisonReport } from '../simulation/baseline';

/**
 * Configuration options for report generation
 */
export interface ReportConfig {
  includeRawData: boolean;
  highlightThresholds: {
    significantDifference: number; // percentage
    highVariance: number; // coefficient of variation
    lowConsistency: number; // stability index
  };
  exportFormats: ('console' | 'json' | 'csv')[];
  colorOutput: boolean;
}

/**
 * Formatted report sections
 */
export interface FormattedReport {
  title: string;
  summary: string;
  detailedAnalysis: string;
  comparisons: string;
  recommendations: string;
  rawData?: string | undefined;
}

/**
 * Balance recommendation with severity and action items
 */
export interface BalanceRecommendation {
  weaponName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'damage' | 'consistency' | 'special-mechanics' | 'overall-balance';
  issue: string;
  recommendation: string;
  suggestedChanges: string[];
  priority: number; // 1-10, higher is more urgent
}

/**
 * Main report generator class
 */
export class ReportGenerator {
  private config: ReportConfig;

  constructor(config?: Partial<ReportConfig>) {
    this.config = {
      includeRawData: false,
      highlightThresholds: {
        significantDifference: 15, // 15% difference is significant
        highVariance: 0.3, // CV > 0.3 is high variance
        lowConsistency: 0.7 // Stability index < 0.7 is low consistency
      },
      exportFormats: ['console'],
      colorOutput: true,
      ...config
    };
  }

  /**
   * Generate comprehensive report from simulation results
   */
  generateReport(
    results: SimulationResult[],
    comparisonReport?: ComparisonReport
  ): FormattedReport {
    const title = this.generateTitle(results);
    const summary = this.generateSummary(results);
    const detailedAnalysis = this.generateDetailedAnalysis(results);
    const comparisons = comparisonReport ? this.generateComparisonSection(comparisonReport) : '';
    const recommendations = this.generateRecommendations(results, comparisonReport);
    const rawData = this.config.includeRawData ? this.generateRawDataSection(results) : undefined;

    return {
      title,
      summary,
      detailedAnalysis,
      comparisons,
      recommendations,
      rawData
    };
  }

  /**
   * Display report to console with highlighted metrics
   */
  displayToConsole(report: FormattedReport): void {
    console.log(this.formatForConsole(report));
  }

  /**
   * Export report as JSON
   */
  exportAsJSON(
    results: SimulationResult[],
    comparisonReport?: ComparisonReport
  ): string {
    const exportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalSimulations: results.length,
        totalIterations: results.reduce((sum, r) => sum + r.iterations, 0)
      },
      results,
      comparisonReport,
      config: this.config
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export report as CSV
   */
  exportAsCSV(results: SimulationResult[]): string {
    if (results.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'Character',
      'Weapon',
      'Scenario_Rounds',
      'Scenario_TargetAC',
      'Scenario_TargetSize',
      'Scenario_AdvantageRate',
      'Iterations',
      'Mean_Damage',
      'Median_Damage',
      'StdDev_Damage',
      'Min_Damage',
      'Max_Damage',
      'P25_Damage',
      'P75_Damage',
      'P90_Damage',
      'P95_Damage',
      'Coefficient_of_Variation',
      'Consistency_Rating',
      'Stability_Index',
      'Hemorrhage_Trigger_Frequency',
      'Hemorrhage_Trigger_Rate',
      'Hemorrhage_Avg_Damage_Per_Trigger',
      'Balance_Rating',
      'Damage_Percentage_Difference',
      'Timestamp'
    ];

    const csvRows = [headers.join(',')];

    for (const result of results) {
      const stats = result.analysis.damageStats;
      const hemorrhageStats = result.analysis.hemorrhageStats;
      const consistencyMetrics = result.analysis.consistencyMetrics;

      const row = [
        this.escapeCSV(result.characterName),
        this.escapeCSV(result.weaponName),
        result.scenario.rounds.toString(),
        result.scenario.targetAC.toString(),
        result.scenario.targetSize,
        result.scenario.advantageRate.toString(),
        result.iterations.toString(),
        stats.mean.toFixed(2),
        stats.median.toFixed(2),
        stats.standardDeviation.toFixed(2),
        stats.min.toString(),
        stats.max.toString(),
        stats.percentiles.p25.toFixed(2),
        stats.percentiles.p75.toFixed(2),
        stats.percentiles.p90.toFixed(2),
        stats.percentiles.p95.toFixed(2),
        stats.coefficientOfVariation.toFixed(4),
        consistencyMetrics.consistencyRating,
        consistencyMetrics.stabilityIndex.toFixed(3),
        hemorrhageStats?.triggerFrequency.toFixed(4) || '0',
        hemorrhageStats?.triggerRate.toFixed(4) || '0',
        hemorrhageStats?.averageDamagePerTrigger.toFixed(2) || '0',
        result.comparison?.balanceRating || '',
        result.comparison?.damagePercentageDifference.toFixed(2) || '',
        result.timestamp.toISOString()
      ];

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate balance recommendations based on analysis
   */
  generateBalanceRecommendations(
    results: SimulationResult[],
    _comparisonReport?: ComparisonReport
  ): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];

    for (const result of results) {
      // Check damage balance
      if (result.comparison) {
        const damageRec = this.analyzeDamageBalance(result);
        if (damageRec) recommendations.push(damageRec);
      }

      // Check consistency
      const consistencyRec = this.analyzeConsistency(result);
      if (consistencyRec) recommendations.push(consistencyRec);

      // Check special mechanics
      if (result.analysis.hemorrhageStats) {
        const mechanicsRec = this.analyzeSpecialMechanics(result);
        if (mechanicsRec) recommendations.push(mechanicsRec);
      }
    }

    // Sort by priority (highest first)
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;
  }

  /**
   * Update report configuration
   */
  updateConfig(newConfig: Partial<ReportConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReportConfig {
    return { ...this.config };
  }

  // Private helper methods

  /**
   * Generate report title
   */
  private generateTitle(results: SimulationResult[]): string {
    const weaponNames = [...new Set(results.map(r => r.weaponName))];
    const characterNames = [...new Set(results.map(r => r.characterName))];
    
    return `Weapon Damage Simulation Report
${weaponNames.join(', ')} vs ${characterNames.join(', ')}
Generated: ${new Date().toLocaleString()}
Total Simulations: ${results.length}`;
  }

  /**
   * Generate executive summary
   */
  private generateSummary(results: SimulationResult[]): string {
    if (results.length === 0) {
      return 'No simulation results to summarize.';
    }

    const lines: string[] = [];
    lines.push('=== EXECUTIVE SUMMARY ===');
    
    // Overall statistics
    const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0);
    const avgDamage = results.reduce((sum, r) => sum + r.analysis.damageStats.mean, 0) / results.length;
    const avgConsistency = results.reduce((sum, r) => sum + r.analysis.consistencyMetrics.stabilityIndex, 0) / results.length;
    
    lines.push(`Total Iterations: ${totalIterations.toLocaleString()}`);
    lines.push(`Average Damage: ${avgDamage.toFixed(1)}`);
    lines.push(`Average Consistency: ${(avgConsistency * 100).toFixed(1)}%`);
    
    // Hemorrhage statistics if applicable
    const hemorrhageResults = results.filter(r => r.analysis.hemorrhageStats);
    if (hemorrhageResults.length > 0) {
      const avgTriggerRate = hemorrhageResults.reduce((sum, r) => 
        sum + (r.analysis.hemorrhageStats?.triggerRate || 0), 0) / hemorrhageResults.length;
      lines.push(`Average Hemorrhage Trigger Rate: ${(avgTriggerRate * 100).toFixed(1)}%`);
    }
    
    // Balance assessment
    const balancedWeapons = results.filter(r => r.comparison?.balanceRating === 'balanced').length;
    const overpoweredWeapons = results.filter(r => {
      const rating = r.comparison?.balanceRating;
      return rating === 'overpowered';
    }).length;
    
    if (results.some(r => r.comparison)) {
      lines.push(`Balance Assessment: ${balancedWeapons} balanced, ${overpoweredWeapons} overpowered`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate detailed analysis section
   */
  private generateDetailedAnalysis(results: SimulationResult[]): string {
    const lines: string[] = [];
    lines.push('=== DETAILED ANALYSIS ===');
    lines.push('');
    lines.push('📊 Quick Stats Guide:');
    lines.push('• Mean = Average damage you can expect');
    lines.push('• Median = Middle value (half your rolls above/below this)');
    lines.push('• Percentiles = What % of your damage rolls were at or below that number');
    lines.push('• Consistency Rating = How predictable your damage is (very-consistent to very-inconsistent)');
    lines.push('• Hemorrhage = Special bleed mechanic that triggers bonus damage');
    lines.push('');
    
    for (const result of results) {
      lines.push(`\n--- ${result.weaponName} with ${result.characterName} ---`);
      
      // Damage statistics
      const stats = result.analysis.damageStats;
      lines.push(`Damage Statistics:`);
      lines.push(`  Mean: ${stats.mean.toFixed(2)} (±${stats.standardDeviation.toFixed(2)}) - average damage per combat`);
      lines.push(`  Range: ${stats.min} - ${stats.max} - lowest to highest damage seen`);
      lines.push(`  Median: ${stats.median.toFixed(2)} - middle value (50% of combats above/below this)`);
      lines.push(`  Percentiles (what % of combats are below these damage values):`);
      lines.push(`    25th: ${stats.percentiles.p25.toFixed(1)} (25% of combats below this damage)`);
      lines.push(`    75th: ${stats.percentiles.p75.toFixed(1)} (75% of combats below this damage)`);
      lines.push(`    90th: ${stats.percentiles.p90.toFixed(1)} (90% of combats below this damage)`);
      lines.push(`    95th: ${stats.percentiles.p95.toFixed(1)} (95% of combats below this damage)`);
      lines.push(`    99th: ${stats.percentiles.p99.toFixed(1)} (99% of combats below this damage - rare high rolls)`);
      
      // Consistency metrics with explanations
      const consistency = result.analysis.consistencyMetrics;
      lines.push(`Consistency Metrics:`);
      lines.push(`  Rating: ${consistency.consistencyRating} - how predictable your damage is`);
      lines.push(`  Coefficient of Variation: ${(consistency.coefficientOfVariation * 100).toFixed(1)}% - lower is more consistent`);
      lines.push(`  Stability Index: ${consistency.stabilityIndex.toFixed(3)} - higher means more reliable (max 1.0)`);
      
      // Add interpretation
      if (consistency.coefficientOfVariation < 0.2) {
        lines.push(`    → Very predictable damage output`);
      } else if (consistency.coefficientOfVariation < 0.4) {
        lines.push(`    → Moderately predictable damage output`);
      } else {
        lines.push(`    → Highly variable damage output - expect big swings`);
      }
      
      // Hemorrhage statistics
      if (result.analysis.hemorrhageStats) {
        const hemorrhage = result.analysis.hemorrhageStats;
        lines.push(`Hemorrhage Mechanics:`);
        lines.push(`  Trigger Frequency: ${hemorrhage.triggerFrequency.toFixed(2)} per combat`);
        lines.push(`  Trigger Rate: ${(hemorrhage.triggerRate * 100).toFixed(1)}% of combats`);
        lines.push(`  Average Turns to Trigger: ${hemorrhage.averageTurnsToTrigger.toFixed(1)}`);
        lines.push(`  Average Damage per Trigger: ${hemorrhage.averageDamagePerTrigger.toFixed(1)}`);
      }
      
      // Highlight significant findings
      const highlights = this.identifyHighlights(result);
      if (highlights.length > 0) {
        lines.push(`Key Findings:`);
        highlights.forEach(highlight => lines.push(`  • ${highlight}`));
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Generate comparison section
   */
  private generateComparisonSection(comparisonReport: ComparisonReport): string {
    const lines: string[] = [];
    lines.push('=== BASELINE COMPARISONS ===');
    
    // Overall rankings
    if (comparisonReport.overallRankings.length > 0) {
      lines.push('\nOverall Performance Rankings:');
      comparisonReport.overallRankings.forEach((ranking, index) => {
        lines.push(`${index + 1}. ${ranking.weaponName} (${ranking.averagePerformance.toFixed(1)}% vs baseline)`);
      });
    }
    
    // Detailed comparisons
    lines.push('\nDetailed Comparisons:');
    for (const comparison of comparisonReport.weaponComparisons) {
      lines.push(`\n${comparison.weaponName} vs ${comparison.baselineName}:`);
      lines.push(`  Damage Difference: ${comparison.damageComparison.percentageDifference.toFixed(1)}%`);
      lines.push(`  Balance Rating: ${comparison.balanceAssessment.rating}`);
      lines.push(`  Risk Level: ${comparison.balanceAssessment.riskLevel}`);
      
      if (comparison.specialMechanicAdvantage) {
        lines.push(`  Hemorrhage Advantage: ${comparison.specialMechanicAdvantage.hemorrhageAdvantagePercentage.toFixed(1)}%`);
      }
      
      lines.push(`  Recommendation: ${comparison.balanceAssessment.recommendation}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(
    results: SimulationResult[],
    comparisonReport?: ComparisonReport
  ): string {
    const recommendations = this.generateBalanceRecommendations(results, comparisonReport);
    
    if (recommendations.length === 0) {
      return '=== RECOMMENDATIONS ===\nNo specific recommendations at this time. All weapons appear to be performing within acceptable parameters.';
    }
    
    const lines: string[] = [];
    lines.push('=== RECOMMENDATIONS ===');
    
    // Group by severity
    const critical = recommendations.filter(r => r.severity === 'critical');
    const high = recommendations.filter(r => r.severity === 'high');
    const medium = recommendations.filter(r => r.severity === 'medium');
    const low = recommendations.filter(r => r.severity === 'low');
    
    if (critical.length > 0) {
      lines.push('\n🚨 CRITICAL ISSUES:');
      critical.forEach(rec => {
        lines.push(`• ${rec.weaponName}: ${rec.issue}`);
        lines.push(`  Action: ${rec.recommendation}`);
        rec.suggestedChanges.forEach(change => lines.push(`    - ${change}`));
      });
    }
    
    if (high.length > 0) {
      lines.push('\n⚠️  HIGH PRIORITY:');
      high.forEach(rec => {
        lines.push(`• ${rec.weaponName}: ${rec.issue}`);
        lines.push(`  Action: ${rec.recommendation}`);
      });
    }
    
    if (medium.length > 0) {
      lines.push('\n📋 MEDIUM PRIORITY:');
      medium.forEach(rec => {
        lines.push(`• ${rec.weaponName}: ${rec.issue}`);
        lines.push(`  Action: ${rec.recommendation}`);
      });
    }
    
    if (low.length > 0) {
      lines.push('\n💡 SUGGESTIONS:');
      low.forEach(rec => {
        lines.push(`• ${rec.weaponName}: ${rec.recommendation}`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Generate raw data section
   */
  private generateRawDataSection(results: SimulationResult[]): string {
    const lines: string[] = [];
    lines.push('=== RAW DATA ===');
    
    for (const result of results) {
      lines.push(`\n${result.weaponName} - ${result.characterName}:`);
      lines.push(`Iterations: ${result.iterations}`);
      lines.push(`Seed: ${result.seed || 'random'}`);
      lines.push(`Scenario: ${JSON.stringify(result.scenario, null, 2)}`);
      
      // Sample of raw combat results
      const sampleSize = Math.min(5, result.rawResults.length);
      lines.push(`Sample Results (first ${sampleSize}):`);
      for (let i = 0; i < sampleSize; i++) {
        const combat = result.rawResults[i];
        if (combat) {
          lines.push(`  Combat ${i + 1}: ${combat.totalDamage} damage, ${combat.specialMechanicTriggers} hemorrhage triggers`);
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Format report for console display with colors and highlighting
   */
  private formatForConsole(report: FormattedReport): string {
    const lines: string[] = [];
    
    // Title with emphasis
    lines.push(this.colorize(report.title, 'cyan', true));
    lines.push('='.repeat(80));
    lines.push('');
    
    // Summary
    lines.push(report.summary);
    lines.push('');
    
    // Detailed analysis
    lines.push(report.detailedAnalysis);
    lines.push('');
    
    // Comparisons
    if (report.comparisons) {
      lines.push(report.comparisons);
      lines.push('');
    }
    
    // Recommendations with highlighting
    lines.push(this.highlightRecommendations(report.recommendations));
    lines.push('');
    
    // Raw data if included
    if (report.rawData) {
      lines.push(report.rawData);
    }
    
    return lines.join('\n');
  }

  /**
   * Identify highlights and significant findings
   */
  private identifyHighlights(result: SimulationResult): string[] {
    const highlights: string[] = [];
    const stats = result.analysis.damageStats;
    const consistency = result.analysis.consistencyMetrics;
    
    // High variance
    if (stats.coefficientOfVariation > this.config.highlightThresholds.highVariance) {
      highlights.push(`High damage variance (CV: ${(stats.coefficientOfVariation * 100).toFixed(1)}%)`);
    }
    
    // Low consistency
    if (consistency.stabilityIndex < this.config.highlightThresholds.lowConsistency) {
      highlights.push(`Low consistency rating: ${consistency.consistencyRating}`);
    }
    
    // Significant damage difference
    if (result.comparison && Math.abs(result.comparison.damagePercentageDifference) > this.config.highlightThresholds.significantDifference) {
      const direction = result.comparison.damagePercentageDifference > 0 ? 'higher' : 'lower';
      highlights.push(`${Math.abs(result.comparison.damagePercentageDifference).toFixed(1)}% ${direction} damage than baseline`);
    }
    
    // Hemorrhage effectiveness
    if (result.analysis.hemorrhageStats) {
      const triggerRate = result.analysis.hemorrhageStats.triggerRate;
      if (triggerRate > 0.8) {
        highlights.push(`Very high hemorrhage trigger rate (${(triggerRate * 100).toFixed(1)}%)`);
      } else if (triggerRate < 0.3) {
        highlights.push(`Low hemorrhage trigger rate (${(triggerRate * 100).toFixed(1)}%)`);
      }
    }
    
    return highlights;
  }

  /**
   * Analyze damage balance for recommendations
   */
  private analyzeDamageBalance(result: SimulationResult): BalanceRecommendation | null {
    if (!result.comparison) return null;
    
    const diff = result.comparison.damagePercentageDifference;
    
    if (Math.abs(diff) < 10) return null; // Within acceptable range
    
    if (diff > 30) {
      return {
        weaponName: result.weaponName,
        severity: 'critical',
        category: 'damage',
        issue: `Significantly overpowered (${diff.toFixed(1)}% above baseline)`,
        recommendation: 'Reduce base damage or special mechanic frequency',
        suggestedChanges: [
          'Reduce base damage dice by one step',
          'Decrease hemorrhage trigger frequency',
          'Reduce hemorrhage damage multiplier'
        ],
        priority: 9
      };
    } else if (diff > 20) {
      return {
        weaponName: result.weaponName,
        severity: 'high',
        category: 'damage',
        issue: `Overpowered (${diff.toFixed(1)}% above baseline)`,
        recommendation: 'Minor damage reduction needed',
        suggestedChanges: [
          'Reduce magical bonus by 1',
          'Adjust hemorrhage threshold upward'
        ],
        priority: 7
      };
    } else if (diff < -20) {
      return {
        weaponName: result.weaponName,
        severity: 'medium',
        category: 'damage',
        issue: `Underpowered (${Math.abs(diff).toFixed(1)}% below baseline)`,
        recommendation: 'Increase damage output',
        suggestedChanges: [
          'Increase base damage or magical bonus',
          'Improve special mechanic effectiveness'
        ],
        priority: 5
      };
    }
    
    return null;
  }

  /**
   * Analyze consistency for recommendations
   */
  private analyzeConsistency(result: SimulationResult): BalanceRecommendation | null {
    const consistency = result.analysis.consistencyMetrics;
    
    if (consistency.coefficientOfVariation > 0.5) {
      return {
        weaponName: result.weaponName,
        severity: 'medium',
        category: 'consistency',
        issue: `Very inconsistent damage output (CV: ${(consistency.coefficientOfVariation * 100).toFixed(1)}%)`,
        recommendation: 'Reduce damage variance',
        suggestedChanges: [
          'Replace high-variance dice with more consistent damage',
          'Add minimum damage guarantees',
          'Reduce reliance on critical hits'
        ],
        priority: 4
      };
    } else if (consistency.coefficientOfVariation > 0.4) {
      return {
        weaponName: result.weaponName,
        severity: 'low',
        category: 'consistency',
        issue: `Inconsistent damage output`,
        recommendation: 'Consider minor consistency improvements',
        suggestedChanges: [],
        priority: 2
      };
    }
    
    return null;
  }

  /**
   * Analyze special mechanics for recommendations
   */
  private analyzeSpecialMechanics(result: SimulationResult): BalanceRecommendation | null {
    const hemorrhage = result.analysis.hemorrhageStats;
    if (!hemorrhage) return null;
    
    if (hemorrhage.triggerRate < 0.2) {
      return {
        weaponName: result.weaponName,
        severity: 'medium',
        category: 'special-mechanics',
        issue: `Hemorrhage rarely triggers (${(hemorrhage.triggerRate * 100).toFixed(1)}% of combats)`,
        recommendation: 'Improve hemorrhage trigger reliability',
        suggestedChanges: [
          'Lower hemorrhage thresholds',
          'Increase counter dice values',
          'Add alternative trigger conditions'
        ],
        priority: 6
      };
    } else if (hemorrhage.triggerRate > 0.9) {
      return {
        weaponName: result.weaponName,
        severity: 'high',
        category: 'special-mechanics',
        issue: `Hemorrhage triggers too frequently (${(hemorrhage.triggerRate * 100).toFixed(1)}% of combats)`,
        recommendation: 'Reduce hemorrhage trigger frequency',
        suggestedChanges: [
          'Increase hemorrhage thresholds',
          'Reduce counter dice values',
          'Add cooldown mechanics'
        ],
        priority: 8
      };
    }
    
    return null;
  }

  /**
   * Add color and emphasis to console output
   */
  private colorize(text: string, color: string, bold: boolean = false): string {
    if (!this.config.colorOutput) return text;
    
    const colors: { [key: string]: string } = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m'
    };
    
    const reset = '\x1b[0m';
    const boldCode = bold ? '\x1b[1m' : '';
    
    return `${boldCode}${colors[color] || ''}${text}${reset}`;
  }

  /**
   * Highlight recommendations with appropriate colors
   */
  private highlightRecommendations(recommendations: string): string {
    if (!this.config.colorOutput) return recommendations;
    
    return recommendations
      .replace(/🚨 CRITICAL ISSUES:/g, this.colorize('🚨 CRITICAL ISSUES:', 'red', true))
      .replace(/⚠️  HIGH PRIORITY:/g, this.colorize('⚠️  HIGH PRIORITY:', 'yellow', true))
      .replace(/📋 MEDIUM PRIORITY:/g, this.colorize('📋 MEDIUM PRIORITY:', 'blue', true))
      .replace(/💡 SUGGESTIONS:/g, this.colorize('💡 SUGGESTIONS:', 'green', true));
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

/**
 * Default report configuration
 */
export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  includeRawData: false,
  highlightThresholds: {
    significantDifference: 15,
    highVariance: 0.3,
    lowConsistency: 0.7
  },
  exportFormats: ['console'],
  colorOutput: true
};

/**
 * Utility functions for report generation
 */
export class ReportUtils {
  /**
   * Create a quick summary report for a single simulation result
   */
  static quickSummary(result: SimulationResult): string {
    const stats = result.analysis.damageStats;
    const lines = [
      `${result.weaponName} with ${result.characterName}:`,
      `  Average Damage: ${stats.mean.toFixed(1)} (±${stats.standardDeviation.toFixed(1)})`,
      `  Consistency: ${result.analysis.consistencyMetrics.consistencyRating}`,
    ];
    
    if (result.analysis.hemorrhageStats) {
      lines.push(`  Hemorrhage Rate: ${(result.analysis.hemorrhageStats.triggerRate * 100).toFixed(1)}%`);
    }
    
    if (result.comparison) {
      lines.push(`  vs Baseline: ${result.comparison.damagePercentageDifference.toFixed(1)}% (${result.comparison.balanceRating})`);
    }
    
    return lines.join('\n');
  }

  /**
   * Format large numbers with appropriate units
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  /**
   * Calculate confidence interval for display
   */
  static formatConfidenceInterval(mean: number, stdDev: number, sampleSize: number): string {
    const standardError = stdDev / Math.sqrt(sampleSize);
    const marginOfError = 1.96 * standardError; // 95% CI
    const lower = mean - marginOfError;
    const upper = mean + marginOfError;
    return `${lower.toFixed(1)} - ${upper.toFixed(1)}`;
  }

  /**
   * Explain what a percentile means in plain English
   */
  static explainPercentile(percentile: number, value: number): string {
    return `${percentile}% of damage results were ${value.toFixed(1)} or lower`;
  }

  /**
   * Get a user-friendly interpretation of percentile values
   */
  static interpretPercentiles(percentiles: any): string {
    const lines = [
      'Percentile Breakdown (what % of your damage rolls were at or below these values):',
      `  • P25 (${percentiles.p25.toFixed(1)}): Your "bad luck" threshold - only 25% of rolls this low`,
      `  • P50 (${percentiles.p50.toFixed(1)}): Median - exactly half your rolls above/below this`,
      `  • P75 (${percentiles.p75.toFixed(1)}): Your "good luck" threshold - 75% of rolls this low or lower`,
      `  • P90 (${percentiles.p90.toFixed(1)}): High damage - only 10% of rolls exceeded this`,
      `  • P95 (${percentiles.p95.toFixed(1)}): Very high damage - only 5% of rolls exceeded this`,
      `  • P99 (${percentiles.p99.toFixed(1)}): Exceptional damage - only 1% of rolls exceeded this`
    ];
    return lines.join('\n');
  }
}