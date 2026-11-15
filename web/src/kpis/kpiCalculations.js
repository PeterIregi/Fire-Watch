import { getValueForSource, SOURCES } from '../calendar/dataHelpers.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Computes the statistical median of a numeric array.
 * @param {number[]} values
 * @returns {number|null}
 */
export function computeMedian(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Formats a 'YYYY-MM' string into a friendly label like 'August 2022'.
 * @param {string} monthStr
 * @returns {string}
 */
export function formatMonthName(monthStr) {
  if (!monthStr || typeof monthStr !== 'string') return '';
  const [yStr, mStr] = monthStr.split('-');
  const m = parseInt(mStr, 10);
  if (m >= 1 && m <= 12) {
    return `${MONTH_NAMES[m - 1]} ${yStr}`;
  }
  return monthStr;
}

/**
 * Calculates current month statistics against the historical baseline median.
 * 
 * @param {Array<Object>} displayedSeries Active filtered monthly observations
 * @param {Array<Object>} fullSeries Complete historical observations for the AOI
 * @param {string} source Active source key ('harmonized' | 'modis' | 'viirs')
 * @returns {Object} KPI result
 */
export function calculateCurrentMonthKpi(displayedSeries, fullSeries, source = SOURCES.HARMONIZED) {
  if (!displayedSeries || displayedSeries.length === 0) {
    return {
      hasData: false,
      targetMonth: null,
      targetMonthLabel: 'No data',
      currentValue: null,
      historicalMedian: null,
      diff: null,
      percentChange: null,
      percentText: 'N/A',
      status: 'neutral',
    };
  }

  // Find the latest month in displayedSeries with a non-null value for the active source
  const validEntries = displayedSeries
    .filter(e => e && e.month && getValueForSource(e, source) !== null)
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  if (validEntries.length === 0) {
    const latestRaw = displayedSeries[displayedSeries.length - 1];
    return {
      hasData: false,
      targetMonth: latestRaw?.month || null,
      targetMonthLabel: formatMonthName(latestRaw?.month),
      currentValue: null,
      historicalMedian: null,
      diff: null,
      percentChange: null,
      percentText: 'Unavailable',
      status: 'neutral',
    };
  }

  const targetEntry = validEntries[validEntries.length - 1];
  const targetMonth = targetEntry.month;
  const currentValue = getValueForSource(targetEntry, source);
  const [targetYearStr, targetMStr] = targetMonth.split('-');
  const targetYear = parseInt(targetYearStr, 10);

  // Compute baseline: all OTHER years in fullSeries for this same calendar month
  const baselineValues = (fullSeries || displayedSeries)
    .filter(e => {
      if (!e || !e.month) return false;
      const [yrStr, mStr] = e.month.split('-');
      return mStr === targetMStr && parseInt(yrStr, 10) !== targetYear;
    })
    .map(e => getValueForSource(e, source))
    .filter(v => v !== null);

  const historicalMedian = computeMedian(baselineValues);

  let percentChange = null;
  let percentText = 'N/A';
  let diff = null;
  let status = 'neutral'; // 'higher' | 'lower' | 'neutral'

  if (historicalMedian !== null && currentValue !== null) {
    diff = currentValue - historicalMedian;

    if (historicalMedian === 0) {
      if (currentValue === 0) {
        percentChange = 0;
        percentText = 'Matches zero baseline';
        status = 'neutral';
      } else {
        percentChange = null;
        percentText = `+${currentValue.toLocaleString()} above 0 median`;
        status = 'higher';
      }
    } else {
      percentChange = (diff / historicalMedian) * 100;
      const sign = percentChange > 0 ? '+' : '';
      percentText = `${sign}${percentChange.toFixed(1)}% vs median`;
      if (percentChange > 15) status = 'higher';
      else if (percentChange < -15) status = 'lower';
      else status = 'neutral';
    }
  }

  return {
    hasData: true,
    targetMonth,
    targetMonthLabel: formatMonthName(targetMonth),
    currentValue,
    historicalMedian,
    diff,
    percentChange,
    percentText,
    baselineYearCount: baselineValues.length,
    status,
  };
}

/**
 * Calculates the busiest month within the displayed date range.
 * 
 * @param {Array<Object>} displayedSeries
 * @param {string} source
 * @returns {Object}
 */
export function calculateBusiestMonthKpi(displayedSeries, source = SOURCES.HARMONIZED) {
  if (!displayedSeries || displayedSeries.length === 0) {
    return { hasData: false, month: null, monthLabel: 'No data', value: null };
  }

  let maxVal = -Infinity;
  let busiest = null;

  for (const item of displayedSeries) {
    const val = getValueForSource(item, source);
    if (val !== null && val > maxVal) {
      maxVal = val;
      busiest = item;
    }
  }

  if (!busiest || maxVal === -Infinity) {
    return { hasData: false, month: null, monthLabel: 'No data', value: null };
  }

  return {
    hasData: true,
    month: busiest.month,
    monthLabel: formatMonthName(busiest.month),
    value: maxVal,
  };
}

/**
 * Calculates the busiest year within the displayed date range.
 * Sums monthly activity per year.
 * 
 * @param {Array<Object>} displayedSeries
 * @param {string} source
 * @returns {Object}
 */
export function calculateBusiestYearKpi(displayedSeries, source = SOURCES.HARMONIZED) {
  if (!displayedSeries || displayedSeries.length === 0) {
    return { hasData: false, year: null, value: null, isPartial: false };
  }

  const yearTotals = new Map();
  const yearMonthCounts = new Map();

  for (const item of displayedSeries) {
    if (!item || !item.month) continue;
    const [yrStr] = item.month.split('-');
    const yr = parseInt(yrStr, 10);
    const val = getValueForSource(item, source);

    if (val !== null) {
      yearTotals.set(yr, (yearTotals.get(yr) || 0) + val);
      yearMonthCounts.set(yr, (yearMonthCounts.get(yr) || 0) + 1);
    }
  }

  if (yearTotals.size === 0) {
    return { hasData: false, year: null, value: null, isPartial: false };
  }

  let maxVal = -Infinity;
  let busiestYear = null;

  for (const [yr, total] of yearTotals.entries()) {
    if (total > maxVal) {
      maxVal = total;
      busiestYear = yr;
    }
  }

  const monthCount = yearMonthCounts.get(busiestYear) || 0;
  const isPartial = monthCount < 12;

  return {
    hasData: true,
    year: busiestYear,
    value: maxVal,
    monthCount,
    isPartial,
  };
}
