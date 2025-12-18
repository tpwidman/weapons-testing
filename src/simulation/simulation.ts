/**
 * Simulation engine for running weapon damage simulations
 * Handles configuration loading, iteration control, and result collection
 */

import { Character, CharacterBuilder } from '../characters/character';
import { Weapon, WeaponBuilder } from '../weapons/weapon';
import { CombatResolver, CombatScenario, CombatResult } from '../combat/combat';
import { DiceEngine } from '../core/dice';
import { StatisticalAnalyzer, StatisticalAnalysis } from '../simulation/statistics';

/**
 * Configuration for simulation runs
 */
export interface SimulationConfig {
  iterations: number;
  seed?: number;
  scenarios: CombatScenario[];
  characters: string[]; // paths to character JSON files
  weapons: string[]; // paths to weapon JSON files
  baselines?: string[]; // baseline weapons for comparison
}

// Re-export statistical types for backward compatibility
export { DamageStatistics, HemorrhageStatistics, ConsistencyMetrics, StatisticalAnalysis } from '../simulation/statistics';



/**
 * Comparison metrics between weapons
 */
export interface ComparisonMetrics {
  baselineWeapon: string;
  damagePercentageDifference: number;
  consistencyComparison: number; // CV comparison
  hemorrhageAdvantage?: number; // additional damage from hemorrhage
  balanceRating: 'underpowered' | 'balanced' | 'overpowered';
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * Complete simulation result
 */
export interface SimulationResult {
  characterName: string;
  weaponName: string;
  scenario: CombatScenario;
  iterations: number;
  seed: number | undefined;
  analysis: StatisticalAnalysis;
  comparison: ComparisonMetrics | undefined;
  rawResults: CombatResult[];
  timestamp: Date;
}

/**
 * Core simulation engine
 */
export class SimulationEngine {
  private config: SimulationConfig;
  private combatResolver: CombatResolver;
  private diceEngine: DiceEngine;
  private statisticalAnalyzer: StatisticalAnalyzer;

  constructor(config: SimulationConfig) {
    this.config = config;
    
    // Initialize dice engine with seed if provided
    this.diceEngine = new DiceEngine(config.seed);
    this.combatResolver = new CombatResolver(this.diceEngine);
    this.statisticalAnalyzer = new StatisticalAnalyzer();
  }

  /**
   * Run a single simulation for a character/weapon/scenario combination
   */
  runSimulation(character: Character, weapon: Weapon, scenario: CombatScenario): SimulationResult {
    const rawResults: CombatResult[] = [];
    
    // Run the specified number of iterations
    for (let i = 0; i < this.config.iterations; i++) {
      const combatResult = this.combatResolver.simulateCombat(character, weapon, scenario);
      rawResults.push(combatResult);
    }

    // Use StatisticalAnalyzer for comprehensive analysis
    const analysis = this.statisticalAnalyzer.analyze(rawResults);

    return {
      characterName: character.getName(),
      weaponName: weapon.getName(),
      scenario,
      iterations: this.config.iterations,
      seed: this.config.seed,
      analysis,
      comparison: undefined,
      rawResults,
      timestamp: new Date()
    };
  }

  /**
   * Run comparison analysis between multiple simulation results
   */
  runComparison(results: SimulationResult[], baselineResults?: SimulationResult[]): SimulationResult[] {
    if (!baselineResults || baselineResults.length === 0) {
      return results; // No comparison possible
    }

    // Add comparison metrics to each result
    return results.map(result => {
      // Find matching baseline (same character, same scenario)
      const matchingBaseline = baselineResults.find(baseline => 
        baseline.characterName === result.characterName &&
        this.scenariosMatch(baseline.scenario, result.scenario)
      );

      if (matchingBaseline) {
        const comparison = this.calculateComparisonMetrics(result, matchingBaseline);
        return {
          ...result,
          comparison
        };
      }

      return result;
    });
  }

  /**
   * Export simulation results to different formats
   */
  exportResults(results: SimulationResult[], format: 'json' | 'csv'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);
      
