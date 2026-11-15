/**
 * Web App Shared Data Store (Domain C / Domain D Adapter)
 * 
 * Complies with Contract 3 & Contract 5:
 * Loads firewatch.json (sparse grid representation), handles spatial selection,
 * sums cell series, and delivers full-history & selected cell rows.
 */

import { aggregateCellRowsToMonthlySeries } from '../calendar/dataHelpers.js';

export async function fetchFireWatchData(url = '/data/firewatch.json') {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load data file from ${url}: status ${response.status}`);
  }
  return await response.json();
}

/**
 * Checks whether a cell coordinate is within an AOI bounding box [west, south, east, north].
 * 
 * @param {number} lat
 * @param {number} lon
 * @param {number[]} bbox [west, south, east, north]
 * @returns {boolean}
 */
export function isCellInBbox(lat, lon, bbox) {
  if (!bbox || bbox.length !== 4) return true;
  const [w, s, e, n] = bbox;
  return lon >= w && lon <= e && lat >= s && lat <= n;
}

/**
 * Extracts and sums monthly series and cell rows for all cells within an AOI bbox.
 * 
 * @param {Object} rawData Parsed firewatch.json object
 * @param {number[]} bbox [west, south, east, north]
 * @returns {{ cellRows: Array<Object>, monthlySeries: Array<Object>, matchingCells: Array<Object> }}
 */
export function extractSelectionData(rawData, bbox) {
  if (!rawData || !rawData.meta || !rawData.cells || !rawData.data) {
    return { cellRows: [], monthlySeries: [], matchingCells: [] };
  }

  const { months } = rawData.meta;
  const matchingCells = rawData.cells.filter(c => isCellInBbox(c.lat, c.lon, bbox));
  const cellRows = [];

  for (const cell of matchingCells) {
    const observations = rawData.data[cell.id] || [];
    for (const obs of observations) {
      const [mIdx, modisHot, modisFD, viirsHot, viirsFD, harm] = obs;
      const monthStr = months[mIdx];
      if (!monthStr) continue;

      cellRows.push({
        cell_id: cell.id,
        lat: cell.lat,
        lon: cell.lon,
        month: monthStr,
        modis_hotspots: modisHot,
        modis_fire_days: modisFD,
        viirs_hotspots: viirsHot,
        viirs_fire_days: viirsFD,
        harmonized: harm,
      });
    }
  }

  const monthlySeries = aggregateCellRowsToMonthlySeries(cellRows);

  return {
    cellRows,
    monthlySeries,
    matchingCells,
  };
}
