/**
 * Central registry for metrics trackers
 * Features register themselves here on module load
 */

import { IMetricsTracker } from './combat-metrics-engine';

export class MetricsRegistry {
  private static classTrackers = new Map<string, () => IMetricsTracker>();
  private static weaponMechanicTrackers = new Map<string, () => IMetricsTracker>();

  /**
   * Register a tracker for a character class
   */
  static registerClassTracker(className: string, factory: () => IMetricsTracker): void {
    this.classTrackers.set(className, factory);
  }

  /**
   * Register a tracker for a weapon mechanic
   */
  static registerWeaponMechanicTracker(mechanicType: string, factory: () => IMetricsTracker): void {
    this.weaponMechanicTrackers.set(mechanicType, factory);
  }

  /**
   * Get tracker for a character class (if exists)
   */
  static getClassTracker(className: string): IMetricsTracker | null {
    const factory = this.classTrackers.get(className);
    return factory ? factory() : null;
  }

  /**
   * Get tracker for a weapon mechanic (if exists)
   */
  static getWeaponMechanicTracker(mechanicType: string): IMetricsTracker | null {
    const factory = this.weaponMechanicTrackers.get(mechanicType);
    return factory ? factory() : null;
  }

  /**
   * Get all registered class names (for testing)
   */
  static getRegisteredClasses(): string[] {
    return Array.from(this.classTrackers.keys());
  }

  /**
   * Get all registered weapon mechanics (for testing)
   */
  static getRegisteredWeaponMechanics(): string[] {
    return Array.from(this.weaponMechanicTrackers.keys());
  }

  /**
   * Clear all registrations (for testing)
   */
  static clear(): void {
    this.classTrackers.clear();
    this.weaponMechanicTrackers.clear();
  }
}