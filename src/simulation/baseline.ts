/**
 * Baseline weapon comparison system for D&D 5e weapon balance testing
 * Provides standard weapon templates and comparison analysis functionality
 */

import { WeaponBuilder, Weapon } from '../weapons/weapon';
import { SimulationResult, SimulationEngine } from '../simulation/simulation';
import { Character } from '../characters/character';
import { WeaponDefinition } from '../core/types';
import { CombatScenario } from '../combat/combat';

/**
 * Standard baseline weapon configurations for different magical bonuses
 */
export interface BaselineWeaponTemplate {
  name: string;
  magicalBonus: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';
  baseDamage: string;
  damageType: string;
  properties: string[];
  levelRange: {
    min: number;
    max: number;
  };
}

/**
 * Comparison analysis result between a weapon and baseline
 */
export interface WeaponComparison {
  weaponName: string;
  baselineName: string;
  damageComparison: {
    meanDifference: number;
    percentageDifference: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  };
  consistencyComparison: {
    coefficientOfVariationDifference: number;
    stabilityIndexDifference: number;
    consistencyRating: 'more-consistent' | 'similar' | 'less-consistent';
  };
  specialMechanicAdvantage: {
    hemorrhageFrequency: number;
    hemorrhageDamageContribution: number;
    hemorrhageAdvantagePercentage: number;
  } | undefined;
  balanceAssessment: {
    rating: 'underpowered' | 'balanced' | 'overpowered' | 'significantly-overpowered';
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  performanceRanking: {
    percentile: number;
    rank: number;
    totalCompared: number;
  };
}

/**
 * Comprehensive comparison report for multiple weapons
 */
export interface ComparisonReport {
  baselineWeapons: string[];
  weaponComparisons: WeaponComparison[];
  overallRankings: {
    weaponName: string;
    averagePerformance: number;
    consistencyScore: number;
    balanceScore: number;
    overallRank: number;
  }[];
  summary: {
    balancedWeapons: string[];
    overpoweredWeapons: string[];
    underpoweredWeapons: string[];
    recommendations: string[];
  };
  timestamp: Date;
}

/**
 * Baseline weapon comparison system
 */
export class BaselineComparison {
  private baselineTemplates: BaselineWeaponTemplate[];

  constructor() {
    this.baselineTemplates = this.createStandardBaselines();
  }

  /**
   * Create standard baseline weapon templates for different levels
   */
  private createStandardBaselines(): BaselineWeaponTemplate[] {
    return [
      // Non-magical baseline
      {
        name: 'Baseline Rapier',
        magicalBonus: 0,
        rarity: 'common',
        baseDamage: '1d8',
        damageType: 'piercing',
        properties: ['finesse'],
        levelRange: { min: 1, max: 4 }
      },
      // +1 weapons (levels 5-7)
      {
        name: 'Baseline Rapier +1',
        magicalBonus: 1,
        rarity: 'uncommon',
        baseDamage: '1d8',
        damageType: 'piercing',
        properties: ['finesse'],
        levelRange: { min: 5, max: 7 }
      },
      // +2 weapons (levels 8-10)
      {
        name: 'Baseline Rapier +2',
        magicalBonus: 2,
        rarity: 'rare',
        baseDamage: '1d8',
        damageType: 'piercing',
        properties: ['finesse'],
        levelRange: { min: 8, max: 10 }
      },
      // +3 weapons (levels 11+)
      {
        name: 'Baseline Rapier +3',
        magicalBonus: 3,
        rarity: 'very-rare',
        baseDamage: '1d8',
        damageType: 'piercing',
        properties: ['finesse'],
        levelRange: { min: 11, max: 20 }
      },
      // Alternative weapon types for comparison
      {
        name: 'Baseline Longsword +1',
        magicalBonus: 1,
        rarity: 'uncommon',
        baseDamage: '1d8',
        damageType: 'slashing',
        properties: ['versatile'],
        levelRange: { min: 5, max: 7 }
      },
      {
        name: 'Baseline Longsword +2',
        magicalBonus: 2,
        rarity: 'rare',
        baseDamage: '1d8',
        damageType: 'slashing',
        properties: ['versatile'],
        levelRange: { min: 8, max: 10 }
      },
      {
        name: 'Baseline Scimitar +1',
        magicalBonus: 1,
        rarity: 'uncommon',
        baseDamage: '1d6',
        damageType: 'slashing',
        properties: ['finesse', 'light'],
        levelRange: { min: 5, max: 7 }
      },
      {
        name: 'Baseline Scimitar +2',
        magicalBonus: 2,
        rarity: 'rare',
        baseDamage: '1d6',
        damageType: 'slashing',
        properties: ['finesse', 'light'],
        levelRange: { min: 8, max: 10 }
      }
    ];
  }