      case 'csv':
        return this.convertToCSV(results);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Load characters from configuration
   */
  loadCharacters(): Character[] {
    return this.config.characters.map(characterPath => {
      try {
        return CharacterBuilder.loadFromFile(characterPath);
      } catch (error) {
        throw new Error(`Failed to load character from ${characterPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Load weapons from configuration
   */
  loadWeapons(): Weapon[] {
    return this.config.weapons.map(weaponPath => {
      try {
        return WeaponBuilder.loadFromFile(weaponPath, this.diceEngine);
      } catch (error) {
        throw new Error(`Failed to load weapon from ${weaponPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Load baseline weapons for comparison
   */
  loadBaselines(): Weapon[] {
    if (!this.config.baselines) {
      return [];
    }

    return this.config.baselines.map(baselinePath => {
      try {
        return WeaponBuilder.loadFromFile(baselinePath, this.diceEngine);
      } catch (error) {
        throw new Error(`Failed to load baseline weapon from ${baselinePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Get simulation configuration
   */
  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  /**
   * Update simulation configuration
   */
  updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize dice engine if seed changed
    if (newConfig.seed !== undefined) {
      this.diceEngine = new DiceEngine(newConfig.seed);
      this.combatResolver = new CombatResolver(this.diceEngine);
    }
  }





  /**
   * Calculate comparison metrics between two simulation results
   */
  private calculateComparisonMetrics(result: SimulationResult, baseline: SimulationResult): ComparisonMetrics {
    const damagePercentageDifference = baseline.analysis.damageStats.mean > 0 
      ? ((result.analysis.damageStats.mean - baseline.analysis.damageStats.mean) / baseline.analysis.damageStats.mean) * 100
      : 0;

    const consistencyComparison = baseline.analysis.damageStats.coefficientOfVariation > 0
      ? result.analysis.damageStats.coefficientOfVariation / baseline.analysis.damageStats.coefficientOfVariation
      : 1;

    // Calculate special mechanic advantage (hemorrhage)
    let hemorrhageAdvantage = 0;
    if (result.analysis.hemorrhageStats) {
      hemorrhageAdvantage = result.analysis.hemorrhageStats.triggerFrequency;
    }

    // Determine balance rating
    let balanceRating: 'underpowered' | 'balanced' | 'overpowered';
    if (damagePercentageDifference < -10) {
      balanceRating = 'underpowered';
    } else if (damagePercentageDifference > 20) {
      balanceRating = 'overpowered';
    } else {
      balanceRating = 'balanced';
    }

    // Calculate confidence interval (95% CI for mean difference)
    const pooledStdDev = Math.sqrt(
      (result.analysis.damageStats.variance + baseline.analysis.damageStats.variance) / 2
    );
    const standardError = pooledStdDev * Math.sqrt(2 / result.iterations);
    const marginOfError = 1.96 * standardError; // 95% CI

    const meanDifference = result.analysis.damageStats.mean - baseline.analysis.damageStats.mean;
    const confidenceInterval = {
      lower: meanDifference - marginOfError,
      upper: meanDifference + marginOfError
    };

    return {
      baselineWeapon: baseline.weaponName,
      damagePercentageDifference,
      consistencyComparison,
      hemorrhageAdvantage,
      balanceRating,
      confidenceInterval
    };
  }

  /**
   * Check if two scenarios match for comparison purposes
   */
  private scenariosMatch(scenario1: CombatScenario, scenario2: CombatScenario): boolean {
    return scenario1.rounds === scenario2.rounds &&
           scenario1.targetAC === scenario2.targetAC &&
           scenario1.targetSize === scenario2.targetSize &&
           scenario1.advantageRate === scenario2.advantageRate &&
           scenario1.attacksPerRound === scenario2.attacksPerRound;
  }



  /**
   * Convert simulation results to CSV format
   */
  private convertToCSV(results: SimulationResult[]): string {
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
      'Scenario_AttacksPerRound',
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
      'P99_Damage',
      'Coefficient_of_Variation',
      'Consistency_Rating',
      'Stability_Index',
      'Hemorrhage_Trigger_Frequency',
      'Hemorrhage_Trigger_Rate',
      'Hemorrhage_Avg_Turns_To_Trigger',
      'Hemorrhage_Avg_Damage_Per_Trigger',
      'Baseline_Weapon',
      'Damage_Percentage_Difference',
      'Balance_Rating',
      'Timestamp'
    ];

    const csvRows = [headers.join(',')];

    for (const result of results) {
      const stats = result.analysis.damageStats;
      const hemorrhageStats = result.analysis.hemorrhageStats;
      const consistencyMetrics = result.analysis.consistencyMetrics;

      const row = [
        result.characterName,
        result.weaponName,
        result.scenario.rounds.toString(),
        result.scenario.targetAC.toString(),
        result.scenario.targetSize,
        result.scenario.advantageRate.toString(),
        result.scenario.attacksPerRound.toString(),
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
        stats.percentiles.p99.toFixed(2),
        stats.coefficientOfVariation.toFixed(4),
        consistencyMetrics.consistencyRating,
        consistencyMetrics.stabilityIndex.toFixed(3),
        hemorrhageStats?.triggerFrequency.toFixed(4) || '0',
        hemorrhageStats?.triggerRate.toFixed(4) || '0',
        hemorrhageStats?.averageTurnsToTrigger.toFixed(2) || '0',
        hemorrhageStats?.averageDamagePerTrigger.toFixed(2) || '0',
        result.comparison?.baselineWeapon || '',
        result.comparison?.damagePercentageDifference.toFixed(2) || '',
        result.comparison?.balanceRating || '',
        result.timestamp.toISOString()
      ];

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}

/**
 * Configuration builder utility
 */
export class SimulationConfigBuilder {
  private config: Partial<SimulationConfig> = {};

  /**
   * Set number of iterations
   */
  iterations(count: number): SimulationConfigBuilder {
    if (count < 1) {
      throw new Error('Iterations must be at least 1');
    }
    this.config.iterations = count;
    return this;
  }

  /**
   * Set random seed for reproducible results
   */
  seed(seedValue: number): SimulationConfigBuilder {
    this.config.seed = seedValue;
    return this;
  }

  /**
   * Add combat scenarios
   */
  scenarios(scenarios: CombatScenario[]): SimulationConfigBuilder {
    this.config.scenarios = [...scenarios];
    return this;
  }

  /**
   * Add character file paths
   */
  characters(characterPaths: string[]): SimulationConfigBuilder {
    this.config.characters = [...characterPaths];
    return this;
  }

  /**
   * Add weapon file paths
   */
  weapons(weaponPaths: string[]): SimulationConfigBuilder {
    this.config.weapons = [...weaponPaths];
    return this;
  }

  /**
   * Add baseline weapon file paths
   */
  baselines(baselinePaths: string[]): SimulationConfigBuilder {
    this.config.baselines = [...baselinePaths];
    return this;
  }

  /**
   * Build the configuration
   */
  build(): SimulationConfig {
    if (!this.config.iterations) {
      throw new Error('Iterations must be specified');
    }
    if (!this.config.scenarios || this.config.scenarios.length === 0) {
      throw new Error('At least one scenario must be specified');
    }
    if (!this.config.characters || this.config.characters.length === 0) {
      throw new Error('At least one character must be specified');
    }
    if (!this.config.weapons || this.config.weapons.length === 0) {
      throw new Error('At least one weapon must be specified');
    }

    return this.config as SimulationConfig;
  }

  /**
   * Create a default configuration for testing
   */
  static createDefault(): SimulationConfig {
    return new SimulationConfigBuilder()
      .iterations(1000)
      .scenarios([{
        rounds: 10,
        targetAC: 15,
        targetSize: 'medium',
        advantageRate: 0.3,
        attacksPerRound: 1
      }])
      .characters(['data/characters/level-5-swashbuckler-rogue.json'])
      .weapons(['data/weapons/sanguine-messer/sanguine-messer.json'])
      .build();
  }
}