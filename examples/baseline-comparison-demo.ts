/**
 * Demonstration of the baseline weapon comparison system
 * Shows how to compare weapons against standard baselines
 */

import { BaselineComparison, BaselineUtils } from '../simulation/baseline';
import { SimulationEngine, SimulationConfigBuilder } from '../simulation/simulation';
import { CharacterBuilder } from '../characters/character';
import { WeaponBuilder } from '../weapons/weapon';
import { CombatScenario } from '../combat/combat';

async function demonstrateBaselineComparison() {
  console.log('=== BASELINE WEAPON COMPARISON DEMONSTRATION ===\n');

  try {
    // Initialize the baseline comparison system
    const baselineComparison = new BaselineComparison();
    
    // Load test character (Level 5 Rogue)
    const character = CharacterBuilder.loadFromFile('characters/level-5-swashbuckler-rogue.json');
    console.log(`Loaded character: ${character.getName()} (Level ${character.getLevel()})`);

    // Load test weapon (Sanguine Messer)
    const testWeapon = WeaponBuilder.loadFromFile('weapons/sanguine-messer/sanguine-messer.json');
    console.log(`Loaded test weapon: ${testWeapon.getName()}`);

    // Get appropriate baselines for character level
    const characterLevel = character.getLevel();
    const baselineTemplates = baselineComparison.getBaselinesForLevel(characterLevel);
    console.log(`\nFound ${baselineTemplates.length} appropriate baseline weapons for level ${characterLevel}:`);
    baselineTemplates.forEach(template => {
      console.log(`  - ${template.name} (${template.rarity}, +${template.magicalBonus})`);
    });

    // Create simulation configuration
    const config = new SimulationConfigBuilder()
      .iterations(1000)
      .seed(12345)
      .scenarios([
        {
          rounds: 10,
          targetAC: 15,
          targetSize: 'medium',
          advantageRate: 0.3,
          attacksPerRound: 1
        },
        {
          rounds: 10,
          targetAC: 17,
          targetSize: 'large',
          advantageRate: 0.5,
          attacksPerRound: 1
        }
      ])
      .characters(['characters/level-5-swashbuckler-rogue.json'])
      .weapons(['weapons/sanguine-messer/sanguine-messer.json'])
      .build();

    const simulationEngine = new SimulationEngine(config);

    // Run baseline comparison
    console.log('\n=== RUNNING BASELINE COMPARISONS ===');
    console.log('This may take a moment...\n');

    const comparisons = await baselineComparison.runBaselineComparison(
      testWeapon,
      character,
      config.scenarios,
      simulationEngine
    );

    // Generate comprehensive report
    const report = baselineComparison.generateComparisonReport(comparisons);

    // Display formatted report
    console.log(BaselineUtils.formatComparisonReport(report));

    // Export baseline weapon definitions
    console.log('\n=== BASELINE WEAPON DEFINITIONS ===');
    const baselineDefinitions = baselineComparison.exportBaselineDefinitions();
    console.log('Available baseline weapon files:');
    Object.keys(baselineDefinitions).forEach(filename => {
      console.log(`  - ${filename}`);
    });

    // Export comparison data as CSV
    console.log('\n=== EXPORTING COMPARISON DATA ===');
    const csvData = BaselineUtils.exportComparisonCSV(report);
    console.log('CSV export preview (first 3 lines):');
    const csvLines = csvData.split('\n');
    csvLines.slice(0, 3).forEach(line => console.log(line));
    console.log(`... (${csvLines.length - 3} more lines)`);

    // Demonstrate individual baseline creation
    console.log('\n=== INDIVIDUAL BASELINE CREATION ===');
    const customBaseline = WeaponBuilder.createBaseline(
      'Custom Baseline Shortsword +1',
      '1d6',
      1,
      'piercing'
    );
    console.log(`Created custom baseline: ${customBaseline.getDisplayName()}`);
    console.log(`  Base damage: ${customBaseline.getBaseDamage()}`);
    console.log(`  Magical bonus: +${customBaseline.getMagicalBonus()}`);
    console.log(`  Rarity: ${customBaseline.getRarity()}`);

  } catch (error) {
    console.error('Error during baseline comparison demonstration:', error);
    process.exit(1);
  }
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateBaselineComparison()
    .then(() => {
      console.log('\n=== DEMONSTRATION COMPLETE ===');
      console.log('The baseline comparison system is ready for use!');
    })
    .catch(error => {
      console.error('Demonstration failed:', error);
      process.exit(1);
    });
}

export { demonstrateBaselineComparison };