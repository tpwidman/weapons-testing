/**
 * Dice rolling system for D&D 5e mechanics
 * Supports all standard dice types, advantage/disadvantage, and critical hits
 */

import { DiceType, DiceRoll, DiceResult, ParsedDiceExpression } from './types';

/**
 * Override options for dice rolling
 */
export interface DiceOverrides {
  alwaysMaxRoll?: boolean; // Always roll maximum value on dice
  alwaysCrit?: boolean; // Always roll natural 20 on d20
  alwaysHit?: boolean; // Always hit (roll high enough to beat AC)
  fixedRolls?: { [key: string]: number }; // Fixed values for specific dice types
}

/**
 * Core dice rolling utility class
 */
export class DiceEngine {
  private rng: () => number;
  private overrides: DiceOverrides;

  constructor(seed?: number, overrides?: DiceOverrides) {
    if (seed !== undefined) {
      // Simple seeded random number generator for reproducible results
      let seedValue = seed;
      this.rng = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
    } else {
      this.rng = Math.random;
    }
    
    this.overrides = overrides || {};
  }

  /**
   * Roll a single die of the specified type
   */
  rollSingle(type: DiceType): number {
    const sides = this.getDiceSides(type);
    
    // Check for overrides
    if (this.overrides.fixedRolls && this.overrides.fixedRolls[type] !== undefined) {
      return this.overrides.fixedRolls[type];
    }
    
    if (this.overrides.alwaysMaxRoll) {
      return sides;
    }
    
    if (this.overrides.alwaysCrit && type === 'd20') {
      return 20;
    }
    
    return Math.floor(this.rng() * sides) + 1;
  }

  /**
   * Roll multiple dice and return individual results
   */
  rollMultiple(count: number, type: DiceType): number[] {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(this.rollSingle(type));
    }
    return rolls;
  }

  /**
   * Roll dice with full D&D 5e mechanics support
   */
  roll(diceRoll: DiceRoll): DiceResult {
    const { count, type, bonus = 0, advantage = false, disadvantage = false } = diceRoll;
    
    let rolls: number[];
    let explanation: string;
    let critical = false;

    // Handle advantage/disadvantage for attack rolls (d20 only)
    if (type === 'd20' && (advantage || disadvantage)) {
      const roll1 = this.rollSingle(type);
      const roll2 = this.rollSingle(type);
      
      if (advantage && disadvantage) {
        // Advantage and disadvantage cancel out
        rolls = [roll1];
        explanation = `1d20: [${roll1}] (advantage and disadvantage cancel)`;
      } else if (advantage) {
        const chosen = Math.max(roll1, roll2);
        rolls = [chosen];
        explanation = `1d20 (advantage): [${roll1}, ${roll2}] → ${chosen}`;
        critical = chosen === 20;
      } else {
        const chosen = Math.min(roll1, roll2);
        rolls = [chosen];
        explanation = `1d20 (disadvantage): [${roll1}, ${roll2}] → ${chosen}`;
        critical = chosen === 20;
      }
    } else {
      // Normal dice rolling
      rolls = this.rollMultiple(count, type);
      explanation = `${count}${type}: [${rolls.join(', ')}]`;
      
      // Check for critical (natural 20 on d20)
      if (type === 'd20' && rolls.includes(20)) {
        critical = true;
      }
    }

    const rollTotal = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollTotal + bonus;

    // Build complete explanation
    if (bonus !== 0) {
      const bonusStr = bonus > 0 ? `+${bonus}` : `${bonus}`;
      explanation += ` ${bonusStr} = ${total}`;
    } else {
      explanation += ` = ${total}`;
    }

    if (critical) {
      explanation += ' (CRITICAL!)';
    }

    return {
      total,
      rolls,
      bonus,
      explanation,
      critical
    };
  }

  /**
   * Roll damage dice with critical hit doubling
   */
  rollDamage(diceRoll: DiceRoll, isCritical: boolean = false): DiceResult {
    const { count, type, bonus = 0 } = diceRoll;
    
    let actualCount = count;
    let explanation = '';

    if (isCritical) {
      actualCount = count * 2;
      explanation = `${count}${type} (critical, doubled): `;
    } else {
      explanation = `${count}${type}: `;
    }

    const rolls = this.rollMultiple(actualCount, type);
    const rollTotal = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollTotal + bonus;

    explanation += `[${rolls.join(', ')}]`;
    
    if (bonus !== 0) {
      const bonusStr = bonus > 0 ? `+${bonus}` : `${bonus}`;
      explanation += ` ${bonusStr}`;
    }
    
    explanation += ` = ${total}`;

    return {
      total,
      rolls,
      bonus,
      explanation,
      critical: isCritical
    };
  }

  /**
   * Parse dice expression strings like "3d6+2", "1d20", "2d8-1"
   */
  parseDiceExpression(expression: string): ParsedDiceExpression {
    const cleanExpr = expression.replace(/\s/g, '').toLowerCase();
    
    // Match patterns like "3d6+2", "1d20", "d8-1"
    const match = cleanExpr.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    
    if (!match || !match[2]) {
      throw new Error(`Invalid dice expression: ${expression}`);
    }

    const count = match[1] ? parseInt(match[1]) : 1;
    const sides = parseInt(match[2]);
    const bonus = match[3] ? parseInt(match[3]) : 0;

    // Validate dice type
    const validSides = [4, 6, 8, 10, 12, 20];
    if (!validSides.includes(sides)) {
      throw new Error(`Invalid dice type: d${sides}. Valid types: ${validSides.map(s => `d${s}`).join(', ')}`);
    }

    return {
      count,
      type: `d${sides}` as DiceType,
      bonus
    };
  }

  /**
   * Roll from a dice expression string
   */
  rollExpression(expression: string, options?: { advantage?: boolean; disadvantage?: boolean; critical?: boolean }): DiceResult {
    const parsed = this.parseDiceExpression(expression);
    const diceRoll: DiceRoll = {
      count: parsed.count,
      type: parsed.type,
      bonus: parsed.bonus,
      ...(options?.advantage !== undefined && { advantage: options.advantage }),
      ...(options?.disadvantage !== undefined && { disadvantage: options.disadvantage })
    };

    if (options?.critical && parsed.type !== 'd20') {
      // For damage dice, use rollDamage with critical flag
      return this.rollDamage(diceRoll, true);
    } else {
      return this.roll(diceRoll);
    }
  }

  /**
   * Get number of sides for a dice type
   */
  private getDiceSides(type: DiceType): number {
    switch (type) {
      case 'd4': return 4;
      case 'd6': return 6;
      case 'd8': return 8;
      case 'd10': return 10;
      case 'd12': return 12;
      case 'd20': return 20;
      default:
        throw new Error(`Unknown dice type: ${type}`);
    }
  }
}

