/**
 * Rogue class level progression data
 */

export interface RogueLevelData {
  level: number;
  proficiencyBonus: number;
  sneakAttack: string;
  features: string[];
}

/**
 * Complete rogue level progression (1-20)
 */
export const ROGUE_PROGRESSION: readonly RogueLevelData[] = [
  { level: 1, proficiencyBonus: 2, sneakAttack: '1d6', features: ['Expertise', 'Sneak Attack', 'Thieves\' Cant'] },
  { level: 2, proficiencyBonus: 2, sneakAttack: '1d6', features: ['Cunning Action'] },
  { level: 3, proficiencyBonus: 2, sneakAttack: '2d6', features: ['Roguish Archetype'] },
  { level: 4, proficiencyBonus: 2, sneakAttack: '2d6', features: ['Ability Score Improvement'] },
  { level: 5, proficiencyBonus: 3, sneakAttack: '3d6', features: ['Uncanny Dodge'] },
  { level: 6, proficiencyBonus: 3, sneakAttack: '3d6', features: ['Expertise'] },
  { level: 7, proficiencyBonus: 3, sneakAttack: '4d6', features: ['Evasion'] },
  { level: 8, proficiencyBonus: 3, sneakAttack: '4d6', features: ['Ability Score Improvement'] },
  { level: 9, proficiencyBonus: 4, sneakAttack: '5d6', features: ['Roguish Archetype Feature'] },
  { level: 10, proficiencyBonus: 4, sneakAttack: '5d6', features: ['Ability Score Improvement'] },
  { level: 11, proficiencyBonus: 4, sneakAttack: '6d6', features: ['Reliable Talent'] },
  { level: 12, proficiencyBonus: 4, sneakAttack: '6d6', features: ['Ability Score Improvement'] },
  { level: 13, proficiencyBonus: 5, sneakAttack: '7d6', features: ['Roguish Archetype Feature'] },
  { level: 14, proficiencyBonus: 5, sneakAttack: '7d6', features: ['Blindsense'] },
  { level: 15, proficiencyBonus: 5, sneakAttack: '8d6', features: ['Slippery Mind'] },
  { level: 16, proficiencyBonus: 5, sneakAttack: '8d6', features: ['Ability Score Improvement'] },
  { level: 17, proficiencyBonus: 6, sneakAttack: '9d6', features: ['Roguish Archetype Feature'] },
  { level: 18, proficiencyBonus: 6, sneakAttack: '9d6', features: ['Elusive'] },
  { level: 19, proficiencyBonus: 6, sneakAttack: '10d6', features: ['Ability Score Improvement'] },
  { level: 20, proficiencyBonus: 6, sneakAttack: '10d6', features: ['Stroke of Luck'] }
] as const;

/**
 * Get rogue data for a specific level
 */
export function getRogueLevelData(level: number): RogueLevelData {
  const data = ROGUE_PROGRESSION.find(d => d.level === level);
  if (!data) {
    throw new Error(`Invalid rogue level: ${level}. Must be between 1 and 20.`);
  }
  return data;
}

/**
 * Get proficiency bonus for a specific level
 */
export function getProficiencyBonus(level: number): number {
  return getRogueLevelData(level).proficiencyBonus;
}

/**
 * Get sneak attack dice for a specific level
 */
export function getSneakAttackDice(level: number): string {
  return getRogueLevelData(level).sneakAttack;
}
