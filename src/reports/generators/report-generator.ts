/**
 * Main Report Generator
 * Orchestrates different types of report generation
 */

import { SimulationResult } from '../../simulation/simulation';
import { CSVGenerator, CSVGeneratorConfig } from './csv-generator';
import * as path from 'path';

export interface ReportGeneratorConfig {
  reportName: string;
  outputDirectory: string;
  formats: {
    csv?: {
      enabled: boolean;
      types: ('summary' | 'raw' | 'frequency')[];
    };
    json?: {
      enabled: boolean;
      includeRawData: boolean;
    };
    console?: {
      enabled: boolean;
      colorOutput: boolean;
    };
  };
}

export interface GeneratedReport {
  reportName: string;
  outputDirectory: string;
  generatedFiles: string[];
  summary: {
    totalResults: number;
    totalIterations: number;
    weaponsTested: string[];
    charactersTested: string[];
  };
}

export class ReportGenerator {
  private config: ReportGeneratorConfig;

  constructor(config: ReportGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate all requested report formats
   */
  async generateReport(results: SimulationResult[]): Promise<GeneratedReport> {
    if (results.length === 0) {
      throw new Error('No simulation results provided');
    }

    const generatedFiles: string[] = [];

    // Generate CSV reports if enabled
    if (this.config.formats.csv?.enabled) {
      const csvConfig: CSVGeneratorConfig = {
        outputDirectory: this.config.outputDirectory,
        reportName: this.config.reportName,
        includeTypes: this.config.formats.csv.types
      };

      const csvGenerator = new CSVGenerator(csvConfig);
      const csvFiles = await csvGenerator.generateCSVFiles(results);
      generatedFiles.push(...csvFiles);
    }

    // Generate JSON report if enabled
    if (this.config.formats.json?.enabled) {
      const jsonFile = await this.generateJSONReport(results);
      generatedFiles.push(jsonFile);
    }

    // Display console output if enabled
    if (this.config.formats.console?.enabled) {
      this.displayConsoleReport(results);
    }

    // Create summary
    const summary = {
      totalResults: results.length,
      totalIterations: results.reduce((sum, r) => sum + r.iterations, 0),
      weaponsTested: [...new Set(results.map(r => r.weaponName))],
      charactersTested: [...new Set(results.map(r => r.characterName))]
    };

    return {
      reportName: this.config.reportName,
      outputDirectory: this.config.outputDirectory,
      generatedFiles,
      summary
    };
  }

  /**
   * Generate JSON report file
   */
  private async generateJSONReport(results: SimulationResult[]): Promise<string> {
    const reportDir = path.join(this.config.outputDirectory, this.config.reportName);
    const jsonPath = path.join(reportDir, 'report.json');

    const jsonData = {
      metadata: {
        reportName: this.config.reportName,
        generatedAt: new Date().toISOString(),
        totalSimulations: results.length,
        totalIterations: results.reduce((sum, r) => sum + r.iterations, 0)
      },
      results: this.config.formats.json?.includeRawData ? results : results.map(r => ({
        ...r,
        rawResults: undefined // Remove raw data to reduce file size
      })),
      config: this.config
    };

    const fs = require('fs');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    return jsonPath;
  }

  /**
   * Display console report
   */
  private displayConsoleReport(results: SimulationResult[]): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Report: ${this.config.reportName}`);
    console.log(`${'='.repeat(60)}`);

    // Summary
    const weaponNames = [...new Set(results.map(r => r.weaponName))];
    const characterNames = [...new Set(results.map(r => r.characterName))];
    const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0);

    console.log(`\n📈 Summary:`);
    console.log(`  Weapons tested: ${weaponNames.join(', ')}`);
    console.log(`  Characters: ${characterNames.join(', ')}`);
    console.log(`  Total simulations: ${results.length}`);
    console.log(`  Total iterations: ${totalIterations.toLocaleString()}`);

    // Results overview
    console.log(`\n📊 Results Overview:`);
    results.forEach(result => {
      const stats = result.analysis.damageStats;
      const hemorrhage = result.analysis.hemorrhageStats;
      
      console.log(`\n  ${result.weaponName} with ${result.characterName}:`);
      console.log(`    Average Damage: ${stats.mean.toFixed(1)} (±${stats.standardDeviation.toFixed(1)})`);
      console.log(`    Range: ${stats.min} - ${stats.max}`);
      console.log(`    Consistency: ${result.analysis.consistencyMetrics.consistencyRating}`);
      
      if (hemorrhage) {
        console.log(`    Hemorrhage Rate: ${(hemorrhage.triggerRate * 100).toFixed(1)}%`);
        console.log(`    Hemorrhage Avg Damage: ${hemorrhage.averageDamagePerTrigger.toFixed(1)}`);
      }
      
      if (result.comparison) {
        const diff = result.comparison.damagePercentageDifference;
        const direction = diff > 0 ? '+' : '';
        console.log(`    vs Baseline: ${direction}${diff.toFixed(1)}% (${result.comparison.balanceRating})`);
      }
    });

    console.log(`\n✅ Report generation complete!`);
  }
}