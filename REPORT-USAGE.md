# Weapon Damage Simulator - Report Generation

This system provides automated weapon balance testing and report generation for D&D 5e weapons.

## Quick Start

1. **Run a basic report:**
   ```bash
   npm run report
   ```

2. **View the results:**
   - Console output shows immediate results
   - Files are saved to `reports/` directory
   - JSON, CSV, and text formats available

## Configuration

Edit `report-config.json` to customize your analysis:

### Simulation Settings
```json
{
  "simulation": {
    "iterations": 1000,        // Number of combat simulations per test
    "seed": 12345,            // Random seed for reproducible results
    "scenarios": [            // Combat scenarios to test
      {
        "name": "Standard Combat",
        "rounds": 10,
        "targetAC": 15,
        "targetSize": "medium",
        "advantageRate": 0.3,
        "attacksPerRound": 1
      }
    ]
  }
}
```

### Entity Configuration
```json
{
  "entities": {
    "characters": [
      "entities/characters/level-5-swashbuckler-rogue.json",
      "entities/characters/level-7-champion-fighter.json"
    ],
    "weapons": [
      "entities/weapons/sanguine-messer.json",
      "entities/weapons/flame-tongue-sword.json"
    ],
    "baselines": [
      "entities/weapons/baseline-rapier-plus-1.json",
      "entities/weapons/baseline-longsword-plus-1.json"
    ]
  }
}
```

### Report Options
```json
{
  "report": {
    "includeRawData": false,           // Include raw simulation data
    "highlightThresholds": {
      "significantDifference": 15,     // % difference to highlight
      "highVariance": 0.3,            // Coefficient of variation threshold
      "lowConsistency": 0.7           // Stability index threshold
    },
    "exportFormats": ["console", "json", "csv"],
    "colorOutput": true,              // Colored console output
    "outputDirectory": "reports"      // Where to save files
  }
}
```

## Adding New Entities

### Creating a New Character

1. Create a JSON file in `entities/characters/`:
   ```json
   {
     "name": "Level 5 Barbarian",
     "level": 5,
     "class": "Barbarian",
     "subclass": "Berserker",
     "abilityScores": {
       "strength": 16,
       "dexterity": 14,
       "constitution": 16,
       "intelligence": 8,
       "wisdom": 12,
       "charisma": 10
     },
     "proficiencyBonus": 3,
     "classFeatures": [
       {
         "name": "Rage",
         "type": "triggered",
         "trigger": "turn",
         "effect": {
           "type": "damage",
           "value": 2,
           "condition": "melee_attack"
         }
       }
     ],
     "attackModifiers": [
       {
         "name": "Strength",
         "hitBonus": 3,
         "critRange": 20
       }
     ],
     "damageModifiers": [
       {
         "name": "Strength",
         "damageBonus": 3,
         "damageType": "slashing",
         "trigger": "always"
       }
     ]
   }
   ```

2. Add the file path to `report-config.json`:
   ```json
   "characters": [
     "entities/characters/level-5-barbarian.json"
   ]
   ```

### Creating a New Weapon

1. Create a JSON file in `entities/weapons/`:
   ```json
   {
     "name": "Frost Brand Sword",
     "rarity": "very-rare",
     "baseDamage": "1d8",
     "damageType": "slashing",
     "properties": ["versatile"],
     "magicalBonus": 1,
     "specialMechanics": [
       {
         "name": "Frost Damage",
         "type": "elemental",
         "parameters": {
           "damageType": "cold",
           "bonusDamage": "1d6",
           "trigger": "hit"
         }
       }
     ]
   }
   ```

2. Add to configuration:
   ```json
   "weapons": [
     "entities/weapons/frost-brand-sword.json"
   ]
   ```

### Creating Baseline Weapons

Baseline weapons are standard magic weapons used for comparison:

```json
{
  "name": "Baseline Scimitar +2",
  "rarity": "rare",
  "baseDamage": "1d6",
  "damageType": "slashing",
  "properties": ["finesse", "light"],
  "magicalBonus": 2,
  "specialMechanics": []
}
```

## Understanding Reports

### Console Output
- **Executive Summary**: High-level statistics and balance assessment
- **Detailed Analysis**: Per-weapon breakdown with key metrics
- **Baseline Comparisons**: Performance vs standard weapons
- **Recommendations**: Balance suggestions with priority levels

### File Outputs
- **JSON**: Complete data for further analysis
- **CSV**: Spreadsheet-compatible format
- **TXT**: Human-readable formatted report

### Key Metrics
- **Mean Damage**: Average damage per combat
- **Consistency Rating**: How reliable the weapon's damage is
- **Hemorrhage Stats**: Special mechanic effectiveness (if applicable)
- **Balance Rating**: Compared to baseline weapons
- **Confidence Intervals**: Statistical significance of differences

## Advanced Usage

### Custom Scenarios
Test different combat situations:
```json
{
  "name": "Boss Fight",
  "rounds": 20,
  "targetAC": 19,
  "targetSize": "large",
  "advantageRate": 0.1,
  "attacksPerRound": 1
}
```

### Multiple Configurations
Create different config files for different tests:
```bash
npm run report -- --config boss-fight-config.json
npm run report -- --config low-level-config.json
```

### Batch Testing
Test multiple weapon variants by creating multiple JSON files and adding them to the configuration.

## Troubleshooting

### Common Issues
1. **File not found**: Check file paths in configuration
2. **Invalid JSON**: Validate JSON syntax in entity files
3. **Missing properties**: Ensure all required fields are present

### Getting Help
```bash
npm run report -- --help
```

## Examples

The `entities/` directory contains example characters and weapons to get you started:
- **Characters**: Rogue, Fighter examples
- **Weapons**: Sanguine Messer, Flame Tongue, baseline weapons
- **Configuration**: Pre-configured scenarios for common testing

Start with these examples and modify them for your specific needs!