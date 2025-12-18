/**
 * Tests for the SimulationEngine class
 */

import { SimulationEngine, SimulationConfigBuilder } from '../simulation/simulation';
import { CharacterBuilder } from '../characters/character';
import { WeaponBuilder } from '../weapons/weapon';
import { CombatScenario } from '../combat/combat';
import { DiceEngine } from '../core/dice';

describe('SimulationEngine', () => {
  let mockCharacterTemplate: any;
  let mockWeaponDefinition: any;
  let testScenario: CombatScenario;

  beforeEach(() => {
    mockCharacterTemplate = {
      name: 'Test Rogue',
      level: 5,
      class: 'Rogue',
      subclass: 'Thief',
      abilityScores: {
        strength: 10,
        dexterity: 17,
        constitution: 14,
        intelligence: 12,
        wisdom: 13,
        charisma: 14
      },
      proficiencyBonus: 3,
      classFeatures: [],
      attackModifiers: [
        { name: 'Dexterity', hitBonus: 3, critRange: 20 },
        { name: 'Proficiency', hitBonus: 3, critRange: 20 }
      ],
      damageModifiers: [
        { name: 'Dexterity', damageBonus: 3, damageType: 'piercing', trigger: 'always' }
      ]
    };

    mockWeaponDefinition = {
      name: 'Test Weapon',
      rarity: 'common' as const,
      baseDamage: '1d8',
      damageType: 'slashing',
      properties: ['finesse'],
      magicalBonus: 0,
      specialMechanics: []
    };

    testScenario = {
      rounds: 3,
      targetAC: 15,
      targetSize: 'medium',
      advantageRate: 0.3,
      attacksPerRound: 1
    };
  });

  describe('constructor', () => {
    test('creates simulation engine with valid configuration', () => {
      const config = SimulationConfigBuilder.createDefault();
      const engine = new SimulationEngine(config);
      
      expect(engine).toBeInstanceOf(SimulationEngine);
      expect(engine.getConfig()).toEqual(config);
    });

    test('creates simulation engine with seed', () => {
      const config = new SimulationConfigBuilder()
        .iterations(100)
        .seed(12345)
        .scenarios([testScenario])
        .characters(['test-character.json'])
        .weapons(['test-weapon.json'])
        .build();

      const engine = new SimulationEngine(config);
      expect(engine.getConfig().seed).toBe(12345);
    });
  });

  describe('runSimulation', () => {
    test('runs simulation with specified iterations', () => {
      const config = new SimulationConfigBuilder()
        .iterations(10)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const engine = new SimulationEngine(config);
      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      const weapon = WeaponBuilder.fromDefinition(mockWeaponDefinition);
      
      const result = engine.runSimulation(character, weapon, testScenario);

      expect(result.iterations).toBe(10);
      expect(result.rawResults).toHaveLength(10);
      expect(result.characterName).toBe('Test Rogue');
      expect(result.weaponName).toBe('Test Weapon');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.damageStats.mean).toBeGreaterThanOrEqual(0);
      expect(result.analysis.damageStats.min).toBeLessThanOrEqual(result.analysis.damageStats.max);
    });

    test('produces reproducible results with same seed', () => {
      const config = new SimulationConfigBuilder()
        .iterations(5)
        .seed(42)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      
      // Create seeded dice engines for consistent results
      const diceEngine1 = new DiceEngine(42);
      const diceEngine2 = new DiceEngine(42);
      
      const weapon1 = WeaponBuilder.fromDefinition(mockWeaponDefinition, diceEngine1);
      const weapon2 = WeaponBuilder.fromDefinition(mockWeaponDefinition, diceEngine2);

      const engine1 = new SimulationEngine(config);
      const engine2 = new SimulationEngine(config);

      const result1 = engine1.runSimulation(character, weapon1, testScenario);
      const result2 = engine2.runSimulation(character, weapon2, testScenario);

      // With seeded random, results should be identical
      expect(result1.analysis.damageStats.mean).toBe(result2.analysis.damageStats.mean);
      expect(result1.seed).toBe(result2.seed);
      expect(result1.seed).toBe(42);
    });

    test('calculates damage statistics correctly', () => {
      const config = new SimulationConfigBuilder()
        .iterations(100)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const engine = new SimulationEngine(config);
      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      const weapon = WeaponBuilder.fromDefinition(mockWeaponDefinition);
      
      const result = engine.runSimulation(character, weapon, testScenario);

      expect(result.analysis.damageStats.mean).toBeGreaterThan(0);
      expect(result.analysis.damageStats.median).toBeGreaterThan(0);
      expect(result.analysis.damageStats.standardDeviation).toBeGreaterThanOrEqual(0);
      expect(result.analysis.damageStats.min).toBeLessThanOrEqual(result.analysis.damageStats.median);
      expect(result.analysis.damageStats.median).toBeLessThanOrEqual(result.analysis.damageStats.max);
      expect(result.analysis.damageStats.percentiles.p25).toBeLessThanOrEqual(result.analysis.damageStats.percentiles.p75);
      expect(result.analysis.damageStats.coefficientOfVariation).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runComparison', () => {
    test('adds comparison metrics when baseline provided', () => {
      const config = new SimulationConfigBuilder()
        .iterations(50)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const engine = new SimulationEngine(config);
      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      const weapon = WeaponBuilder.fromDefinition(mockWeaponDefinition);
      
      const result = engine.runSimulation(character, weapon, testScenario);
      const baselineResult = engine.runSimulation(character, weapon, testScenario);

      const comparedResults = engine.runComparison([result], [baselineResult]);

      expect(comparedResults).toHaveLength(1);
      expect(comparedResults[0]?.comparison).toBeDefined();
      if (comparedResults[0]?.comparison) {
        expect(comparedResults[0].comparison.baselineWeapon).toBe('Test Weapon');
        expect(comparedResults[0].comparison.balanceRating).toMatch(/underpowered|balanced|overpowered/);
      }
    });

    test('returns results unchanged when no baseline provided', () => {
      const config = new SimulationConfigBuilder()
        .iterations(10)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const engine = new SimulationEngine(config);
      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      const weapon = WeaponBuilder.fromDefinition(mockWeaponDefinition);
      
      const result = engine.runSimulation(character, weapon, testScenario);
      const comparedResults = engine.runComparison([result], []);

      expect(comparedResults).toHaveLength(1);
      expect(comparedResults[0]?.comparison).toBeUndefined();
    });
  });

  describe('exportResults', () => {
    test('exports results to JSON format', () => {
      const config = new SimulationConfigBuilder()
        .iterations(5)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const engine = new SimulationEngine(config);
      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      const weapon = WeaponBuilder.fromDefinition(mockWeaponDefinition);
      
      const result = engine.runSimulation(character, weapon, testScenario);
      const jsonExport = engine.exportResults([result], 'json');

      expect(() => JSON.parse(jsonExport)).not.toThrow();
      const parsed = JSON.parse(jsonExport);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].characterName).toBe('Test Rogue');
    });

    test('exports results to CSV format', () => {
      const config = new SimulationConfigBuilder()
        .iterations(5)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const engine = new SimulationEngine(config);
      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      const weapon = WeaponBuilder.fromDefinition(mockWeaponDefinition);
      
      const result = engine.runSimulation(character, weapon, testScenario);
      const csvExport = engine.exportResults([result], 'csv');

      expect(csvExport).toContain('Character,Weapon');
      expect(csvExport).toContain('Test Rogue,Test Weapon');
      const lines = csvExport.split('\n');
      expect(lines.length).toBe(2); // Header + 1 data row
    });

    test('throws error for unsupported format', () => {
      const config = new SimulationConfigBuilder()
        .iterations(5)
        .scenarios([testScenario])
        .characters(['test'])
        .weapons(['test'])
        .build();

      const engine = new SimulationEngine(config);
      const character = CharacterBuilder.fromTemplate(mockCharacterTemplate);
      const weapon = WeaponBuilder.fromDefinition(mockWeaponDefinition);
      
      const result = engine.runSimulation(character, weapon, testScenario);

      expect(() => {
        engine.exportResults([result], 'xml' as any);
      }).toThrow('Unsupported export format: xml');
    });
  });

  describe('updateConfig', () => {
    test('updates configuration and reinitializes dice engine when seed changes', () => {
      const config = SimulationConfigBuilder.createDefault();
      const engine = new SimulationEngine(config);

      engine.updateConfig({ seed: 999, iterations: 500 });

      const updatedConfig = engine.getConfig();
      expect(updatedConfig.seed).toBe(999);
      expect(updatedConfig.iterations).toBe(500);
    });
  });
});

