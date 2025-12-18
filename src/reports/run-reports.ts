#!/usr/bin/env node

/**
 * Report Runner Script
 * Runs multiple predefined reports for weapon analysis
 */

import { SimulationEngine, SimulationConfigBuilder } from '../simulation/simulation';
import { CharacterBuilder } from '../characters/character';
import { Weapon, WeaponBuilder } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';
import { ReportGenerator } from './generators/report-generator';
import { 
  hemorrhageComparisonFlat, 
  hemorrhageComparisonAdvantage
} from './configs/hemorrhage-comparison';
import { 
  weaponBalanceStandard,
  weaponBalanceDetailed
} from './configs/weapon-balance';
import { WeaponDefinition } from '../core/types';

interface ReportScenario {
  name: string;
  description: string;
  advantageRate: number;
  rounds: number;
  iterations: number;
  targetAC: number;
  targetSize: string;
}

interface WeaponTestConfig {
  name: string;
  displayName: string;
  hemorrhageDice?: string;
  source: 'file' | 'definition';
  filePath?: string;
  definition?: WeaponDefinition;
}

class ReportRunner {
  private scenarios: ReportScenario[] = [
    {
      name: 'flat',
      description: 'Flat Rolls (No Advantage)',
      advantageRate: 0.0,
      rounds: 10,
      iterations: 1000,
      targetAC: 15,
      targetSize: 'medium'
    },
    {
      name: 'advantage',
      description: 'With Advantage',
      advantageRate: 1.0,
      rounds: 10,
      iterations: 1000,
      targetAC: 15,
      targetSize: 'medium'
    },
    {
      name: 'mixed',
      description: 'Mixed Combat (30% Advantage)',
      advantageRate: 0.3,
      rounds: 10,
      iterations: 1000,
      targetAC: 15,
      targetSize: 'medium'
    }
  ];

  private weaponConfigs: WeaponTestConfig[] = [
    {
      name: 'sanguine_4d6',
      displayName: 'Sanguine Dagger (4d6)',
      hemorrhageDice: '4d6',
      source: 'definition',
      definition: {
        "name": "Sanguine Dagger (4d6)",
        "rarity": "rare",
        "baseDamage": "1d4",
        "damageType": "piercing",
        "properties": ["finesse", "light", "thrown"],
        "magicalBonus": 1,
        "specialMechanics": [
          {
            "name": "Hemorrhage",
            "type": "bleed",
            "parameters": {
              "counterDice": {
                "normal": "1d4",
                "advantage": "1d8",
                "critical": true
              },
              "thresholds": {
                "tiny": 12,
                "small": 12,
                "medium": 12,
                "large": 16,
                "huge": 20,
                "gargantuan": 24
              },
              "hemorrhageDamage": "4d6"
            }
          }
        ]
      }
    },
    {
      name: 'sanguine_6d6',
      displayName: 'Sanguine Dagger (6d6)',
      hemorrhageDice: '6d6',
      source: 'file',
      filePath: 'src/weapons/data/sanguine-dagger/sanguine-dagger.json'
    },
    {
      name: 'control_dagger',
      displayName: '+1 Dagger (Control)',
      hemorrhageDice: 'None',
      source: 'file',
      filePath: 'src/weapons/data/baseline-rapier-plus-1.json'
    }
  ];

