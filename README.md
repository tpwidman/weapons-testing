# Weapon Damage Simulator

A comprehensive testing system for D&D 5e weapons that enables statistical analysis of weapon balance, damage output, and mechanical interactions across different character builds and levels.

## Project Structure

```
├── src/                    # Source code
├── tests/                  # Test files
├── data/                   # JSON configuration files
├── types/                  # TypeScript type definitions
├── characters/             # Character template files
├── weapons/                # Weapon definition files
├── rolls/                  # Dice roll data
└── dist/                   # Compiled output (generated)
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Development

- `npm run dev` - Run in development mode
- `npm run test:watch` - Run tests in watch mode
- `npm run clean` - Clean build artifacts

## Testing

The project uses Jest for unit testing and fast-check for property-based testing, with a minimum of 100 iterations per property test as specified in the design document.