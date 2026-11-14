# System Design

## 1. Goals and non-goals

**Goals**

- Produce one consistent time series of hotspot activity for Tanzania from
  2000 to the present, regardless of which sensor observed the fire.
- Let a user select an area and date range and instantly see the calendar,
  comparisons, anomalies and a CSV export.
- Show how well the harmonization works (validation), not just assert it.

**Non-goals (prototype)**

- Global coverage, live data, alerts, user accounts, machine learning.
- Burned-area mapping or fire-boundary estimation.
- A backend server or database.

## 2. Architecture

The prototype is an offline pipeline plus a static web app. All heavy
computation happens once, ahead of time. The browser only filters and sums
precomputed aggregates.

```
 NASA FIRMS (archive download / Area API)
        |
        v
 [1] Ingest        pipeline/ingest.py       per-year raw CSVs, cached locally
        |
        v
 [2] Clean         pipeline/clean.py        confidence filter, dedupe, bbox clip
        |
        v
 [3] Grid          pipeline/grid.py         hotspots -> 0.25 deg cells; fire-days
        |
        v
 [4] Aggregate     pipeline/aggregate.py    monthly per cell, both sensors
        |
        v
 [5] Harmonize     pipeline/harmonize.py    calibrate VIIRS -> MODIS-equivalent
        |             + validate             held-out test, metrics, scatter
        v
 [6] Export        pipeline/export.py       compact gzipped JSON + per-year detections
        |
        v
 Static web app (web/)
   Leaflet map + draw tool  ->  AOI bounding box
   data loader              ->  cells inside AOI, summed per month
   calendar, charts, KPIs   ->  ECharts
   CSV export               ->  built in the browser
```

Hosting: GitHub Pages or Vercel (static files only).

## 3. Data sources

| Source | Used for | Notes |
|---|---|---|
| FIRMS MODIS active fire (Terra + Aqua) | Record from 2000 | Confidence is a 0-100 value |
| FIRMS VIIRS 375 m active fire (Suomi NPP) | Record from 2012 | Confidence is low / nominal / high |
| FIRMS VIIRS NOAA-20, NOAA-21 | Optional continuity after MODIS | Check availability first |

Verify before building: which products and years the FIRMS archive offers for
the Tanzania bounding box, and the current request limits of the Area API.
These were not verified when this document was written.

**Tanzania bounding box (approximate):** longitude 29.3 to 40.5, latitude
-11.8 to -0.9. Confirm it covers the whole country, including Zanzibar and
Mafia.

## 4. Harmonization method

### 4.1 Cleaning

- Read the FIRMS CSVs with only the columns needed (`usecols`) and explicit
  dtypes. The full download is about 0.7 GB, which fits in memory on a normal
  laptop, but unused columns are still wasted work.
- Keep only rows inside the bounding box.
- Parse defensively, because the two files differ:
  - `acq_time` is HHMM and can lose its leading zeros (`35` means 00:35).
    Zero-pad to four digits before parsing.
  - `confidence` is numeric (0-100) in the MODIS file and a category (low,
    nominal, high) in the VIIRS file. The VIIRS values may be spelled out or
    abbreviated (`l`, `n`, `h`). Accept both.
- Drop low-confidence detections: MODIS confidence below a threshold
  (default 30), VIIRS confidence low. Thresholds are parameters recorded in
  the output metadata.
- VIIRS only: keep `type` 0 (presumed vegetation fire) and drop the other
  values (active volcano, static land source such as gas flares, offshore).
  Check the exact codes in the FIRMS attribute documentation. The MODIS file
  has no `type` column, so this filter is asymmetric; list it as a limitation.
- Remove exact duplicates (same satellite, time, latitude, longitude).
- Carry `satellite`, `daynight` and `frp` into the cleaned table. Leave
  `brightness`, `scan`, `track`, `bright_t31`, `version` and `instrument` out
  of anything the web app loads.
