/**
 * Synthetic test fixtures for Domain D (Analytics & Delivery)
 * Spans 2000-01 to 2025-12, covering:
 * - MODIS-only era (2000-01 to 2011-12): viirs is null
 * - VIIRS & MODIS overlap era (2012-01 to 2025-12)
 * - True zeros (e.g., April/May wet season with 0 hotspots)
 * - Missing/unavailable observations (null)
 * - Fractional harmonized values (e.g., 42.75)
 * - Unusually high fire anomaly periods (e.g., August 2019 severe dry season)
 */

export const SAMPLE_AOIS = [
  {
    id: 'serengeti',
    name: 'Serengeti Ecosystem',
    bbox: [34.5, -3.0, 35.5, -2.0],
    description: 'Northern savanna and grassland, strong fire peak around July-September',
  },
  {
    id: 'ruaha',
    name: 'Ruaha National Park & Miombo',
    bbox: [34.0, -8.5, 35.5, -7.0],
    description: 'Central miombo woodlands with extensive dry season burning',
  },
  {
    id: 'selous',
    name: 'Nyerere / Selous Ecosystem',
    bbox: [36.5, -10.0, 38.5, -8.0],
    description: 'Southern lowland miombo and riverine forest reserve',
  },
  {
    id: 'sparse_area',
    name: 'Arusha Highlands (Low Fire)',
    bbox: [36.5, -3.5, 37.0, -3.0],
    description: 'High altitude and montane forest with frequent zero-fire months',
  },
];

/**
 * Generates deterministic synthetic monthly series from 2000-01 to 2025-12.
 */
function createSyntheticMonthlySeries() {
  const series = [];

  for (let year = 2000; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      // Tanzania fire seasonality:
      // Peak dry season: July (7), Aug (8), Sept (9), Oct (10)
      // Transition: June (6), Nov (11)
      // Wet season: Dec (12), Jan (1), Feb (2), Mar (3), Apr (4), May (5)
      let seasonalFactor = 0;
      if (month === 4 || month === 5) {
        seasonalFactor = 0; // True wet season, frequent 0
      } else if (month >= 7 && month <= 9) {
        seasonalFactor = 1.0; // Peak
      } else if (month === 6 || month === 10) {
        seasonalFactor = 0.55;
      } else if (month === 11 || month === 12) {
        seasonalFactor = 0.2;
      } else {
        seasonalFactor = 0.1;
      }

      // Base activity varies by year
      const yearFactor = 1.0 + Math.sin(year * 0.7) * 0.3;
      
      // Inject deliberate anomaly in 2019-08 and 2023-09
      let anomalyMult = 1.0;
      if (year === 2019 && month === 8) {
        anomalyMult = 3.8; // High anomaly
      } else if (year === 2023 && month === 9) {
        anomalyMult = 3.2; // High anomaly
      } else if (year === 2016 && month === 8) {
        anomalyMult = 0.2; // Low anomaly during expected peak
      }

      // MODIS hotspots
      let modisHotspots = null;
      let modisFireDays = null;
      
      // Deliberate missing data edge case in 2003-03
      if (!(year === 2003 && month === 3)) {
        if (seasonalFactor === 0) {
          // True zero
          modisHotspots = 0;
          modisFireDays = 0;
        } else {
          modisHotspots = Math.round((seasonalFactor * 120 * yearFactor * anomalyMult) + (month % 3));
          modisFireDays = Math.min(28, Math.round(modisHotspots / 4.5) + (seasonalFactor > 0 ? 1 : 0));
        }
      }

      // VIIRS hotspots (available only from 2012 onward)
      let viirsHotspots = null;
      let viirsFireDays = null;

      if (year >= 2012) {
        if (seasonalFactor === 0) {
          viirsHotspots = 0;
          viirsFireDays = 0;
        } else {
          // VIIRS detects ~3x more hotspots due to 375m resolution
          viirsHotspots = Math.round((seasonalFactor * 380 * yearFactor * anomalyMult) + (month % 5));
          viirsFireDays = Math.min(30, Math.round(viirsHotspots / 11) + (seasonalFactor > 0 ? 2 : 0));
        }
      }

      // Harmonized series (MODIS-equivalent hotspot counts):
      // Before 2012: MODIS hotspots
      // 2012+: k_season * VIIRS_fire_days (fractional result!)
      let harmonized = null;
      if (year < 2012) {
        harmonized = modisHotspots;
      } else {
        if (viirsFireDays !== null) {
          // k_season dry vs wet: dry ~4.2, wet ~3.1
          const kSeason = (month >= 6 && month <= 10) ? 4.25 : 3.15;
          harmonized = Number((viirsFireDays * kSeason).toFixed(2));
        }
      }

      series.push({
        month: monthStr,
        modis_hotspots: modisHotspots,
        modis_fire_days: modisFireDays,
        viirs_hotspots: viirsHotspots,
        viirs_fire_days: viirsFireDays,
        harmonized,
      });
    }
  }

  return series;
}

export const SYNTHETIC_MONTHLY_SERIES = createSyntheticMonthlySeries();

/**
 * Sample cell rows for aggregate CSV testing.
 */
export const SYNTHETIC_CELL_ROWS = [
  {
    cell_id: '-2.50_34.75',
    lat: -2.5,
    lon: 34.75,
    month: '2022-07',
    modis_hotspots: 18,
    modis_fire_days: 6,
    viirs_hotspots: 52,
    viirs_fire_days: 12,
    harmonized: 19.35,
  },
  {
    cell_id: '-2.50_35.00',
    lat: -2.5,
    lon: 35.0,
    month: '2022-07',
    modis_hotspots: 24,
    modis_fire_days: 8,
    viirs_hotspots: 68,
    viirs_fire_days: 15,
    harmonized: 25.80,
  },
  {
    cell_id: '-2.50_34.75',
    lat: -2.5,
    lon: 34.75,
    month: '2022-08',
    modis_hotspots: 35,
    modis_fire_days: 11,
    viirs_hotspots: 110,
    viirs_fire_days: 20,
    harmonized: 37.10,
  },
  {
    cell_id: '-2.50_35.00',
    lat: -2.5,
    lon: 35.0,
    month: '2022-08',
    modis_hotspots: 41,
    modis_fire_days: 13,
    viirs_hotspots: 132,
    viirs_fire_days: 22,
    harmonized: 43.60,
  },
  {
    cell_id: '-2.50_34.75',
    lat: -2.5,
    lon: 34.75,
    month: '2022-04', // Wet season true zero
    modis_hotspots: 0,
    modis_fire_days: 0,
    viirs_hotspots: 0,
    viirs_fire_days: 0,
    harmonized: 0,
  },
];
