/**
 * Simple demonstration of baseline weapon comparison functionality
 * Shows core features without requiring full simulation runs
 */

import { BaselineComparison, BaselineUtils } from '../simulation/baseline';
import { WeaponBuilder } from '../weapons/weapon';

function demonstrateBaselineSystem() {
  console.log('=== BASELINE WEAPON COMPARISON SYSTEM DEMO ===\n');

  // Initialize the baseline comparison system
  const baselineComparison = new BaselineComparison();
  
  console.log('1. Available Baseline Templates:');
  const templates = baselineComparison.getBaselineTemplates();
  templates.forEach(template => {
    console.log(`   - ${template.name} (${template.rarity}, +${template.magicalBonus}, levels ${template.levelRange.min}-${template.levelRange.max})`);
  });
  
  console.log('\n2. Level-Appropriate Baselines:');
  const level5Baselines = baselineComparison.getBaselinesForLevel(5);
  console.log(`   Level 5 has ${level5Baselines.length} appropriate baselines:`);
  level5Baselines.forEach(template => {
    console.log(`     - ${template.name} (+${template.magicalBonus})`);
  });
  
  const level10Baselines = baselineComparison.getBaselinesForLevel(10);
  console.log(`   Level 10 has ${level10Baselines.length} appropriate baselines:`);
  level10Baselines.forEach(template => {
    console.log(`     - ${template.name} (+${template.magicalBonus})`);
  });
  
  console.log('\n3. Creating Baseline Weapons:');
  const baselineWeapons = baselineComparison.createBaselineWeapons(level5Baselines);
  baselineWeapons.forEach(weapon => {
    console.log(`   - ${weapon.getDisplayName()}: ${weapon.getBaseDamage()} ${weapon.getDamageType()}, ${weapon.getRarity()}`);
  });
  
  console.log('\n4. Custom Baseline Creation:');
  const customBaseline = WeaponBuilder.createBaseline(
    'Demo Shortsword',
    '1d6',
    1,
    'piercing'
  );
  console.log(`   Created: ${customBaseline.getDisplayName()}`);
  console.log(`   Properties: ${customBaseline.getBaseDamage()} ${customBaseline.getDamageType()}, ${customBaseline.getRarity()}`);
  
  console.log('\n5. Baseline Weapon Definitions Export:');
  const definitions = baselineComparison.exportBaselineDefinitions();
  console.log(`   Generated ${Object.keys(definitions).length} weapon definition files:`);
  Object.keys(definitions).slice(0, 5).forEach(filename => {
    console.log(`     - ${filename}`);
  });
  if (Object.keys(definitions).length > 5) {
    console.log(`     ... and ${Object.keys(definitions).length - 5} more`);
  }
  
  console.log('\n6. Empty Comparison Report:');
  const emptyReport = baselineComparison.generateComparisonReport([]);
  const formattedReport = BaselineUtils.formatComparisonReport(emptyReport);
  console.log('   Generated report structure (first 5 lines):');
  formattedReport.split('\n').slice(0, 5).forEach(line => {
    console.log(`     ${line}`);
  });
  
  console.log('\n7. CSV Export Capability:');
  const csvData = BaselineUtils.exportComparisonCSV(emptyReport);
  console.log('   CSV headers:');
  console.log(`     ${csvData.split('\n')[0]}`);
  
  console.log('\n=== BASELINE SYSTEM READY FOR USE ===');
  console.log('The baseline comparison system provides:');
  console.log('  ✓ Standard D&D weapon baselines (+1, +2, +3)');
  console.log('  ✓ Level-appropriate baseline selection');
  console.log('  ✓ Weapon comparison analysis framework');
  console.log('  ✓ Performance ranking system');
  console.log('  ✓ Balance assessment and recommendations');
  console.log('  ✓ Multiple export formats (JSON, CSV)');
  console.log('  ✓ Extensible baseline template system');
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  try {
    demonstrateBaselineSystem();
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

export { demonstrateBaselineSystem };