  /**
   * Run all predefined reports
   */
  async runAllReports(): Promise<void> {
    console.log('🎲⚔️  Weapon Analysis Report Suite');
    console.log('=====================================\n');

    try {
      // Load character
      const character = CharacterBuilder.loadFromFile('src/characters/data/level-5-swashbuckler-rogue.json');
      console.log(`📋 Character: ${character.getName()} (Level ${character.getLevel()})`);

      // Load weapons
      const weapons = await this.loadWeapons();
      console.log(`⚔️  Weapons loaded: ${weapons.length}`);
      weapons.forEach(({ config }) => {
        console.log(`   • ${config.displayName} (${config.hemorrhageDice || 'No'} hemorrhage)`);
      });

      console.log(`\n🎯 Scenarios: ${this.scenarios.length}`);
      this.scenarios.forEach(scenario => {
        console.log(`   • ${scenario.description} (${(scenario.advantageRate * 100).toFixed(0)}% advantage)`);
      });

      console.log('\n' + '='.repeat(60));

      // Run hemorrhage comparison reports
      await this.runHemorrhageComparisons(character, weapons);

      // Run weapon balance reports  
      await this.runWeaponBalanceReports(character, weapons);

      console.log('\n' + '='.repeat(60));
      console.log('✅ All reports completed successfully!');
      console.log('\n📁 Generated reports in:');
      console.log('   reports/hemorrhage-comparison-flat/');
      console.log('   reports/hemorrhage-comparison-advantage/');
      console.log('   reports/weapon-balance-standard/');
      console.log('   reports/weapon-balance-detailed/');
      console.log('\n📊 Files generated per report:');
      console.log('   • summary.csv - Statistical summary');
      console.log('   • raw.csv - Raw combat data');
      console.log('   • frequency.csv - Damage distribution');
      console.log('   • report.json - Complete data export');

    } catch (error) {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run specific report by name
   */
  async runSpecificReport(reportName: string): Promise<void> {
    console.log(`🎯 Running specific report: ${reportName}\n`);

    const character = CharacterBuilder.loadFromFile('src/characters/data/level-5-swashbuckler-rogue.json');
    const weapons = await this.loadWeapons();

    switch (reportName.toLowerCase()) {
      case 'hemorrhage-flat':
        await this.runSingleHemorrhageReport(character, weapons, 'flat');
        break;
      case 'hemorrhage-advantage':
        await this.runSingleHemorrhageReport(character, weapons, 'advantage');
        break;
      case 'weapon-balance':
        await this.runSingleWeaponBalanceReport(character, weapons, 'mixed');
        break;
      default:
        console.error(`❌ Unknown report: ${reportName}`);
        console.log('Available reports: hemorrhage-flat, hemorrhage-advantage, weapon-balance');
        process.exit(1);
    }
  }

  /**
   * Run hemorrhage comparison reports
   */
  private async runHemorrhageComparisons(character: any, weapons: Array<{ weapon: Weapon; config: WeaponTestConfig }>): Promise<void> {
    console.log('🩸 Running Hemorrhage Comparison Reports...\n');

    // Flat rolls comparison
    await this.runSingleHemorrhageReport(character, weapons, 'flat');

    // Advantage comparison
    await this.runSingleHemorrhageReport(character, weapons, 'advantage');
  }

  /**
   * Run weapon balance reports
   */
  private async runWeaponBalanceReports(character: any, weapons: Array<{ weapon: Weapon; config: WeaponTestConfig }>): Promise<void> {
    console.log('\n⚖️  Running Weapon Balance Reports...\n');

    // Standard balance report (mixed scenario)
    await this.runSingleWeaponBalanceReport(character, weapons, 'mixed');

    // Detailed balance report (all scenarios)
    await this.runDetailedWeaponBalanceReport(character, weapons);
  }

  /**
   * Run single hemorrhage report
   */
  private async runSingleHemorrhageReport(
    character: any, 
    weapons: Array<{ weapon: Weapon; config: WeaponTestConfig }>, 
    scenarioName: string
  ): Promise<void> {
    const scenario = this.scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioName}`);
    }

    console.log(`📊 Generating ${scenario.description} report...`);

    // Run simulations
    const results = await this.runSimulations(character, weapons, scenario);

    // Generate report
    const reportConfig = scenarioName === 'flat' ? hemorrhageComparisonFlat : hemorrhageComparisonAdvantage;
    const generator = new ReportGenerator(reportConfig);
    const report = await generator.generateReport(results);

    console.log(`✅ ${scenario.description} report completed`);
    console.log(`   Files: ${report.generatedFiles.length} generated`);
    report.generatedFiles.forEach(file => {
      console.log(`   📄 ${file}`);
    });
  }

  /**
   * Run single weapon balance report
   */
  private async runSingleWeaponBalanceReport(
    character: any, 
    weapons: Array<{ weapon: Weapon; config: WeaponTestConfig }>, 
    scenarioName: string
  ): Promise<void> {
    const scenario = this.scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioName}`);
    }

    console.log(`📊 Generating weapon balance report (${scenario.description})...`);

