import { describe, it, expect } from 'vitest';
import { isCellInBbox, extractSelectionData } from './dataStore.js';

describe('dataStore', () => {
  describe('isCellInBbox', () => {
    it('checks if coordinates lie within [west, south, east, north]', () => {
      const bbox = [34.0, -3.0, 36.0, -2.0];
      expect(isCellInBbox(-2.5, 35.0, bbox)).toBe(true);
      expect(isCellInBbox(-1.5, 35.0, bbox)).toBe(false); // North of bbox
      expect(isCellInBbox(-2.5, 33.0, bbox)).toBe(false); // West of bbox
    });
  });

  describe('extractSelectionData', () => {
    const mockData = {
      meta: {
        months: ['2020-07', '2020-08'],
      },
      cells: [
        { id: '-2.50_35.00', lat: -2.5, lon: 35.0 },
        { id: '-8.50_37.00', lat: -8.5, lon: 37.0 },
      ],
      data: {
        '-2.50_35.00': [
          [0, 10, 4, 30, 8, 15.0],
          [1, 20, 6, 60, 12, 30.0],
        ],
        '-8.50_37.00': [
          [0, 50, 12, 150, 20, 75.0],
        ],
      },
    };

    it('extracts cells and aggregates series for active bounding box', () => {
      // Bbox only covering the first cell
      const bbox = [34.0, -3.0, 36.0, -2.0];
      const result = extractSelectionData(mockData, bbox);

      expect(result.matchingCells.length).toBe(1);
      expect(result.matchingCells[0].id).toBe('-2.50_35.00');
      expect(result.cellRows.length).toBe(2);
      expect(result.monthlySeries.length).toBe(2);
      expect(result.monthlySeries[0].month).toBe('2020-07');
      expect(result.monthlySeries[0].harmonized).toBe(15.0);
    });
  });
});
