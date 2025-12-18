/**
 * Configuration for weapon balance reports
 */

import { ReportGeneratorConfig } from '../generators/report-generator';

export const weaponBalanceStandard: ReportGeneratorConfig = {
  reportName: 'weapon-balance-standard',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'frequency']
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

export const weaponBalanceDetailed: ReportGeneratorConfig = {
  reportName: 'weapon-balance-detailed',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary', 'raw', 'frequency']
    },
    json: {
      enabled: true,
      includeRawData: true
    },
    console: {
      enabled: true,
      colorOutput: true
    }
  }
};

export const weaponBalanceQuick: ReportGeneratorConfig = {
  reportName: 'weapon-balance-quick',
  outputDirectory: 'reports',
  formats: {
    csv: {
      enabled: true,
      types: ['summary']
    },
    console: {
      enabled: true,
      colorOutput: true
    }
  }
};