  /**
   * Get appropriate baseline weapons for a character level
   */
  getBaselinesForLevel(level: number): BaselineWeaponTemplate[] {
    return this.baselineTemplates.filter(template => 
      level >= template.levelRange.min && level <= template.levelRange.max
    );
  }

  /**
   * Create weapon instances from baseline templates
   */
  createBaselineWeapons(templates: BaselineWeaponTemplate[]): Weapon[] {
    return templates.map(template => {
      const definition: WeaponDefinition = {
        name: template.name,
        rarity: template.rarity,
        baseDamage: template.baseDamage,
        damageType: template.damageType,
        properties: template.properties,
        magicalBonus: template.magicalBonus,
        specialMechanics: []
      };

      return WeaponBuilder.fromDefinition(definition);
    });
  }

  /**
   * Run baseline comparison simulations
   */
  async runBaselineComparison(
    testWeapon: Weapon,
    character: Character,
    scenarios: CombatScenario[],
    simulationEngine: SimulationEngine
  ): Promise<WeaponComparison[]> {
    const characterLevel = character.getLevel();
    const appropriateBaselines = this.getBaselinesForLevel(characterLevel);
    const baselineWeapons = this.createBaselineWeapons(appropriateBaselines);

    const comparisons: WeaponComparison[] = [];

    for (const baselineWeapon of baselineWeapons) {
      for (const scenario of scenarios) {
        // Run simulation for test weapon
        const testResult = simulationEngine.runSimulation(character, testWeapon, scenario);
        
        // Run simulation for baseline weapon
        const baselineResult = simulationEngine.runSimulation(character, baselineWeapon, scenario);

        // Calculate comparison
        const comparison = this.calculateWeaponComparison(testResult, baselineResult);
        comparisons.push(comparison);
      }
    }

    return comparisons;
  }

  /**
   * Calculate detailed comparison between two weapons
   */
  private calculateWeaponComparison(
    testResult: SimulationResult,
    baselineResult: SimulationResult
  ): WeaponComparison {
    const testStats = testResult.analysis.damageStats;
    const baselineStats = baselineResult.analysis.damageStats;

    // Damage comparison
    const meanDifference = testStats.mean - baselineStats.mean;
    const percentageDifference = baselineStats.mean > 0 
      ? (meanDifference / baselineStats.mean) * 100 
      : 0;

    // Calculate confidence interval for the difference
    const pooledVariance = (testStats.variance + baselineStats.variance) / 2;
    const standardError = Math.sqrt(pooledVariance * (2 / testResult.iterations));
    const marginOfError = 1.96 * standardError; // 95% CI

    const confidenceInterval = {
      lower: meanDifference - marginOfError,
      upper: meanDifference + marginOfError
    };

    // Consistency comparison
    const cvDifference = testResult.analysis.consistencyMetrics.coefficientOfVariation - 
                        baselineResult.analysis.consistencyMetrics.coefficientOfVariation;
    const stabilityDifference = testResult.analysis.consistencyMetrics.stabilityIndex - 
                               baselineResult.analysis.consistencyMetrics.stabilityIndex;

    let consistencyRating: 'more-consistent' | 'similar' | 'less-consistent';
    if (Math.abs(cvDifference) < 0.05) {
      consistencyRating = 'similar';
    } else if (cvDifference < 0) {
      consistencyRating = 'more-consistent';
    } else {
      consistencyRating = 'less-consistent';
    }

    // Special mechanic advantage (hemorrhage)
    let specialMechanicAdvantage;
    if (testResult.analysis.hemorrhageStats) {
      const hemorrhageFrequency = testResult.analysis.hemorrhageStats.triggerFrequency;
      const hemorrhageDamageContribution = testResult.analysis.hemorrhageStats.averageDamagePerTrigger * hemorrhageFrequency;
      const hemorrhageAdvantagePercentage = baselineStats.mean > 0 
        ? (hemorrhageDamageContribution / baselineStats.mean) * 100 
        : 0;

      specialMechanicAdvantage = {
        hemorrhageFrequency,
        hemorrhageDamageContribution,
        hemorrhageAdvantagePercentage
      };
    }

    // Balance assessment
    const balanceAssessment = this.assessBalance(percentageDifference, specialMechanicAdvantage);

    // Performance ranking (placeholder - will be calculated in comprehensive report)
    const performanceRanking = {
      percentile: 0,
      rank: 0,
      totalCompared: 1
    };

    return {
      weaponName: testResult.weaponName,
      baselineName: baselineResult.weaponName,
      damageComparison: {
        meanDifference,
        percentageDifference,
        confidenceInterval
      },
      consistencyComparison: {
        coefficientOfVariationDifference: cvDifference,
        stabilityIndexDifference: stabilityDifference,
        consistencyRating
      },
      specialMechanicAdvantage,
      balanceAssessment,
      performanceRanking
    };
  }

