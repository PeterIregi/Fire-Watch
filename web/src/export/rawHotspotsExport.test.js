import { describe, it, expect } from 'vitest';
import {
  filterAndCapRawDetections,
  generateRawHotspotsCsv,
  getRawHotspotsFilename,
  RAW_CSV_COLUMNS,
} from './rawHotspotsExport.js';

describe('rawHotspotsExport', () => {
  const createMockRows = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      sensor: 'VIIRS',
      satellite: 'NPP',
      acq_date: '2022-08-15',
      acq_time: '1130',
      lat: -2.5 + (i * 0.0001),
      lon: 35.0 + (i * 0.0001),
      confidence: 'nominal',
      frp: 15.4,
      daynight: 'D',
      cell_id: '-2.50_35.00',
    }));
  };

  describe('filterAndCapRawDetections', () => {
    it('handles cap-minus-one case without capping', () => {
      const rows = createMockRows(99);
      const res = filterAndCapRawDetections(rows, null, '2022-01', '2022-12', 100);
      expect(res.totalMatched).toBe(99);
      expect(res.isCapped).toBe(false);
      expect(res.exportedRows.length).toBe(99);
    });

    it('handles exact-cap case without capping', () => {
      const rows = createMockRows(100);
      const res = filterAndCapRawDetections(rows, null, '2022-01', '2022-12', 100);
      expect(res.totalMatched).toBe(100);
      expect(res.isCapped).toBe(false);
      expect(res.exportedRows.length).toBe(100);
    });

    it('handles cap-plus-one case with explicit capping and total count', () => {
      const rows = createMockRows(101);
      const res = filterAndCapRawDetections(rows, null, '2022-01', '2022-12', 100);
      expect(res.totalMatched).toBe(101);
      expect(res.isCapped).toBe(true);
      expect(res.exportedRows.length).toBe(100);
    });

    it('filters correctly by AOI and date range', () => {
      const mixed = [
        { acq_date: '2022-08-01', lat: -2.5, lon: 35.0 }, // match
        { acq_date: '2021-08-01', lat: -2.5, lon: 35.0 }, // out of date
        { acq_date: '2022-08-01', lat: -9.5, lon: 35.0 }, // out of bbox
      ];
      const bbox = [34.0, -3.0, 36.0, -2.0];
      const res = filterAndCapRawDetections(mixed, bbox, '2022-01', '2022-12', 50000);
      expect(res.totalMatched).toBe(1);
      expect(res.exportedRows[0].acq_date).toBe('2022-08-01');
    });
  });

  describe('generateRawHotspotsCsv', () => {
    it('produces valid CSV with all FIRMS attributes', () => {
      const rows = [
        {
          sensor: 'MODIS',
          satellite: 'Aqua',
          acq_date: '2022-07-20',
          acq_time: '1045',
          lat: -2.5012,
          lon: 34.7521,
          confidence: 85,
          frp: 32.8,
          daynight: 'D',
          cell_id: '-2.50_34.75',
        },
      ];
      const csv = generateRawHotspotsCsv(rows);
      const lines = csv.trim().split('\r\n');

      expect(lines[0]).toBe(RAW_CSV_COLUMNS.join(','));
      expect(lines[1]).toBe('MODIS,Aqua,2022-07-20,1045,-2.5012,34.7521,85,32.8,D,-2.50_34.75');
    });
  });

  describe('getRawHotspotsFilename', () => {
    it('names file correctly', () => {
      expect(getRawHotspotsFilename('2020-01', '2022-12')).toBe(
        'firewatch_hotspots_2020-01_2022-12.csv'
      );
    });
  });
});
