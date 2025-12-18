/**
 * Configuration for hemorrhage comparison reports
 */

import { ReportGeneratorConfig } from '../generators/report-generator';

export const hemorrhageComparisonFlat: ReportGeneratorConfig = {
  reportName: 'hemorrhage-comparison-flat',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'raw', 'frequency']
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

export const hemorrhageComparisonAdvantage: ReportGeneratorConfig = {
  reportName: 'hemorrhage-comparison-advantage',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'raw', 'frequency']
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

export const hemorrhageComparisonDetailed: ReportGeneratorConfig = {
  reportName: 'hemorrhage-comparison-detailed',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'raw', 'frequency']
    },
    json: {
      enabled: true,
      includeRawData: true // Include raw data for detailed analysis
    },
    console: {
      enabled: true,
      colorOutput: true
    }
  }
};