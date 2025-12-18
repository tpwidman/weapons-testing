/**
 * CSV Report Generator
 * Handles generation of CSV files with different data formats
 */

import { SimulationResult } from '../../simulation/simulation';
import * as fs from 'fs';
import * as path from 'path';

export interface CSVGeneratorConfig {
  outputDirectory: string;
  reportName: string;
  includeTypes: ('summary' | 'raw' | 'frequency')[];
}

export class CSVGenerator {
  private config: CSVGeneratorConfig;

  constructor(config: CSVGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate all requested CSV files for the given results
   */
  async generateCSVFiles(results: SimulationResult[]): Promise<string[]> {
    if (results.length === 0) {
      throw new Error('No results provided for CSV generation');
    }

    // Ensure output directory exists
    const reportDir = path.join(this.config.outputDirectory, this.config.reportName);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const generatedFiles: string[] = [];

    // Generate each requested type
    for (const type of this.config.includeTypes) {
      const filename = `${type}.csv`;
      const filepath = path.join(reportDir, filename);
      
      let csvContent: string;
      switch (type) {
        case 'summary':
          csvContent = this.generateSummaryCSV(results);
          break;
        case 'raw':
          csvContent = this.generateRawCSV(results);
          break;
        case 'frequency':
          csvContent = this.generateFrequencyCSV(results);
          break;
        default:
          throw new Error(`Unknown CSV type: ${type}`);
      }

      fs.writeFileSync(filepath, csvContent);
      generatedFiles.push(filepath);
    }

    return generatedFiles;
  }

  /**
   * Generate summary statistics CSV
   */
  private generateSummaryCSV(results: SimulationResult[]): string {
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
      'Damage_Percentage_Difference'
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
        result.comparison?.damagePercentageDifference.toFixed(2) || ''
      ];

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate raw combat data CSV
   */
  private generateRawCSV(results: SimulationResult[]): string {
    if (results.length === 0) return '';

    // Create headers with weapon names
    const headers = ['Combat_Number'];
    results.forEach(result => {
      headers.push(this.escapeCSV(result.weaponName));
    });

    const csvRows = [headers.join(',')];

    // Find the maximum number of iterations across all results
    const maxIterations = Math.max(...results.map(r => r.iterations));

    // Generate rows for each combat iteration
    for (let i = 0; i < maxIterations; i++) {
      const row: (string | number)[] = [i + 1];
      
      results.forEach(result => {
        const combat = result.rawResults[i];
        row.push(combat?.totalDamage || 0);
      });
      
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate frequency distribution CSV
   */
  private generateFrequencyCSV(results: SimulationResult[]): string {
    const combinedFreq: string[] = [];
    combinedFreq.push('Damage_Range,Frequency,Weapon,Character');

    for (const result of results) {
      const damages = result.rawResults.map(combat => combat.totalDamage);
      const distribution = this.createFrequencyDistribution(damages);
      
      distribution.forEach(([range, frequency]) => {
        combinedFreq.push([
          range,
          frequency.toString(),
          this.escapeCSV(result.weaponName),
          this.escapeCSV(result.characterName)
        ].join(','));
      });
    }

    return combinedFreq.join('\n');
  }

  /**
   * Create frequency distribution for damage values
   */
  private createFrequencyDistribution(damages: number[]): Array<[string, number]> {
    if (damages.length === 0) return [];

    const min = Math.min(...damages);
    const max = Math.max(...damages);
    const binSize = Math.max(1, Math.ceil((max - min) / 25)); // 25 bins max
    
    const bins: { [key: number]: number } = {};
    
    damages.forEach(damage => {
      const binStart = Math.floor((damage - min) / binSize) * binSize + min;
      bins[binStart] = (bins[binStart] || 0) + 1;
    });
    
    return Object.entries(bins)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([binStart, count]) => {
        const binEnd = parseInt(binStart) + binSize - 1;
        return [`${binStart}-${binEnd}`, count] as [string, number];
      });
  }

  /**
   * Escape CSV values that contain special characters
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}