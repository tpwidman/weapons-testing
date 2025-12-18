/**
 * Character class factory for creating character class instances
 * Provides a clean separation between generic character system and specific class implementations
 */

import { BaseCharacterClass } from './base-character-class';

/**
 * Registry for character class constructors
 */
type CharacterClassConstructor = () => BaseCharacterClass;

class CharacterClassRegistry {
  private registry = new Map<string, CharacterClassConstructor>();

  /**
   * Register a character class constructor
   */
  register(className: string, constructor: CharacterClassConstructor): void {
    this.registry.set(className.toLowerCase(), constructor);
  }

  /**
   * Create a character class instance
   */
  create(className: string): BaseCharacterClass | null {
    const constructor = this.registry.get(className.toLowerCase());
    if (!constructor) {
      console.warn(`Character class '${className}' not registered`);
      return null;
    }
    return constructor();
  }

  /**
   * Check if a character class is registered
   */
  isRegistered(className: string): boolean {
    return this.registry.has(className.toLowerCase());
  }

  /**
   * Get all registered class names
   */
  getRegisteredClasses(): string[] {
    return Array.from(this.registry.keys());
  }
}

/**
 * Global character class registry instance
 */
export const characterClassRegistry = new CharacterClassRegistry();

/**
 * Factory function to create character class instances
 */
export function createCharacterClass(className: string): BaseCharacterClass | null {
  return characterClassRegistry.create(className);
}

/**
 * Register a character class
 */
export function registerCharacterClass(className: string, constructor: CharacterClassConstructor): void {
  characterClassRegistry.register(className, constructor);
}