/**
 * Default dice engine instance
 */
export const dice = new DiceEngine();

/**
 * Create a dice engine with perfect rolls (always max damage, always crit)
 */
export const createPerfectDiceEngine = (seed?: number): DiceEngine => {
  return new DiceEngine(seed, {
    alwaysMaxRoll: true,
    alwaysCrit: true,
    alwaysHit: true
  });
};

/**
 * Create a dice engine with custom overrides
 */
export const createCustomDiceEngine = (seed?: number, overrides?: DiceOverrides): DiceEngine => {
  return new DiceEngine(seed, overrides);
};

/**
 * Convenience functions for common dice operations
 */
export const rollD4 = (count: number = 1, bonus: number = 0) => 
  dice.roll({ count, type: 'd4', bonus });

export const rollD6 = (count: number = 1, bonus: number = 0) => 
  dice.roll({ count, type: 'd6', bonus });

export const rollD8 = (count: number = 1, bonus: number = 0) => 
  dice.roll({ count, type: 'd8', bonus });

export const rollD10 = (count: number = 1, bonus: number = 0) => 
  dice.roll({ count, type: 'd10', bonus });

export const rollD12 = (count: number = 1, bonus: number = 0) => 
  dice.roll({ count, type: 'd12', bonus });

export const rollD20 = (count: number = 1, bonus: number = 0, advantage?: boolean, disadvantage?: boolean) => 
  dice.roll({ 
    count, 
    type: 'd20', 
    bonus, 
    ...(advantage !== undefined && { advantage }),
    ...(disadvantage !== undefined && { disadvantage })
  });

/**
 * Roll attack with advantage/disadvantage
 */
export const rollAttack = (bonus: number = 0, advantage: boolean = false, disadvantage: boolean = false) =>
  dice.roll({ 
    count: 1, 
    type: 'd20', 
    bonus, 
    ...(advantage && { advantage }),
    ...(disadvantage && { disadvantage })
  });

/**
 * Roll damage with optional critical hit
 */
export const rollDamage = (expression: string, critical: boolean = false) =>
  dice.rollExpression(expression, { critical });