- Before filtering, print the distinct `satellite`, `confidence` and `type`
  values and the date range of each file. Do not assume them.

### 4.2 Common grid

Each detection is assigned to a 0.25 degree cell:

```
cell_lat = floor(lat / 0.25) * 0.25
cell_lon = floor(lon / 0.25) * 0.25
cell_id  = f"{cell_lat:.2f}_{cell_lon:.2f}"
```

Gridding removes the pixel-size mismatch. 0.1 degrees is an option if the
output size allows.

### 4.3 Fire-days as the bridge

VIIRS reports many small pixels per fire where MODIS reports one. Raw counts
therefore diverge. A **fire-day** is a (cell, date) pair with at least one
detection. Fire-days depend far less on pixel size, so they are the stable
quantity used to relate the two sensors.

For every cell and month and per sensor, the pipeline stores:

- `hotspots`: number of quality-filtered detections
- `fire_days`: number of distinct dates with at least one detection

### 4.4 Calibration

The challenge asks for hotspot counts, so the final unit is **MODIS-equivalent
hotspot counts**.

In the overlap period (2012 to the latest full year), fit:

```
MODIS_hotspots  ~  k_season * VIIRS_fire_days
```

- Fit on coarser blocks (for example 1 degree by 1 degree by month totals)
  so the relationship is stable. Single 0.25 degree cells are too sparse in
  most months.
- One coefficient `k` per season (dry season and wet season at minimum;
  per calendar month if the data supports it).
- Estimate by regression through the origin, or a simple ratio of sums.
  Compare both and keep the one with lower held-out error.

**Single-satellite rule.** Calibrate and build the harmonized series from one
VIIRS satellite (Suomi NPP). If the download also contains NOAA-20 or NOAA-21,
which launched later, do not pool them in: extra overpasses per day raise
fire-days from their start dates for sampling reasons alone, so the training
years (2012-2018) and the test years (2019 onward) would no longer be
comparable. They can stay in the raw-detection files, but not in the
calibrated series. For MODIS, state that Terra and Aqua are pooled and check
that each contributes steadily over the years, since both satellites' overpass
times have drifted in recent years (verify in the MODIS documentation).

### 4.5 The harmonized series

```
harmonized(cell, month) =
    MODIS hotspots                       for months before 2012-01
    k_season * VIIRS fire-days           from 2012-01 onward
```

Rationale: MODIS is observed where it exists, and calibrated VIIRS carries the
record forward as MODIS retires. Raw MODIS is still shown for comparison during
the overlap. **Open decision:** whether to use calibrated VIIRS or observed
MODIS for 2012 to today when both exist. The first choice gives a single
sensor after the switch and a clean handover; the second keeps observed values
longer. Decide after seeing the validation results.

### 4.6 Validation

- Calibrate on 2012-2018. Test on 2019 to the latest full year.
- Metrics on the held-out years: Pearson correlation, Spearman correlation,
  mean bias (predicted minus observed), mean absolute error, and relative error
  of annual totals.
- Output a scatter of predicted versus observed monthly totals, and the same
  metrics per season.
- Report the numbers as measured. Do not tune the method to the test years.

### 4.7 Anomaly scoring

For a selected area (the sum of its cells) and a target month `m` in year `y`:

```
baseline  = harmonized totals for month m in all other years
median    = median(baseline)
MAD       = median(|baseline - median|)
z_robust  = 0.6745 * (x - median) / MAD
```

- Flag as unusual when `z_robust >= 3.5` (high) or `<= -3.5` (low).
  Threshold is configurable.
- If `MAD = 0` (many zero months), fall back to the interquartile range, and
  if that is also zero, flag by absolute departure only.
- Headline figure: current month divided by the historical median for the same
  calendar month, as a percentage difference.

The area-level median is **not** the sum of per-cell medians, so anomaly values
are computed in the browser on the selected area's summed series, not
precomputed per cell.

## 5. Data model