  /**
   * Assess weapon balance based on performance metrics
   */
  private assessBalance(
    percentageDifference: number, 
    specialMechanicAdvantage?: any
  ): WeaponComparison['balanceAssessment'] {
    let rating: 'underpowered' | 'balanced' | 'overpowered' | 'significantly-overpowered';
    let recommendation: string;
    let riskLevel: 'low' | 'medium' | 'high';

    // Adjust thresholds based on special mechanics
    const hasSpecialMechanics = specialMechanicAdvantage !== undefined;
    const specialMechanicBonus = hasSpecialMechanics ? specialMechanicAdvantage.hemorrhageAdvantagePercentage : 0;
    const totalAdvantage = percentageDifference + specialMechanicBonus;

    if (totalAdvantage < -15) {
      rating = 'underpowered';
      recommendation = 'Consider increasing base damage or improving special mechanics';
      riskLevel = 'medium';
    } else if (totalAdvantage < -5) {
      rating = 'underpowered';
      recommendation = 'Minor improvements needed to reach baseline performance';
      riskLevel = 'low';
    } else if (totalAdvantage <= 15) {
      rating = 'balanced';
      recommendation = 'Weapon performance is within acceptable range';
      riskLevel = 'low';
    } else if (totalAdvantage <= 30) {
      rating = 'overpowered';
      recommendation = 'Consider reducing damage or special mechanic frequency';
      riskLevel = 'medium';
    } else {
      rating = 'significantly-overpowered';
      recommendation = 'Significant rebalancing required - reduce damage and special mechanics';
      riskLevel = 'high';
    }

    return { rating, recommendation, riskLevel };
  }

  /**
   * Generate comprehensive comparison report
   */
  generateComparisonReport(comparisons: WeaponComparison[]): ComparisonReport {
    const baselineWeapons = [...new Set(comparisons.map(c => c.baselineName))];
    
    // Calculate performance rankings
    const weaponPerformances = new Map<string, number[]>();
    
    for (const comparison of comparisons) {
      if (!weaponPerformances.has(comparison.weaponName)) {
        weaponPerformances.set(comparison.weaponName, []);
      }
      weaponPerformances.get(comparison.weaponName)!.push(comparison.damageComparison.percentageDifference);
    }

    // Update rankings in comparisons
    const updatedComparisons = this.updatePerformanceRankings(comparisons);

    // Calculate overall rankings
    const overallRankings = this.calculateOverallRankings(updatedComparisons);

    // Generate summary
    const summary = this.generateSummary(updatedComparisons);

    return {
      baselineWeapons,
      weaponComparisons: updatedComparisons,
      overallRankings,
      summary,
      timestamp: new Date()
    };
  }

  /**
   * Update performance rankings for all comparisons
   */
  private updatePerformanceRankings(comparisons: WeaponComparison[]): WeaponComparison[] {
    const performanceValues = comparisons.map(c => c.damageComparison.percentageDifference);
    performanceValues.sort((a, b) => b - a); // Sort descending

    return comparisons.map(comparison => {
      const performance = comparison.damageComparison.percentageDifference;
      const rank = performanceValues.indexOf(performance) + 1;
      const percentile = ((performanceValues.length - rank + 1) / performanceValues.length) * 100;

      return {
        ...comparison,
        performanceRanking: {
          percentile,
          rank,
          totalCompared: performanceValues.length
        }
      };
    });
  }

