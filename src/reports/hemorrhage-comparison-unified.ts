/**
 * Unified hemorrhage comparison report generator
 * Can generate both flat rolls and advantage scenarios in one flexible system
 */

import { SimulationEngine, SimulationConfigBuilder } from '../simulation/simulation';
import { CharacterBuilder } from '../characters/character';
import { Weapon, WeaponBuilder } from '../weapons/weapon';
import { DiceEngine } from '../core/dice';
import { WeaponDefinition } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';

interface ReportConfig {
  name: string;
  description: string;
  advantageRate: number; // 0.0 = flat rolls, 1.0 = full advantage
  rounds: number;
  iterations: number;
  targetAC: number;
  targetSize: string;
}

interface WeaponConfig {
  name: string;
  displayName: string;
  hemorrhageDice?: string;
  weaponSource: 'file' | 'definition';
  filePath?: string;
  definition?: WeaponDefinition;
}

async function generateUnifiedHemorrhageComparison() {
  console.log('🩸⚔️  Unified Hemorrhage Comparison Report Generator\n');

  // Configuration for different report types
  const reportConfigs: ReportConfig[] = [
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
    }
  ];

  // Configuration for weapons to test
  const weaponConfigs: WeaponConfig[] = [
    {
      name: 'sanguine_4d6',
      displayName: 'Sanguine Dagger (4d6)',
      hemorrhageDice: '4d6',
      weaponSource: 'definition',
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
      weaponSource: 'file',
      filePath: 'src/weapons/data/sanguine-dagger/sanguine-dagger.json'
    },
    {
      name: 'control_dagger',
      displayName: '+1 Dagger (Control)',
      hemorrhageDice: 'None',
      weaponSource: 'file',
      filePath: 'src/weapons/data/baseline-rapier-plus-1.json'
    }
  ];

  try {
    // Load character
    const character = CharacterBuilder.loadFromFile('src/characters/data/level-5-swashbuckler-rogue.json');
    console.log(`Character: ${character.getName()} (Level ${character.getLevel()})`);
    console.log(`Sneak Attack: ${Math.ceil(character.getLevel() / 2)}d6 (auto-calculated from level)`);
    
    // Generate reports for each configuration
    for (const reportConfig of reportConfigs) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Generating ${reportConfig.description} Report`);
      console.log(`${'='.repeat(60)}`);
      
      await generateReport(character, weaponConfigs, reportConfig);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ All reports generated successfully!');
    console.log(`${'='.repeat(60)}`);
    console.log('\n📁 Generated Files:');
    console.log('  📄 reports/csv/hemorrhage-comparison-flat-*.csv');
    console.log('  📄 reports/csv/hemorrhage-comparison-advantage-*.csv');
    console.log('\n📈 Perfect for visualization:');
    console.log('  • Raw CSV files for bell curve histograms');
    console.log('  • Summary CSV files for statistical comparison');
    console.log('  • Frequency CSV files for smooth distribution curves');
    console.log('  • Shows impact of sneak attack + hemorrhage boost');

  } catch (error) {
    console.error('❌ Unified hemorrhage comparison failed:', error);
  }
}

async function generateReport(character: any, weaponConfigs: WeaponConfig[], reportConfig: ReportConfig): Promise<void> {
  const diceEngine = new DiceEngine(12345);
  
  console.log(`\nWeapons being tested:`);
  weaponConfigs.forEach(config => {
    console.log(`  • ${config.displayName} (${config.hemorrhageDice} hemorrhage)`);
  });
  
  console.log(`\nScenario: ${reportConfig.rounds} rounds, AC ${reportConfig.targetAC} ${reportConfig.targetSize}`);
  console.log(`Advantage Rate: ${(reportConfig.advantageRate * 100).toFixed(0)}%`);
  console.log(`Iterations: ${reportConfig.iterations}\n`);

  // Load weapons
  const weapons: Array<{ weapon: Weapon; config: WeaponConfig }> = [];
  for (const weaponConfig of weaponConfigs) {
    let weapon: Weapon;
    if (weaponConfig.weaponSource === 'file') {
      weapon = WeaponBuilder.loadFromFile(weaponConfig.filePath!, diceEngine);
    } else {
      weapon = WeaponBuilder.fromDefinition(weaponConfig.definition!, diceEngine);
    }
    weapons.push({ weapon, config: weaponConfig });
  }

  // Create scenario
  const scenario = {
    rounds: reportConfig.rounds,
    targetAC: reportConfig.targetAC,
    targetSize: reportConfig.targetSize,
    advantageRate: reportConfig.advantageRate,
    attacksPerRound: 1
  };

  const config = new SimulationConfigBuilder()
    .iterations(reportConfig.iterations)
    .seed(12345)
    .scenarios([scenario])
    .characters(['dummy'])
    .weapons(['dummy'])
    .build();

  const engine = new SimulationEngine(config);

  // Run simulations
  console.log('Running simulations...');
  const results: Array<{ result: any; config: WeaponConfig }> = [];
  
  for (const { weapon, config: weaponConfig } of weapons) {
    console.log(`  Running ${weaponConfig.displayName}...`);
    const result = engine.runSimulation(character, weapon, scenario);
    results.push({ result, config: weaponConfig });
  }

  // Generate CSV files
  console.log('Generating CSV files...\n');
  
  // Summary CSV
  const summaryData: string[] = [];
  summaryData.push('Weapon,Hemorrhage_Dice,Advantage_Rate,Mean_Damage,Median_Damage,Min_Damage,Max_Damage,Std_Dev,P25,P75,P90,P95,Hemorrhage_Trigger_Rate,Hemorrhage_Frequency,Avg_Hemorrhage_Damage');
  
  results.forEach(({ result, config: weaponConfig }) => {
    const stats = result.analysis.damageStats;
    const hemorrhage = result.analysis.hemorrhageStats;
    

    
    summaryData.push([
      weaponConfig.name,
      weaponConfig.hemorrhageDice || 'None',
      (reportConfig.advantageRate * 100).toFixed(0) + '%',
      stats.mean.toFixed(1),
      stats.median.toFixed(1),
      stats.min.toString(),
      stats.max.toString(),
      stats.standardDeviation.toFixed(1),
      stats.percentiles.p25.toFixed(1),
      stats.percentiles.p75.toFixed(1),
      stats.percentiles.p90.toFixed(1),
      stats.percentiles.p95.toFixed(1),
      hemorrhage ? (hemorrhage.triggerRate * 100).toFixed(1) : '0',
      hemorrhage ? hemorrhage.triggerFrequency.toFixed(2) : '0',
      hemorrhage ? hemorrhage.averageDamagePerTrigger.toFixed(1) : '0'
    ].join(','));
  });

  // Raw data CSV
  const rawData: string[] = [];
  const headers = ['Combat_Number'];
  results.forEach(({ config }) => {
    headers.push(config.name);
  });
  rawData.push(headers.join(','));
  
  for (let i = 0; i < reportConfig.iterations; i++) {
    const row: (string | number)[] = [i + 1];
    results.forEach(({ result }) => {
      row.push(result.rawResults[i]?.totalDamage || 0);
    });
    rawData.push(row.join(','));
  }

  // Frequency distribution CSV
  const createFrequencyDistribution = (damages: number[], weaponName: string) => {
    const min = Math.min(...damages);
    const max = Math.max(...damages);
    const binSize = Math.max(1, Math.ceil((max - min) / 25));
    
    const bins: { [key: number]: number } = {};
    
    damages.forEach(damage => {
      const binStart = Math.floor((damage - min) / binSize) * binSize + min;
      bins[binStart] = (bins[binStart] || 0) + 1;
    });
    
    const distribution: string[] = [];
    
    Object.entries(bins)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([binStart, count]) => {
        const binEnd = parseInt(binStart) + binSize - 1;
        distribution.push([
          `${binStart}-${binEnd}`,
          count,
          weaponName
        ].join(','));
      });
    
    return distribution;
  };

  const combinedFreq: string[] = [];
  combinedFreq.push('Damage_Range,Frequency,Weapon');
  
  results.forEach(({ result, config }) => {
    const damages = result.rawResults.map((combat: any) => combat.totalDamage);
    const freq = createFrequencyDistribution(damages, config.name);
    combinedFreq.push(...freq);
  });

  // Save CSV files
  const csvDir = path.join(__dirname, 'csv');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }
  
  const filePrefix = `hemorrhage-comparison-${reportConfig.name}`;
  fs.writeFileSync(path.join(csvDir, `${filePrefix}-summary.csv`), summaryData.join('\n'));
  fs.writeFileSync(path.join(csvDir, `${filePrefix}-raw.csv`), rawData.join('\n'));
  fs.writeFileSync(path.join(csvDir, `${filePrefix}-frequency.csv`), combinedFreq.join('\n'));
  
  console.log(`✅ ${reportConfig.description} data generated:`);
  console.log(`  📄 reports/csv/${filePrefix}-summary.csv`);
  console.log(`  📄 reports/csv/${filePrefix}-raw.csv`);
  console.log(`  📄 reports/csv/${filePrefix}-frequency.csv`);
  
  // Display results summary
  console.log(`\n📊 Results Summary (${reportConfig.description}):`);
  results.forEach(({ result, config }) => {
    const stats = result.analysis.damageStats;
    const hemorrhage = result.analysis.hemorrhageStats;
    console.log(`${config.displayName}: ${stats.mean.toFixed(1)} avg damage`);
    if (hemorrhage) {
      console.log(`  Hemorrhage: ${(hemorrhage.triggerRate * 100).toFixed(1)}% trigger rate`);
    }
  });
  
  // Calculate improvements
  if (results.length >= 3) {
    const result4d6 = results.find(r => r.config.name === 'sanguine_4d6')?.result;
    const result6d6 = results.find(r => r.config.name === 'sanguine_6d6')?.result;
    const resultControl = results.find(r => r.config.name === 'control_dagger')?.result;
    
    if (result4d6 && result6d6 && resultControl) {
      const improvement4d6to6d6 = ((result6d6.analysis.damageStats.mean - result4d6.analysis.damageStats.mean) / result4d6.analysis.damageStats.mean * 100);
      const improvement6d6vsControl = ((result6d6.analysis.damageStats.mean - resultControl.analysis.damageStats.mean) / resultControl.analysis.damageStats.mean * 100);
      
      console.log(`\n📈 Damage Improvements:`);
      console.log(`  4d6 → 6d6 hemorrhage: +${improvement4d6to6d6.toFixed(1)}%`);
      console.log(`  6d6 vs +1 Dagger: +${improvement6d6vsControl.toFixed(1)}%`);
    }
  }
}

// Allow running specific report types via command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  const reportType = args[0]?.toLowerCase();
  if (reportType === 'flat' || reportType === 'advantage') {
    console.log(`Running only ${reportType} report...`);
    // Could modify to run only specific report type
  }
}

generateUnifiedHemorrhageComparison().catch(console.error);