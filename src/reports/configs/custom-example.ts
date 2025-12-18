/**
 * Example custom report configuration
 * Copy and modify this file to create your own report configurations
 */

import { ReportGeneratorConfig } from '../generators/report-generator';

// Example: Quick summary report (console + summary CSV only)
export const quickSummaryReport: ReportGeneratorConfig = {
  reportName: 'quick-summary',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary'] // Only summary, no raw data or frequency
    },
    console: {
      enabled: true,
      colorOutput: true
    }
    // No JSON output for quick reports
  }
};

// Example: Data export report (all CSV types + JSON with raw data)
export const dataExportReport: ReportGeneratorConfig = {
  reportName: 'data-export',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'raw', 'frequency'] // All CSV types
    },
    json: {
      enabled: true,
      includeRawData: true // Include all raw combat data
    },
    console: {
      enabled: false, // No console output for data exports
      colorOutput: false
    }
  }
};

// Example: Visualization-ready report (frequency + raw data for charts)
export const visualizationReport: ReportGeneratorConfig = {
  reportName: 'visualization-data',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['frequency', 'raw'] // Perfect for creating histograms and charts
    },
    json: {
      enabled: false,
      includeRawData: false
    },
    console: {
      enabled: true,
      colorOutput: true
    }
  }
};

// Example: Custom output directory
export const customLocationReport: ReportGeneratorConfig = {
  reportName: 'my-analysis',
  outputDirectory: 'custom-reports', // Will create custom-reports/my-analysis/
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'frequency']
    },
    console: {
      enabled: true,
      colorOutput: true
    }
  }
};