  /**
   * Calculate overall rankings across all comparisons
   */
  private calculateOverallRankings(comparisons: WeaponComparison[]): ComparisonReport['overallRankings'] {
    const weaponStats = new Map<string, {
      performances: number[];
      consistencyScores: number[];
      balanceScores: number[];
    }>();

    // Collect stats for each weapon
    for (const comparison of comparisons) {
      if (!weaponStats.has(comparison.weaponName)) {
        weaponStats.set(comparison.weaponName, {
          performances: [],
          consistencyScores: [],
          balanceScores: []
        });
      }

      const stats = weaponStats.get(comparison.weaponName)!;
      stats.performances.push(comparison.damageComparison.percentageDifference);
      stats.consistencyScores.push(comparison.consistencyComparison.stabilityIndexDifference);
      
      // Convert balance rating to numeric score
      const balanceScore = this.balanceRatingToScore(comparison.balanceAssessment.rating);
      stats.balanceScores.push(balanceScore);
    }

    // Calculate averages and create rankings
    const rankings = Array.from(weaponStats.entries()).map(([weaponName, stats]) => {
      const averagePerformance = stats.performances.reduce((sum, p) => sum + p, 0) / stats.performances.length;
      const consistencyScore = stats.consistencyScores.reduce((sum, c) => sum + c, 0) / stats.consistencyScores.length;
      const balanceScore = stats.balanceScores.reduce((sum, b) => sum + b, 0) / stats.balanceScores.length;

      return {
        weaponName,
        averagePerformance,
        consistencyScore,
        balanceScore,
        overallRank: 0 // Will be calculated after sorting
      };
    });

    // Sort by average performance and assign ranks
    rankings.sort((a, b) => b.averagePerformance - a.averagePerformance);
    rankings.forEach((ranking, index) => {
      ranking.overallRank = index + 1;
    });

    return rankings;
  }

  /**
   * Convert balance rating to numeric score for ranking
   */
  private balanceRatingToScore(rating: string): number {
    switch (rating) {
      case 'underpowered': return 1;
      case 'balanced': return 3;
      case 'overpowered': return 2;
      case 'significantly-overpowered': return 0;
      default: return 1;
    }
  }

  /**
   * Generate summary of comparison results
   */
  private generateSummary(comparisons: WeaponComparison[]): ComparisonReport['summary'] {
    const weaponsByBalance = new Map<string, string[]>();
    const recommendations = new Set<string>();

    for (const comparison of comparisons) {
      const rating = comparison.balanceAssessment.rating;
      if (!weaponsByBalance.has(rating)) {
        weaponsByBalance.set(rating, []);
      }
      
      if (!weaponsByBalance.get(rating)!.includes(comparison.weaponName)) {
        weaponsByBalance.get(rating)!.push(comparison.weaponName);
      }

      recommendations.add(comparison.balanceAssessment.recommendation);
    }

    return {
      balancedWeapons: weaponsByBalance.get('balanced') || [],
      overpoweredWeapons: [
        ...(weaponsByBalance.get('overpowered') || []),
        ...(weaponsByBalance.get('significantly-overpowered') || [])
      ],
      underpoweredWeapons: weaponsByBalance.get('underpowered') || [],
      recommendations: Array.from(recommendations)
    };
  }

  /**
   * Get all available baseline templates
   */
  getBaselineTemplates(): BaselineWeaponTemplate[] {
    return [...this.baselineTemplates];
  }

  /**
   * Add custom baseline template
   */
  addBaselineTemplate(template: BaselineWeaponTemplate): void {
    this.baselineTemplates.push(template);
  }