describe('SimulationConfigBuilder', () => {
  test('builds valid configuration', () => {
    const config = new SimulationConfigBuilder()
      .iterations(1000)
      .seed(42)
      .scenarios([{
        rounds: 10,
        targetAC: 15,
        targetSize: 'medium',
        advantageRate: 0.3,
        attacksPerRound: 1
      }])
      .characters(['character1.json'])
      .weapons(['weapon1.json'])
      .baselines(['baseline1.json'])
      .build();

    expect(config.iterations).toBe(1000);
    expect(config.seed).toBe(42);
    expect(config.scenarios).toHaveLength(1);
    expect(config.characters).toEqual(['character1.json']);
    expect(config.weapons).toEqual(['weapon1.json']);
    expect(config.baselines).toEqual(['baseline1.json']);
  });

  test('throws error when required fields missing', () => {
    expect(() => {
      new SimulationConfigBuilder().build();
    }).toThrow('Iterations must be specified');

    expect(() => {
      new SimulationConfigBuilder()
        .iterations(100)
        .build();
    }).toThrow('At least one scenario must be specified');

    expect(() => {
      new SimulationConfigBuilder()
        .iterations(100)
        .scenarios([{
          rounds: 10,
          targetAC: 15,
          targetSize: 'medium',
          advantageRate: 0.3,
          attacksPerRound: 1
        }])
        .build();
    }).toThrow('At least one character must be specified');

    expect(() => {
      new SimulationConfigBuilder()
        .iterations(100)
        .scenarios([{
          rounds: 10,
          targetAC: 15,
          targetSize: 'medium',
          advantageRate: 0.3,
          attacksPerRound: 1
        }])
        .characters(['character.json'])
        .build();
    }).toThrow('At least one weapon must be specified');
  });

  test('validates iterations minimum', () => {
    expect(() => {
      new SimulationConfigBuilder().iterations(0);
    }).toThrow('Iterations must be at least 1');
  });

  test('creates default configuration', () => {
    const config = SimulationConfigBuilder.createDefault();
    
    expect(config.iterations).toBe(1000);
    expect(config.scenarios).toHaveLength(1);
    expect(config.characters).toEqual(['data/characters/level-5-swashbuckler-rogue.json']);
    expect(config.weapons).toEqual(['data/weapons/sanguine-messer/sanguine-messer.json']);
  });
});