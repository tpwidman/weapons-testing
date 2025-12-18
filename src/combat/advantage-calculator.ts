/**
 * Deterministic advantage calculation for combat metrics
 * Ensures predictable, reproducible results for weapon comparison
 */

import { AdvantageStrategy } from './types';

/**
 * Calculate which rounds should have advantage based on advantage rate
 *
 * Rules:
 * - Rounds UP to ensure rate is met or exceeded
 * - Distributes advantage evenly across combat rounds
 * - Deterministic - same inputs always produce same outputs
 *
 * Examples:
 * - 10 rounds, 0.25 rate = 3 rounds with advantage (rounds 3, 6, 9)
 * - 8 rounds, 0.25 rate = 2 rounds with advantage (rounds 3, 6)
 * - 4 rounds, 0.5 rate = 2 rounds with advantage (rounds 2, 4)
 */
export class AdvantageCalculator {
  /**
   * Calculate advantage strategy for a combat scenario
   */
  static calculateAdvantageStrategy(totalRounds: number, rate: number): AdvantageStrategy {
    if (rate <= 0 || totalRounds <= 0) {
      return {
        totalRounds,
        rate,
        advantageRounds: [],
        advantageCount: 0
      };
    }

    if (rate >= 1.0) {
      // All rounds have advantage
      return {
        totalRounds,
        rate,
        advantageRounds: Array.from({ length: totalRounds }, (_, i) => i + 1),
        advantageCount: totalRounds
      };
    }

    // Calculate how many rounds should have advantage (round UP)
    const advantageCount = Math.ceil(totalRounds * rate);

    // Distribute advantage rounds evenly
    const advantageRounds = this.distributeAdvantageRounds(totalRounds, advantageCount);

    return {
      totalRounds,
      rate,
      advantageRounds,
      advantageCount
    };
  }

  /**
   * Distribute advantage rounds evenly across total rounds
   * Uses interval-based distribution for even spacing
   */
  private static distributeAdvantageRounds(totalRounds: number, advantageCount: number): number[] {
    if (advantageCount >= totalRounds) {
      return Array.from({ length: totalRounds }, (_, i) => i + 1);
    }

    const rounds: number[] = [];
    const interval = totalRounds / advantageCount;

    for (let i = 0; i < advantageCount; i++) {
      // Calculate which round gets advantage (1-indexed)
      // Use Math.floor to get even distribution
      const roundNumber = Math.floor(interval * (i + 1));
      rounds.push(roundNumber);
    }

    return rounds;
  }

  /**
   * Check if a specific round should have advantage
   */
  static hasAdvantage(roundNumber: number, strategy: AdvantageStrategy): boolean {
    return strategy.advantageRounds.includes(roundNumber);
  }

  /**
   * Get a human-readable description of the advantage strategy
   */
  static describeStrategy(strategy: AdvantageStrategy): string {
    if (strategy.advantageCount === 0) {
      return 'No advantage';
    }

    if (strategy.advantageCount === strategy.totalRounds) {
      return 'Advantage on all rounds';
    }

    const roundsList = strategy.advantageRounds.join(', ');
    return `Advantage on ${strategy.advantageCount}/${strategy.totalRounds} rounds (rounds: ${roundsList})`;
  }
}
