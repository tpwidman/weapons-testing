/**
 * Combat Metrics Engine for collecting comprehensive combat statistics
 * Uses a clean plugin-based approach with category and name organization
 * NO 'any' types - fully type-safe
 */

import {
  RawMetrics,
  UniversalMetrics,
  AttackResult,
  WeaponDefinition
} from '../core/types';

/**
 * Context information for combat initialization
 */
export interface CombatContext {
  weapon: string;
  advantage: boolean;
  enemyAC: number;
  enemySize: string;
  characterClass?: string;
  weaponMechanics?: string[];
}

/**
 * Special event data for target switch
 */
export interface TargetSwitchData {
  previousTarget: number;
  newTarget: number;
}

/**
 * Special event data union type - NO 'any'
 */
export type SpecialEventData = TargetSwitchData | undefined;

/**
 * Special events that can occur during combat
 */
export interface SpecialEvent {
  type: 'first_crit' | 'first_hemorrhage' | 'target_switch';
  round: number;
  data?: SpecialEventData;
}

/**
 * Tracker metrics result - specific structure, no 'any'
 */
export interface TrackerMetrics {
  [key: string]: number | string | boolean | null;
}

/**
 * Interface for tracking custom metrics
 */
export interface IMetricsTracker {
  /**
   * Return the category this tracker belongs to
   */
  getCategory(): 'classSpecific' | 'reportSpecific';

  /**
   * Return the name/key for these metrics within the category
   */
  getName(): string;

  /**
   * Called when combat starts
   */
  onCombatStart(context: CombatContext): void;

  /**
   * Called for each attack made
   */
  onAttack(result: AttackResult): void;

  /**
   * Called when combat ends - return your custom metrics
   */
  onCombatEnd(): TrackerMetrics;
}

/**
 * Combat Metrics Engine - Generic engine with tracker support
 */
export class CombatMetricsEngine {
  private combatId: string = '';
  private context: CombatContext | null = null;
  private trackers: IMetricsTracker[] = [];
  
  // Universal metrics tracking
  private roundsSimulated: number = 0;
  private attacksMade: number = 0;
  private hits: number = 0;
  private misses: number = 0;
  private critHits: number = 0;
  private nonCritHits: number = 0;
  private totalDamage: number = 0;
  private weaponDamage: number = 0;
  private critBonusDamage: number = 0;
  private firstCritRound: number | null = null;

  /**
   * Register a metrics tracker
   */
  registerTracker(tracker: IMetricsTracker): void {
    this.trackers.push(tracker);
  }

  /**
   * Initialize combat metrics collection
   */
  startCombat(combatId: string, context: CombatContext): void {
    this.combatId = combatId;
    this.context = context;
    
    // Reset universal metrics
    this.resetMetrics();
    
    // Notify all trackers
    for (const tracker of this.trackers) {
      tracker.onCombatStart(context);
    }
  }

  /**
   * Record an attack result
   */
  recordAttack(result: AttackResult): void {
    if (!this.context) {
      throw new Error('Combat not started - call startCombat first');
    }

    // Track universal metrics
    this.attacksMade++;
    
    if (result.hit) {
      this.hits++;
      this.totalDamage += result.totalDamage;
      this.weaponDamage += result.baseDamage;
      
      if (result.critical) {
        this.critHits++;
        // Track first critical hit
        if (this.firstCritRound === null) {
          this.firstCritRound = this.roundsSimulated;
        }

        // Track crit bonus damage from result
        // NO ASSUMPTIONS - weapon calculates and provides explicit crit damage
        if (result.critDamage !== undefined) {
          this.critBonusDamage += result.critDamage;
        }
      } else {
        this.nonCritHits++;
      }
    } else {
      this.misses++;
    }

    // Let trackers process the attack
    for (const tracker of this.trackers) {
      tracker.onAttack(result);
    }
  }


  /**
   * Record special events (first crit, first hemorrhage, etc.)
   */
  recordSpecialEvent(event: SpecialEvent): void {
    switch (event.type) {
      case 'first_crit':
        if (this.firstCritRound === null) {
          this.firstCritRound = event.round;
        }
        break;
      // Other events can be handled by collectors if needed
    }
  }

  /**
   * Set the number of rounds simulated
   */
  setRoundsSimulated(rounds: number): void {
    this.roundsSimulated = rounds;
  }

  /**
   * Detect weapon mechanics and update context (generic - no hardcoded mechanics)
   */
  detectWeaponMechanics(definition: WeaponDefinition): void {
    if (!this.context) return;

    // Extract all mechanics generically - NO hardcoded mechanic names
    const mechanics = definition.specialMechanics?.map((m: { type: string }) => m.type) || [];

    this.context.weaponMechanics = mechanics;
  }

  /**
   * Finalize combat and return collected metrics
   */
  finalizeCombat(): RawMetrics {
    if (!this.context) {
      throw new Error('Combat not started - call startCombat first');
    }

    // Build universal metrics
    const universalMetrics: UniversalMetrics = {
      combat_id: this.combatId,
      weapon: this.context.weapon,
      advantage: this.context.advantage,
      enemy_ac: this.context.enemyAC,
      enemy_size: this.context.enemySize,
      rounds_simulated: this.roundsSimulated,
      attacks_made: this.attacksMade,
      hits: this.hits,
      misses: this.misses,
      crit_hits: this.critHits,
      non_crit_hits: this.nonCritHits,
      total_damage: this.totalDamage,
      weapon_damage: this.weaponDamage,
      crit_bonus_damage: this.critBonusDamage
    };
    
    if (this.firstCritRound !== null) {
      universalMetrics.rounds_to_first_crit = this.firstCritRound;
    }

    const rawMetrics: RawMetrics = {
      universal: universalMetrics
    };

    // Collect metrics from all trackers
    for (const tracker of this.trackers) {
      const trackerMetrics = tracker.onCombatEnd();
      const category = tracker.getCategory();
      const name = tracker.getName();

      // Type-safe way to add tracker metrics
      if (category === 'classSpecific') {
        if (!rawMetrics.classSpecific) {
          rawMetrics.classSpecific = {};
        }
        (rawMetrics.classSpecific as Record<string, TrackerMetrics>)[name] = trackerMetrics;
      } else if (category === 'reportSpecific') {
        if (!rawMetrics.reportSpecific) {
          rawMetrics.reportSpecific = {};
        }
        (rawMetrics.reportSpecific as Record<string, TrackerMetrics>)[name] = trackerMetrics;
      }
    }

    return rawMetrics;
  }

  /**
   * Reset all universal tracking metrics
   */
  private resetMetrics(): void {
    this.roundsSimulated = 0;
    this.attacksMade = 0;
    this.hits = 0;
    this.misses = 0;
    this.critHits = 0;
    this.nonCritHits = 0;
    this.totalDamage = 0;
    this.weaponDamage = 0;
    this.critBonusDamage = 0;
    this.firstCritRound = null;
  }

  /**
   * Get current combat ID
   */
  getCombatId(): string {
    return this.combatId;
  }

  /**
   * Get current context
   */
  getContext(): CombatContext | null {
    return this.context;
  }

  /**
   * Check if combat has been started
   */
  isActive(): boolean {
    return this.context !== null;
  }

  /**
   * Get registered trackers (for testing)
   */
  getTrackers(): IMetricsTracker[] {
    return [...this.trackers];
  }
}