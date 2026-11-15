/**
 * Aggregate CSV Export Builder (Domain D - Peter)
 * 
 * Complies with System Design §5.1 & §6.3:
 * Columns: cell_id, lat, lon, month, modis_hotspots, modis_fire_days, viirs_hotspots, viirs_fire_days, harmonized
 * File naming: firewatch_aggregate_<start>_<end>.csv
 * RFC 4180 compliant escaping with distinguishable nulls vs true zeros.
 */

export const AGGREGATE_CSV_COLUMNS = [
  'cell_id',
  'lat',
  'lon',
  'month',
  'modis_hotspots',
  'modis_fire_days',
  'viirs_hotspots',
  'viirs_fire_days',
  'harmonized',
];

/**
 * Escapes a single CSV field following RFC 4180 rules.
 * @param {any} val
 * @returns {string}
 */
export function escapeCsvField(val) {
  if (val === null || val === undefined) {
    return ''; // Unavailable observation is empty string (distinct from 0)
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates the filename for aggregate CSV export.
 * @param {string} startMonth
 * @param {string} endMonth
 * @returns {string}
 */
export function getAggregateCsvFilename(startMonth, endMonth) {
  const s = startMonth || 'start';
  const e = endMonth || 'end';
  return `firewatch_aggregate_${s}_${e}.csv`;
}

/**
 * Formats an array of cell-month objects into an RFC 4180 CSV string.
 * 
 * @param {Array<Object>} cellRows Array of cell-month rows
 * @param {string} startMonth 'YYYY-MM'
 * @param {string} endMonth 'YYYY-MM'
 * @returns {string} CSV content
 */
export function generateAggregateCsv(cellRows, startMonth, endMonth) {
  if (!Array.isArray(cellRows) || cellRows.length === 0) {
    return AGGREGATE_CSV_COLUMNS.join(',') + '\r\n';
  }

  // Filter by date range inclusive
  const filtered = cellRows.filter(row => {
    if (!row || !row.month) return false;
    if (startMonth && row.month < startMonth) return false;
    if (endMonth && row.month > endMonth) return false;
    return true;
  });

  // Sort by month then cell_id for determinism
  filtered.sort((a, b) => {
    if (a.month !== b.month) return a.month < b.month ? -1 : 1;
    return (a.cell_id || '') < (b.cell_id || '') ? -1 : 1;
  });

  const lines = [AGGREGATE_CSV_COLUMNS.join(',')];

  for (const r of filtered) {
    const lat = r.lat !== undefined && r.lat !== null ? Number(r.lat).toFixed(2) : '';
    const lon = r.lon !== undefined && r.lon !== null ? Number(r.lon).toFixed(2) : '';
    const harm = r.harmonized !== undefined && r.harmonized !== null
      ? (Number.isInteger(r.harmonized) ? r.harmonized : Number(r.harmonized).toFixed(2))
      : null;

    const rowValues = [
      escapeCsvField(r.cell_id),
      escapeCsvField(lat),
      escapeCsvField(lon),
      escapeCsvField(r.month),
      escapeCsvField(r.modis_hotspots),
      escapeCsvField(r.modis_fire_days),
      escapeCsvField(r.viirs_hotspots),
      escapeCsvField(r.viirs_fire_days),
      escapeCsvField(harm),
    ];
    lines.push(rowValues.join(','));
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Triggers browser download of a CSV string and safely cleans up the Object URL.
 * 
 * @param {string} csvContent
 * @param {string} filename
 */
export function downloadCsvFile(csvContent, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Safely revoke object URL
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