### 5.1 Pipeline tables (Parquet or CSV, kept locally)

`cell_month`

| column | type | description |
|---|---|---|
| cell_id | string | `lat_lon` of the cell's southwest corner |
| month | date | first day of month |
| modis_hotspots | int | filtered MODIS detections |
| modis_fire_days | int | distinct MODIS fire-days |
| viirs_hotspots | int | filtered VIIRS detections |
| viirs_fire_days | int | distinct VIIRS fire-days |
| harmonized | float | MODIS-equivalent hotspots (section 4.5) |

### 5.2 Web data file

One gzipped JSON file loaded at start-up. Sparse (cells and months with no
detections are omitted).

```json
{
  "meta": {
    "version": 1,
    "grid_deg": 0.25,
    "bbox": [29.3, -11.8, 40.5, -0.9],
    "months": ["2000-01", "2000-02", "..."],
    "filters": {"modis_min_conf": 30, "viirs_drop": ["low"]},
    "calibration": {
      "overlap": "2012-2025", "train": "2012-2018", "test": "2019-2025",
      "k_by_season": {"dry": 0.0, "wet": 0.0}
    },
    "validation": {"pearson": 0.0, "bias": 0.0, "mae": 0.0, "scatter": [[0, 0]]}
  },
  "cells": [{"id": "-6.50_35.00", "lat": -6.5, "lon": 35.0}],
  "data": {
    "-6.50_35.00": [[monthIndex, modisHot, modisFD, viirsHot, viirsFD, harmonized]]
  }
}
```

Numbers shown above are placeholders for the schema, not results.

**Size control.** Tanzania at 0.25 degrees is on the order of two thousand
cells. If the file is too large: aggregate to coarser time steps for the
calendar, use a coarser grid, or split the file by year and load on demand.
Decide after measuring the real file size.

### 5.3 Raw detection files (for the raw CSV export)

The aggregate file is enough for the calendar and charts, but the challenge
also asks for a CSV of hotspots detected during a search. The pipeline writes
one gzipped file per year of quality-filtered detections, loaded only when the
user requests a raw export:

`web/public/data/detections/YYYY.json.gz`

| column | type | description |
|---|---|---|
| sensor | string | `MODIS` or `VIIRS` |
| satellite | string | Terra, Aqua, Suomi NPP, NOAA-20, ... |
| acq_date | date | detection date |
| acq_time | string | HHMM UTC |
| lat, lon | float | detection location |
| confidence | int or string | MODIS 0-100, VIIRS low / nominal / high |
| frp | float | fire radiative power (MW) |
| daynight | string | D or N |
| cell_id | string | containing 0.25 degree cell |

The whole raw FIRMS download is about 0.7 GB as CSV. These files keep only
filtered rows and a handful of columns, so they should be a small fraction of
that, but the real size is unknown until the first export. Record the size of
the largest year. If its gzipped file is above about 10 MB, split it by month.
Compaction rules: round latitude and longitude to 4 decimals and FRP to 1
decimal, store column-wise arrays instead of one object per row, and leave out
the columns listed in section 4.1. The browser fetches the years inside the
selected date range, clips to the AOI, and applies the row cap in section 6.3.

## 6. Web application

### 6.1 Modules

| Module | Responsibility |
|---|---|
| `map` | Leaflet map, cell layer shaded by selected-period activity, rectangle draw tool, coordinate inputs |
| `store` | Loads the data file, holds the AOI and date range, computes the selected series |
| `calendar` | Year-by-month heatmap (ECharts), source toggle, colorblind-safe ramp (cividis or viridis) |
| `compare` | Line chart of raw MODIS, raw VIIRS and harmonized over time |
| `kpis` | Current month against median, busiest month, busiest year |
| `anomalies` | Unusual-period list; clicking an item highlights it on the calendar |
| `validation` | Scatter, correlation, bias, and a short plain-language reading |
| `export` | Builds the aggregate CSV or capped raw-detection CSV for the current selection, exports the calendar as PNG, and triggers downloads |
| `limits` | Short limitations note |

