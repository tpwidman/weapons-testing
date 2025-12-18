#!/usr/bin/env node

/**
 * Command-line interface for the Weapon Damage Simulator
 * Generates comprehensive reports based on configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import { SimulationEngine, SimulationConfigBuilder } from '../simulation/simulation';
import { ReportGenerator } from '../reports/report';
import { BaselineComparison } from '../simulation/baseline';
import { CharacterBuilder } from '../characters/character';
import { WeaponBuilder } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';

interface CLIConfig {
  simulation: {
    iterations: number;
    seed?: number;
    scenarios: Array<{
      name: string;
      rounds: number;
      targetAC: number;
      targetSize: string;
      advantageRate: number;
      attacksPerRound: number;
    }>;
  };
  entities: {
    characters: string[];
    weapons: string[];
    baselines: string[];
  };
  report: {
    includeRawData: boolean;
    highlightThresholds: {
      significantDifference: number;
      highVariance: number;
      lowConsistency: number;
    };
    exportFormats: ('console' | 'json' | 'csv')[];
    colorOutput: boolean;
    outputDirectory: string;
  };
  output: {
    console: boolean;
    saveToFile: boolean;
    filename: string;
    formats: ('json' | 'csv')[];
  };
}

class WeaponSimulatorCLI {
  private config: CLIConfig;
  private reportGenerator: ReportGenerator;
  private baselineComparison: BaselineComparison;

  constructor(configPath: string = 'report-config.json') {
    this.config = this.loadConfig(configPath);
    this.reportGenerator = new ReportGenerator(this.config.report);
    this.baselineComparison = new BaselineComparison();
  }

  /**
   * Load configuration from JSON file
   */
  private loadConfig(configPath: string): CLIConfig {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error(`Failed to load config file: ${configPath}`);
      console.error(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  /**
   * Run the complete simulation and generate reports
   */
  async run(): Promise<void> {
    console.log('🎲 Starting Weapon Damage Simulation...');
    console.log(`📊 Configuration: ${this.config.simulation.iterations} iterations per scenario`);
    console.log(`🎯 Scenarios: ${this.config.simulation.scenarios.length}`);
    console.log(`⚔️  Weapons: ${this.config.entities.weapons.length}`);
    console.log(`🧙 Characters: ${this.config.entities.characters.length}`);
    console.log('');

    try {
      // Create output directory if it doesn't exist
      if (this.config.output.saveToFile) {
        this.ensureOutputDirectory();
      }

      // Load entities
      const characters = this.loadCharacters();
      const weapons = this.loadWeapons();
      const baselines = this.loadBaselines();

      // Run simulations
      const results = [];
      const baselineResults = [];

      for (const character of characters) {
        for (const scenario of this.config.simulation.scenarios) {
          console.log(`🔄 Running scenario: ${scenario.name} with ${character.getName()}`);

          // Create simulation engine for this scenario
          const simConfig = new SimulationConfigBuilder()
            .iterations(this.config.simulation.iterations)
            .seed(this.config.simulation.seed || Math.floor(Math.random() * 1000000))
            .scenarios([{
              rounds: scenario.rounds,
              targetAC: scenario.targetAC,
              targetSize: scenario.targetSize,
              advantageRate: scenario.advantageRate,
              attacksPerRound: scenario.attacksPerRound
            }])
            .characters([]) // We'll pass characters directly
            .weapons([]) // We'll pass weapons directly
            .build();

          const engine = new SimulationEngine(simConfig);

          // Test weapons
          for (const weapon of weapons) {
            console.log(`  ⚔️  Testing ${weapon.getName()}...`);
            const result = engine.runSimulation(character, weapon, {
              rounds: scenario.rounds,
              targetAC: scenario.targetAC,
              targetSize: scenario.targetSize,
              advantageRate: scenario.advantageRate,
              attacksPerRound: scenario.attacksPerRound
            });
            results.push(result);
          }

          // Test baselines
          for (const baseline of baselines) {
            console.log(`  📏 Testing baseline ${baseline.getName()}...`);
            const result = engine.runSimulation(character, baseline, {
              rounds: scenario.rounds,
              targetAC: scenario.targetAC,
              targetSize: scenario.targetSize,
              advantageRate: scenario.advantageRate,
              attacksPerRound: scenario.attacksPerRound
            });
            baselineResults.push(result);
          }
        }
      }

      // Run comparisons
      console.log('📊 Analyzing results and generating comparisons...');
      const engine = new SimulationEngine(new SimulationConfigBuilder()
        .iterations(this.config.simulation.iterations)
        .scenarios([])
        .characters([])
        .weapons([])
        .build());

      const comparedResults = engine.runComparison(results, baselineResults);

      // Generate comparison report
      let comparisonReport;
      if (baselines.length > 0) {
        const comparisons = [];
        for (const result of comparedResults) {
          for (const baseline of baselines) {
            const baselineResult = baselineResults.find(br => 
              br.weaponName === baseline.getName() && 
              br.characterName === result.characterName
            );
            if (baselineResult) {
              const comparison = await this.baselineComparison.runBaselineComparison(
                weapons.find(w => w.getName() === result.weaponName)!,
                characters.find(c => c.getName() === result.characterName)!,
                this.config.simulation.scenarios.map(s => ({
                  rounds: s.rounds,
                  targetAC: s.targetAC,
                  targetSize: s.targetSize,
                  advantageRate: s.advantageRate,
                  attacksPerRound: s.attacksPerRound
                })),
                engine
              );
              comparisons.push(...comparison);
            }
          }
        }
        comparisonReport = this.baselineComparison.generateComparisonReport(comparisons);
      }

      // Generate and display report
      console.log('📋 Generating comprehensive report...');
      const report = this.reportGenerator.generateReport(comparedResults, comparisonReport);

      // Display to console
      if (this.config.output.console) {
        console.log('\n' + '='.repeat(80));
        this.reportGenerator.displayToConsole(report);
      }

      // Save to files
      if (this.config.output.saveToFile) {
        await this.saveReports(comparedResults, comparisonReport, report);
      }

      console.log('\n✅ Simulation complete!');
      
      if (this.config.output.saveToFile) {
        console.log(`📁 Reports saved to: ${this.config.report.outputDirectory}/`);
      }

    } catch (error) {
      console.error('❌ Simulation failed:');
      console.error(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  /**
   * Load characters from configuration
   */
  private loadCharacters() {
    const characters = [];
    for (const characterPath of this.config.entities.characters) {
      try {
        const character = CharacterBuilder.loadFromFile(characterPath);
        characters.push(character);
        console.log(`✅ Loaded character: ${character.getName()}`);
      } catch (error) {
        console.error(`❌ Failed to load character from ${characterPath}:`, error);
        process.exit(1);
      }
    }
    return characters;
  }

  /**
   * Load weapons from configuration
   */
  private loadWeapons() {
    const weapons = [];
    const diceEngine = new DiceEngine(this.config.simulation.seed);
    
    for (const weaponPath of this.config.entities.weapons) {
      try {
        const weapon = WeaponBuilder.loadFromFile(weaponPath, diceEngine);
        weapons.push(weapon);
        console.log(`✅ Loaded weapon: ${weapon.getName()}`);
      } catch (error) {
        console.error(`❌ Failed to load weapon from ${weaponPath}:`, error);
        process.exit(1);
      }
    }
    return weapons;
  }

  /**
   * Load baseline weapons from configuration
   */
  private loadBaselines() {
    const baselines = [];
    const diceEngine = new DiceEngine(this.config.simulation.seed);
    
    for (const baselinePath of this.config.entities.baselines) {
      try {
        const baseline = WeaponBuilder.loadFromFile(baselinePath, diceEngine);
        baselines.push(baseline);
        console.log(`✅ Loaded baseline: ${baseline.getName()}`);
      } catch (error) {
        console.error(`❌ Failed to load baseline from ${baselinePath}:`, error);
        process.exit(1);
      }
    }
    return baselines;
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    const outputDir = this.config.report.outputDirectory;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }
  }

  /**
   * Save reports to files
   */
  private async saveReports(results: any[], comparisonReport: any, formattedReport: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `${this.config.output.filename}-${timestamp}`;
    const outputDir = this.config.report.outputDirectory;

    // Save JSON report
    if (this.config.output.formats.includes('json')) {
      const jsonReport = this.reportGenerator.exportAsJSON(results, comparisonReport);
      const jsonPath = path.join(outputDir, `${baseFilename}.json`);
      fs.writeFileSync(jsonPath, jsonReport);
      console.log(`💾 Saved JSON report: ${jsonPath}`);
    }

    // Save CSV report
    if (this.config.output.formats.includes('csv')) {
      const csvReport = this.reportGenerator.exportAsCSV(results);
      const csvPath = path.join(outputDir, `${baseFilename}.csv`);
      fs.writeFileSync(csvPath, csvReport);
      console.log(`💾 Saved CSV report: ${csvPath}`);
    }

    // Save formatted text report
    const textReport = [
      formattedReport.title,
      '',
      formattedReport.summary,
      '',
      formattedReport.detailedAnalysis,
      '',
      formattedReport.comparisons,
      '',
      formattedReport.recommendations
    ].join('\n');
    
    const textPath = path.join(outputDir, `${baseFilename}.txt`);
    fs.writeFileSync(textPath, textReport);
    console.log(`💾 Saved text report: ${textPath}`);
  }

  /**
   * Display help information
   */
  static showHelp(): void {
    console.log(`
🎲 Weapon Damage Simulator CLI

Usage:
  npm run report                    # Run with default config (report-config.json)
  npm run report -- --config path  # Run with custom config file
  npm run report -- --help         # Show this help

Configuration:
  Edit report-config.json to customize:
  - Simulation parameters (iterations, scenarios)
  - Characters and weapons to test
  - Baseline weapons for comparison
  - Report formatting options
  - Output settings

Examples:
  npm run report                                    # Basic run
  npm run report -- --config my-config.json        # Custom config
  npm run report -- --config report-config.json    # Explicit default config

For more information, see the README.md file.
    `);
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    WeaponSimulatorCLI.showHelp();
    return;
  }

  let configPath = 'report-config.json';
  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    configPath = args[configIndex + 1]!;
  }

  const cli = new WeaponSimulatorCLI(configPath);
  await cli.run();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  });
}

export { WeaponSimulatorCLI };