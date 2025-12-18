// Jest setup file for global test configuration
// This file runs before all tests

// Set up any global test utilities or configurations here
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Configure fast-check for property-based testing
import fc from 'fast-check';

// Set default number of runs for property-based tests
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design
  verbose: false,
});