### 6.2 Selection logic

1. User draws a rectangle or enters N/S/E/W coordinates.
2. A cell is in the selection if its center lies inside the rectangle.
3. The monthly series for the selection is the per-month sum over those cells.
4. Date range clips the series. KPIs and anomalies recompute.
5. All calendar, chart and KPI computation runs in the browser. The only
   later network calls are the per-year detection files fetched on demand for
   a raw CSV export.

### 6.3 Downloads

Three downloads are offered for the current selection.

**Aggregate CSV (always available).** Columns: `cell_id, lat, lon, month,
modis_hotspots, modis_fire_days, viirs_hotspots, viirs_fire_days,
harmonized`. This is the harmonized cell-month table for the selection, not
raw hotspot rows. It is named `firewatch_aggregate_<start>_<end>.csv` and
labelled accordingly.

**Raw-detection CSV (capped, built after the aggregate CSV works).** Quality-filtered hotspot rows from section
5.3 for the selected years and AOI, with the FIRMS attributes. Because the app
is static, the export is capped at 50,000 rows. Above the cap the app explains
the limit, states how many rows matched, and offers the aggregate CSV instead.
The file is named `firewatch_hotspots_<start>_<end>.csv` and labelled as raw
detections.

**Calendar PNG.** ECharts `getDataURL` saves the current calendar view as
`firewatch_calendar.png`, so the visualization itself can be downloaded, not
only its numbers.

Production would lift the row cap by querying raw detections server-side.

### 6.4 Accessibility

- Sequential color ramp that is colorblind-safe, with lightness differences
  that carry the meaning, not hue alone.
- Real buttons and labelled inputs, visible keyboard focus, 44 px touch targets.
- Text contrast of at least 4.5:1.
- Layout works down to phone width.

### 6.5 Visual design

The first design comp is on the project canvas: main screen with the map,
headline figures and the burning calendar. A validation screen and a mobile
layout are still to be designed.

## 7. Technology choices

| Layer | Choice | Reason |
|---|---|---|
| Data processing | Python, pandas, numpy, scipy | Fast to write; stats built in |
| Storage between steps | Parquet (pyarrow) or CSV | Re-runnable stages |
| Web data format | Gzipped JSON | No backend needed |
| Frontend | React with Vite | Quick scaffold and deploy |
| Map | Leaflet plus Leaflet.draw or Geoman | Rectangle selection |
| Charts | Apache ECharts | Calendar heatmap, scatter and line built in |
| Hosting | GitHub Pages or Vercel | A shareable link |

## 8. Limitations and uncertainty

- Detections, not fires: no boundaries, no exact locations, no burned area.
- Missed fires: cloud, smoke, and overpass timing mean absence of a detection
  is not absence of fire.
- Different overpass times (and so different diurnal fire behavior) between the
  sensors limit agreement. Comparing sensors with similar overpass times
  (Aqua and Suomi NPP) is a possible refinement.
- Calibration is statistical, fitted per season; individual months can deviate.
- Results depend on the filter thresholds, which are configurable and recorded.
- The VIIRS `type` filter removes gas flares and similar static sources, but
  the MODIS file cannot be filtered that way.
- The calibrated series uses one VIIRS satellite on purpose. Adding later
  satellites would improve sampling but break comparability with earlier years.

## 9. Path to production

| Prototype | Production |
|---|---|
| Precomputed static JSON | PostGIS with a tile or API layer |
| Tanzania only | Global coverage, user-defined regions |
| Archive download | Scheduled FIRMS ingestion, near-real-time updates |
| Aggregate CSV plus capped raw-detection CSV | Uncapped raw-detection export from the server |
| Seasonal calibration | Calibration per land-cover class and region, with uncertainty bands |
| None | Alerts when an area departs from its baseline |
