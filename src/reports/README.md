# Weapon Analysis Reporting System

A modular reporting system for D&D 5e weapon damage analysis with clean file organization and multiple output formats.

## Quick Start

```bash
# Run all predefined reports
npm run reports

# Run specific report
npm run reports -- hemorrhage-flat
npm run reports -- hemorrhage-advantage  
npm run reports -- weapon-balance

# Show help
npm run reports -- --help
```

## Report Structure

All reports are saved with a clean directory structure:

```
reports/
├── hemorrhage-comparison-flat/
│   ├── summary.csv      # Statistical summary
│   ├── raw.csv         # Raw combat data
│   ├── frequency.csv   # Damage distribution
│   └── report.json     # Complete data export
├── hemorrhage-comparison-advantage/
│   └── ... (same files)
└── weapon-balance-standard/
    └── ... (same files)
```

## File Types

### CSV Files
- **summary.csv** - Statistical analysis (mean, median, percentiles, hemorrhage rates)
- **raw.csv** - Raw combat results for each iteration (perfect for histograms)
- **frequency.csv** - Damage distribution bins (perfect for smooth curves)

### JSON Files
- **report.json** - Complete structured data export with metadata

## Architecture

### Modular Design
- **Generators** (`src/reports/generators/`) - Handle specific output formats
- **Configs** (`src/reports/configs/`) - Define report configurations
- **Runner** (`src/reports/run-reports.ts`) - Orchestrates report execution

### Key Components

#### CSV Generator (`csv-generator.ts`)
Handles all CSV output with three types:
- Summary statistics
- Raw combat data  
- Frequency distributions

#### Report Generator (`report-generator.ts`)
Main orchestrator that:
- Coordinates multiple output formats
- Manages file organization
- Provides console output

#### Report Configs
Predefined configurations for common report types:
- `hemorrhage-comparison.ts` - Hemorrhage weapon analysis
- `weapon-balance.ts` - General weapon balance reports
- `custom-example.ts` - Examples for creating custom reports

## Creating Custom Reports

1. **Create a config file** in `src/reports/configs/`:

```typescript
import { ReportGeneratorConfig } from '../generators/report-generator';

export const myCustomReport: ReportGeneratorConfig = {
  reportName: 'my-analysis',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'frequency'] // Choose what you need
    },
    json: {
      enabled: true,
      includeRawData: false
    },
    console: {
      enabled: true,
      colorOutput: true
    }
  }
};
```

2. **Use in your script**:

```typescript
import { ReportGenerator } from './generators/report-generator';
import { myCustomReport } from './configs/my-config';

const generator = new ReportGenerator(myCustomReport);
const report = await generator.generateReport(simulationResults);
```

## Output Formats

### CSV Types
- **summary**: One row per weapon/scenario with all statistics
- **raw**: One row per combat iteration (great for histograms)
- **frequency**: Damage ranges with occurrence counts (great for distribution curves)

### JSON Options
- **includeRawData: false** - Compact export with just statistics
- **includeRawData: true** - Full export including all combat details

### Console Options
- **colorOutput: true** - Colored terminal output
- **enabled: false** - Silent operation for batch processing

## Integration with Existing System

The new system works alongside the existing CLI (`src/reports/cli.ts`):
- **Old CLI** - Complex configuration-driven reports
- **New System** - Simple, focused reports with clean output

Both systems can coexist and serve different use cases.

## Examples

### Quick Summary Report
```typescript
const quickConfig: ReportGeneratorConfig = {
  reportName: 'quick-check',
  outputDirectory: 'reports',
  formats: {
    csv: { enabled: true, types: ['summary'] },
    console: { enabled: true, colorOutput: true }
  }
};
```

### Data Export for Analysis
```typescript
const dataExportConfig: ReportGeneratorConfig = {
  reportName: 'data-export',
  outputDirectory: 'analysis-data',
  formats: {
    csv: { enabled: true, types: ['raw', 'frequency'] },
    json: { enabled: true, includeRawData: true },
    console: { enabled: false }
  }
};
```

### Visualization Ready
```typescript
const vizConfig: ReportGeneratorConfig = {
  reportName: 'visualization-data',
  outputDirectory: 'charts',
  formats: {
    csv: { enabled: true, types: ['frequency', 'raw'] }
  }
};
```

Perfect for creating:
- Bell curve histograms from raw.csv
- Smooth distribution curves from frequency.csv
- Statistical comparisons from summary.csv