  /**
   * Export baseline weapons as JSON files for use in simulations
   */
  exportBaselineDefinitions(): { [filename: string]: WeaponDefinition } {
    const definitions: { [filename: string]: WeaponDefinition } = {};

    for (const template of this.baselineTemplates) {
      const definition: WeaponDefinition = {
        name: template.name,
        rarity: template.rarity,
        baseDamage: template.baseDamage,
        damageType: template.damageType,
        properties: template.properties,
        magicalBonus: template.magicalBonus,
        specialMechanics: []
      };

      const filename = template.name.toLowerCase().replace(/\s+/g, '-') + '.json';
      definitions[filename] = definition;
    }

    return definitions;
  }
}

/**
 * Utility functions for baseline comparison
 */
export class BaselineUtils {
  /**
   * Format comparison report as human-readable text
   */
  static formatComparisonReport(report: ComparisonReport): string {
    const lines: string[] = [];
    
    lines.push('=== WEAPON BASELINE COMPARISON REPORT ===');
    lines.push(`Generated: ${report.timestamp.toISOString()}`);
    lines.push(`Baseline Weapons: ${report.baselineWeapons.join(', ')}`);
    lines.push('');

    // Overall Rankings
    lines.push('--- OVERALL WEAPON RANKINGS ---');
    for (const ranking of report.overallRankings) {
      lines.push(`${ranking.overallRank}. ${ranking.weaponName}`);
      lines.push(`   Average Performance: ${ranking.averagePerformance.toFixed(1)}%`);
      lines.push(`   Consistency Score: ${ranking.consistencyScore.toFixed(3)}`);
      lines.push(`   Balance Score: ${ranking.balanceScore.toFixed(1)}`);
      lines.push('');
    }

    // Detailed Comparisons
    lines.push('--- DETAILED COMPARISONS ---');
    for (const comparison of report.weaponComparisons) {
      lines.push(`${comparison.weaponName} vs ${comparison.baselineName}:`);
      lines.push(`  Damage Difference: ${comparison.damageComparison.percentageDifference.toFixed(1)}%`);
      lines.push(`  Balance Rating: ${comparison.balanceAssessment.rating}`);
      lines.push(`  Risk Level: ${comparison.balanceAssessment.riskLevel}`);
      lines.push(`  Recommendation: ${comparison.balanceAssessment.recommendation}`);
      
      if (comparison.specialMechanicAdvantage) {
        lines.push(`  Hemorrhage Advantage: ${comparison.specialMechanicAdvantage.hemorrhageAdvantagePercentage.toFixed(1)}%`);
      }
      
      lines.push('');
    }

    // Summary
    lines.push('--- SUMMARY ---');
    lines.push(`Balanced Weapons: ${report.summary.balancedWeapons.join(', ') || 'None'}`);
    lines.push(`Overpowered Weapons: ${report.summary.overpoweredWeapons.join(', ') || 'None'}`);
    lines.push(`Underpowered Weapons: ${report.summary.underpoweredWeapons.join(', ') || 'None'}`);
    lines.push('');
    lines.push('Key Recommendations:');
    for (const recommendation of report.summary.recommendations) {
      lines.push(`  - ${recommendation}`);
    }

    return lines.join('\n');
  }

  /**
   * Export comparison data as CSV
   */
  static exportComparisonCSV(report: ComparisonReport): string {
    const headers = [
      'Weapon_Name',
      'Baseline_Name',
      'Damage_Percentage_Difference',
      'Mean_Damage_Difference',
      'Confidence_Interval_Lower',
      'Confidence_Interval_Upper',
      'Consistency_Rating',
      'CV_Difference',
      'Stability_Index_Difference',
      'Hemorrhage_Frequency',
      'Hemorrhage_Advantage_Percentage',
      'Balance_Rating',
      'Risk_Level',
      'Performance_Rank',
      'Performance_Percentile',
      'Recommendation'
    ];

    const csvRows = [headers.join(',')];

    for (const comparison of report.weaponComparisons) {
      const row = [
        comparison.weaponName,
        comparison.baselineName,
        comparison.damageComparison.percentageDifference.toFixed(2),
        comparison.damageComparison.meanDifference.toFixed(2),
        comparison.damageComparison.confidenceInterval.lower.toFixed(2),
        comparison.damageComparison.confidenceInterval.upper.toFixed(2),
        comparison.consistencyComparison.consistencyRating,
        comparison.consistencyComparison.coefficientOfVariationDifference.toFixed(4),
        comparison.consistencyComparison.stabilityIndexDifference.toFixed(4),
        comparison.specialMechanicAdvantage?.hemorrhageFrequency.toFixed(4) || '0',
        comparison.specialMechanicAdvantage?.hemorrhageAdvantagePercentage.toFixed(2) || '0',
        comparison.balanceAssessment.rating,
        comparison.balanceAssessment.riskLevel,
        comparison.performanceRanking.rank.toString(),
        comparison.performanceRanking.percentile.toFixed(1),
        `"${comparison.balanceAssessment.recommendation}"`
      ];

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}