import { describe, it, expect } from 'vitest';
import {
  computeMedian,
  formatMonthName,
  calculateCurrentMonthKpi,
  calculateBusiestMonthKpi,
  calculateBusiestYearKpi,
} from './kpiCalculations.js';
import { SOURCES } from '../calendar/dataHelpers.js';

describe('kpiCalculations', () => {
  describe('computeMedian', () => {
    it('calculates median for odd-length array', () => {
      expect(computeMedian([10, 20, 30])).toBe(20);
      expect(computeMedian([50, 10, 20, 90, 30])).toBe(30);
    });

    it('calculates median for even-length array', () => {
      expect(computeMedian([10, 20, 30, 40])).toBe(25);
      expect(computeMedian([100, 200])).toBe(150);
    });

    it('handles single item and empty arrays', () => {
      expect(computeMedian([42])).toBe(42);
      expect(computeMedian([])).toBeNull();
      expect(computeMedian(null)).toBeNull();
    });
  });

  describe('formatMonthName', () => {
    it('formats month strings to readable text', () => {
      expect(formatMonthName('2024-08')).toBe('August 2024');
      expect(formatMonthName('2019-12')).toBe('December 2019');
    });
  });

  describe('calculateCurrentMonthKpi', () => {
    // Hand-crafted dataset:
    // August values across years:
    // 2020-08: 100
    // 2021-08: 120
    // 2022-08: 80
    // 2023-08: 140
    // 2024-08 (target): 150
    // Other years: [80, 100, 120, 140] -> sorted: 80, 100, 120, 140 -> median is (100+120)/2 = 110
    // Diff = 150 - 110 = +40
    // Percent = (40 / 110) * 100 = +36.36% -> "+36.4% vs median"
    const mockFullSeries = [
      { month: '2020-08', harmonized: 100 },
      { month: '2021-08', harmonized: 120 },
      { month: '2022-08', harmonized: 80 },
      { month: '2023-08', harmonized: 140 },
      { month: '2024-08', harmonized: 150 },
    ];

    it('accurately computes target month against historical median with hand-calculated example', () => {
      const result = calculateCurrentMonthKpi(mockFullSeries, mockFullSeries, SOURCES.HARMONIZED);
      expect(result.hasData).toBe(true);
      expect(result.targetMonth).toBe('2024-08');
      expect(result.targetMonthLabel).toBe('August 2024');
      expect(result.currentValue).toBe(150);
      expect(result.historicalMedian).toBe(110);
      expect(result.diff).toBe(40);
      expect(result.percentChange).toBeCloseTo(36.36, 1);
      expect(result.percentText).toBe('+36.4% vs median');
      expect(result.status).toBe('higher');
    });

    it('uses full area history for baseline even when displayedSeries is restricted', () => {
      // Display only 2024-08
      const displayed = [{ month: '2024-08', harmonized: 150 }];
      const result = calculateCurrentMonthKpi(displayed, mockFullSeries, SOURCES.HARMONIZED);
      expect(result.targetMonth).toBe('2024-08');
      // Baseline still calculated from full series (110)
      expect(result.historicalMedian).toBe(110);
      expect(result.percentText).toBe('+36.4% vs median');
    });

    it('handles zero median cleanly without NaN or Infinity', () => {
      const zeroMedianSeries = [
        { month: '2020-04', harmonized: 0 },
        { month: '2021-04', harmonized: 0 },
        { month: '2022-04', harmonized: 0 },
        { month: '2023-04', harmonized: 25 }, // Target month has 25 fires
      ];
      const result = calculateCurrentMonthKpi(zeroMedianSeries, zeroMedianSeries, SOURCES.HARMONIZED);
      expect(result.historicalMedian).toBe(0);
      expect(result.currentValue).toBe(25);
      expect(result.percentText).toBe('+25 above 0 median');
      expect(result.status).toBe('higher');
    });

    it('handles true zero in target month with zero median', () => {
      const allZero = [
        { month: '2020-04', harmonized: 0 },
        { month: '2021-04', harmonized: 0 },
        { month: '2022-04', harmonized: 0 },
      ];
      const result = calculateCurrentMonthKpi(allZero, allZero, SOURCES.HARMONIZED);
      expect(result.historicalMedian).toBe(0);
      expect(result.currentValue).toBe(0);
      expect(result.percentText).toBe('Matches zero baseline');
      expect(result.status).toBe('neutral');
    });
  });

  describe('calculateBusiestMonthKpi', () => {
    it('identifies the month with highest hotspot count', () => {
      const series = [
        { month: '2023-06', harmonized: 40 },
        { month: '2023-07', harmonized: 180 },
        { month: '2023-08', harmonized: 350 }, // Busiest
        { month: '2023-09', harmonized: 290 },
      ];
      const result = calculateBusiestMonthKpi(series, SOURCES.HARMONIZED);
      expect(result.hasData).toBe(true);
      expect(result.month).toBe('2023-08');
      expect(result.monthLabel).toBe('August 2023');
      expect(result.value).toBe(350);
    });
  });

  describe('calculateBusiestYearKpi', () => {
    it('sums monthly totals per year and identifies busiest year', () => {
      const series = [
        // Year 2021 sum: 300
        { month: '2021-07', harmonized: 100 },
        { month: '2021-08', harmonized: 200 },
        // Year 2022 sum: 450 (busiest)
        { month: '2022-07', harmonized: 150 },
        { month: '2022-08', harmonized: 300 },
      ];
      const result = calculateBusiestYearKpi(series, SOURCES.HARMONIZED);
      expect(result.hasData).toBe(true);
      expect(result.year).toBe(2022);
      expect(result.value).toBe(450);
      expect(result.isPartial).toBe(true); // only 2 months in 2022
    });
  });
});