    // Run simulations
    const results = await this.runSimulations(character, weapons, scenario);

    // Generate report
    const generator = new ReportGenerator(weaponBalanceStandard);
    const report = await generator.generateReport(results);

    console.log(`✅ Weapon balance report completed`);
    console.log(`   Files: ${report.generatedFiles.length} generated`);
  }

  /**
   * Run detailed weapon balance report (all scenarios)
   */
  private async runDetailedWeaponBalanceReport(
    character: any, 
    weapons: Array<{ weapon: Weapon; config: WeaponTestConfig }>
  ): Promise<void> {
    console.log(`📊 Generating detailed weapon balance report (all scenarios)...`);

    // Run simulations for all scenarios
    const allResults = [];
    for (const scenario of this.scenarios) {
      const results = await this.runSimulations(character, weapons, scenario);
      allResults.push(...results);
    }

    // Generate report
    const generator = new ReportGenerator(weaponBalanceDetailed);
    const report = await generator.generateReport(allResults);

    console.log(`✅ Detailed weapon balance report completed`);
    console.log(`   Files: ${report.generatedFiles.length} generated`);
  }

  /**
   * Run simulations for given scenario
   */
  private async runSimulations(
    character: any, 
    weapons: Array<{ weapon: Weapon; config: WeaponTestConfig }>, 
    scenario: ReportScenario
  ): Promise<any[]> {
    const config = new SimulationConfigBuilder()
      .iterations(scenario.iterations)
      .seed(12345)
      .scenarios([{
        rounds: scenario.rounds,
        targetAC: scenario.targetAC,
        targetSize: scenario.targetSize,
        advantageRate: scenario.advantageRate,
        attacksPerRound: 1
      }])
      .characters(['dummy'])
      .weapons(['dummy'])
      .build();

    const engine = new SimulationEngine(config);
    const results = [];

    for (const { weapon } of weapons) {
      const result = engine.runSimulation(character, weapon, {
        rounds: scenario.rounds,
        targetAC: scenario.targetAC,
        targetSize: scenario.targetSize,
        advantageRate: scenario.advantageRate,
        attacksPerRound: 1
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Load weapons from configuration
   */
  private async loadWeapons(): Promise<Array<{ weapon: Weapon; config: WeaponTestConfig }>> {
    const diceEngine = new DiceEngine(12345);
    const weapons = [];

    for (const weaponConfig of this.weaponConfigs) {
      let weapon: Weapon;
      
      if (weaponConfig.source === 'file') {
        weapon = WeaponBuilder.loadFromFile(weaponConfig.filePath!, diceEngine);
      } else {
        weapon = WeaponBuilder.fromDefinition(weaponConfig.definition!, diceEngine);
      }
      
      weapons.push({ weapon, config: weaponConfig });
    }

    return weapons;
  }

  /**
   * Display help information
   */
  static showHelp(): void {
    console.log(`
🎲 Weapon Analysis Report Runner

Usage:
  npm run reports                    # Run all reports
  npm run reports -- <report-name>  # Run specific report
  npm run reports -- --help         # Show this help

Available Reports:
  hemorrhage-flat      # Hemorrhage comparison with flat rolls
  hemorrhage-advantage # Hemorrhage comparison with advantage
  weapon-balance       # Weapon balance analysis

Examples:
  npm run reports                              # Run all reports
  npm run reports -- hemorrhage-flat          # Run only flat rolls hemorrhage report
  npm run reports -- weapon-balance           # Run weapon balance analysis

Output:
  All reports are saved to the 'reports/' directory with the following structure:
  reports/
    ├── hemorrhage-comparison-flat/
    │   ├── summary.csv
    │   ├── raw.csv
    │   ├── frequency.csv
    │   └── report.json
    └── weapon-balance-standard/
        ├── summary.csv
        ├── frequency.csv
        └── report.json
    `);
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    ReportRunner.showHelp();
    return;
  }

  const runner = new ReportRunner();

  if (args.length > 0) {
    const reportName = args[0];
    if (reportName) {
      await runner.runSpecificReport(reportName);
    } else {
      await runner.runAllReports();
    }
  } else {
    await runner.runAllReports();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Report Runner Error:', error);
    process.exit(1);
  });
}

export { ReportRunner };