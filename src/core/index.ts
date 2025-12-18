/**
 * Weapon Damage Simulator
 * Entry point for the D&D 5e weapon testing system
 */

export * from '../core/types';
export * from '../core/dice';
export * from '../characters/character';
export * from '../weapons/weapon';
export * from '../simulation/statistics';
export * from '../simulation/baseline';

// Re-export specific items from combat and simulation to avoid conflicts
export { CombatResolver } from '../combat/combat';
export { SimulationEngine, SimulationConfigBuilder } from '../simulation/simulation';

// Main entry point - will be implemented in later tasks
export function main(): void {
  console.log('Weapon Damage Simulator - Setup Complete');
}