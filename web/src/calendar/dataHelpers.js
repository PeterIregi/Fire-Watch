/**
 * Data Helpers & Input Boundary Specification for Domain D (Analytics & Delivery)
 * 
 * Defines source keys, units, inclusive month range helpers, zero vs unavailable checks,
 * and monthly aggregation logic for UI components.
 */

export const SOURCES = {
  HARMONIZED: 'harmonized',
  MODIS: 'modis',
  VIIRS: 'viirs',
};

export const SOURCE_METADATA = {
  [SOURCES.HARMONIZED]: {
    key: SOURCES.HARMONIZED,
    label: 'Harmonized',
    unit: 'hotspots (MODIS-equivalent)',
    shortUnit: 'hotspots',
    description: 'MODIS-equivalent hotspot counts calibrated from VIIRS fire-days',
    isCalibrated: true,
  },
  [SOURCES.MODIS]: {
    key: SOURCES.MODIS,
    label: 'Raw MODIS',
    unit: 'hotspots (raw MODIS)',
    shortUnit: 'hotspots',
    description: 'Raw quality-filtered Terra/Aqua MODIS hotspot detections',
    isCalibrated: false,
  },
  [SOURCES.VIIRS]: {
    key: SOURCES.VIIRS,
    label: 'Raw VIIRS',
    unit: 'hotspots (raw VIIRS)',
    shortUnit: 'hotspots',
    description: 'Raw quality-filtered Suomi NPP VIIRS 375m hotspot detections (available from 2012)',
    isCalibrated: false,
  },
};

/**
 * Validates a 'YYYY-MM' string format.
 * @param {string} monthStr
 * @returns {boolean}
 */
export function isValidMonth(monthStr) {
  if (typeof monthStr !== 'string') return false;
  const match = monthStr.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  return Boolean(match);
}

/**
 * Generates an array of all inclusive 'YYYY-MM' strings between start and end.
 * @param {string} startMonth 'YYYY-MM'
 * @param {string} endMonth 'YYYY-MM'
 * @returns {string[]}
 */
export function generateMonthRange(startMonth, endMonth) {
  if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) {
    throw new Error(`Invalid month range: start="${startMonth}", end="${endMonth}"`);
  }
  if (startMonth > endMonth) {
    return [];
  }

  const [startYear, startM] = startMonth.split('-').map(Number);
  const [endYear, endM] = endMonth.split('-').map(Number);

  const months = [];
  let curYear = startYear;
  let curMonth = startM;

  while (curYear < endYear || (curYear === endYear && curMonth <= endM)) {
    const mm = String(curMonth).padStart(2, '0');
    months.push(`${curYear}-${mm}`);
    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }
  }

  return months;
}

/**
 * Safely extracts the value for a given sensor source from a monthly entry.
 * Distinguishes true zero (0) from unavailable (null/undefined).
 * 
 * @param {Object} entry e.g. { month: '2015-08', harmonized: 120.4, modis_hotspots: 110, viirs_hotspots: 340 }
 * @param {string} source 'harmonized' | 'modis' | 'viirs'
 * @returns {number|null} returns null if unavailable/missing, or finite number
 */
export function getValueForSource(entry, source) {
  if (!entry) return null;

  let rawVal;
  switch (source) {
    case SOURCES.HARMONIZED:
      rawVal = entry.harmonized;
      break;
    case SOURCES.MODIS:
      rawVal = entry.modis_hotspots !== undefined ? entry.modis_hotspots : entry.modis;
      break;
    case SOURCES.VIIRS:
      rawVal = entry.viirs_hotspots !== undefined ? entry.viirs_hotspots : entry.viirs;
      break;
    default:
      rawVal = entry[source];
  }

  if (rawVal === null || rawVal === undefined) {
    return null;
  }

  const num = Number(rawVal);
  return Number.isFinite(num) ? num : null;
}

/**
 * Formats a numeric hotspot value for display, handling decimals, zeros, and unavailable states.
 * 
 * @param {number|null} value
 * @param {string} [source]
 * @param {Object} [options]
 * @returns {string}
 */
export function formatHotspotValue(value, source, options = {}) {
  if (value === null || value === undefined) {
    return options.placeholder || 'No data';
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return options.placeholder || 'No data';
  }

  // If whole number, format without decimals
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }

  // Harmonized values can be fractional
  const decimals = options.decimals ?? 1;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Filters a full monthly series by an inclusive [startMonth, endMonth] range.
 * Does NOT mutate the input series. Preserves full history for baseline lookups.
 * 
 * @param {Array<Object>} series Array of monthly objects with .month property
 * @param {string} startMonth 'YYYY-MM'
 * @param {string} endMonth 'YYYY-MM'
 * @returns {Array<Object>}
 */
export function filterSeriesByDateRange(series, startMonth, endMonth) {
  if (!Array.isArray(series)) return [];
  if (!startMonth && !endMonth) return [...series];

  return series.filter(item => {
    if (!item || !item.month) return false;
    if (startMonth && item.month < startMonth) return false;
    if (endMonth && item.month > endMonth) return false;
    return true;
  });
}

/**
 * Validates the schema of a monthly series array.
 * 
 * @param {Array<Object>} series
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMonthlySeries(series) {
  const errors = [];
  if (!Array.isArray(series)) {
    return { valid: false, errors: ['Monthly series must be an array'] };
  }

  series.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Row ${idx} is not an object`);
      return;
    }
    if (!isValidMonth(entry.month)) {
      errors.push(`Row ${idx} has invalid month: "${entry.month}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Aggregates cell-level rows into a monthly series for a selected area.
 * 
 * @param {Array<Object>} cellRows Array of { cell_id, month, modis_hotspots, modis_fire_days, viirs_hotspots, viirs_fire_days, harmonized }
 * @returns {Array<Object>} Sorted monthly series
 */
export function aggregateCellRowsToMonthlySeries(cellRows) {
  if (!Array.isArray(cellRows) || cellRows.length === 0) return [];

  const monthMap = new Map();

  for (const row of cellRows) {
    if (!row || !row.month) continue;
    const m = row.month;

    let agg = monthMap.get(m);
    if (!agg) {
      agg = {
        month: m,
        modis_hotspots: null,
        modis_fire_days: null,
        viirs_hotspots: null,
        viirs_fire_days: null,
        harmonized: null,
      };
      monthMap.set(m, agg);
    }

    const addVal = (curr, next) => {
      if (next === null || next === undefined) return curr;
      const n = Number(next);
      if (!Number.isFinite(n)) return curr;
      return (curr === null ? 0 : curr) + n;
    };

    agg.modis_hotspots = addVal(agg.modis_hotspots, row.modis_hotspots);
    agg.modis_fire_days = addVal(agg.modis_fire_days, row.modis_fire_days);
    agg.viirs_hotspots = addVal(agg.viirs_hotspots, row.viirs_hotspots);
    agg.viirs_fire_days = addVal(agg.viirs_fire_days, row.viirs_fire_days);
    agg.harmonized = addVal(agg.harmonized, row.harmonized);
  }

  const sortedMonths = Array.from(monthMap.keys()).sort();
  return sortedMonths.map(m => monthMap.get(m));
}
