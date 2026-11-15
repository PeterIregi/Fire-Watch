import { describe, it, expect } from 'vitest';
import {
  escapeCsvField,
  getAggregateCsvFilename,
  generateAggregateCsv,
  AGGREGATE_CSV_COLUMNS,
} from './aggregateCsv.js';
import { SYNTHETIC_CELL_ROWS } from '../data/fixtures.js';

describe('aggregateCsv', () => {
  describe('escapeCsvField', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('preserves true zero without turning it into empty string', () => {
      expect(escapeCsvField(0)).toBe('0');
    });

    it('escapes fields containing commas or quotes according to RFC 4180', () => {
      expect(escapeCsvField('hello,world')).toBe('"hello,world"');
      expect(escapeCsvField('He said "Fire"')).toBe('"He said ""Fire"""');
    });
  });

  describe('getAggregateCsvFilename', () => {
    it('formats filename with date bounds', () => {
      expect(getAggregateCsvFilename('2021-01', '2023-12')).toBe(
        'firewatch_aggregate_2021-01_2023-12.csv'
      );
    });
  });

  describe('generateAggregateCsv', () => {
    it('produces valid CSV with header and filtered cell rows', () => {
      const csv = generateAggregateCsv(SYNTHETIC_CELL_ROWS, '2022-07', '2022-08');
      const lines = csv.trim().split('\r\n');

      // Verify Header
      expect(lines[0]).toBe(AGGREGATE_CSV_COLUMNS.join(','));

      // In SYNTHETIC_CELL_ROWS, 4 rows fall in 2022-07 and 2022-08 (2022-04 is excluded)
      expect(lines.length).toBe(5); // 1 header + 4 rows

      // Check fractional harmonized value formatted
      expect(lines.some(l => l.includes('19.35'))).toBe(true);
      expect(lines.some(l => l.includes('25.80'))).toBe(true);
    });

    it('handles true zero in cell rows accurately', () => {
      const csv = generateAggregateCsv(SYNTHETIC_CELL_ROWS, '2022-04', '2022-04');
      const lines = csv.trim().split('\r\n');
      expect(lines.length).toBe(2); // Header + 1 row
      // 2022-04 has 0 hotspots and 0 fire days
      expect(lines[1]).toContain(',2022-04,0,0,0,0,0');
    });

    it('returns header-only CSV for empty input', () => {
      const csv = generateAggregateCsv([], '2020-01', '2020-12');
      expect(csv.trim()).toBe(AGGREGATE_CSV_COLUMNS.join(','));
    });
  });
});
