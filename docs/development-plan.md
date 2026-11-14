# Development Plan

Team Tazama. NASA Space Apps Challenge 2026, hackathon on November 14-15.
Plan written on November 11, 2026.

## 1. What "done" means

A public link where a visitor can:

1. Pick an area of Tanzania (draw a box or type coordinates) and a date range.
2. See a burning calendar from 2000 to today on a colorblind-safe ramp.
3. Switch between raw MODIS, raw VIIRS and harmonized views.
4. See the current month against the historical median, and the busiest month
   and year.
5. See unusual periods flagged.
6. See the validation of the harmonization.
7. Download a CSV for the selection.
8. Read a short note on limitations.

Plus: a short deck, a two-minute demo script and a backup recording.

## 2. Scope

**In**

- Tanzania, 2000 to present (VIIRS from 2012).
- Precomputed pipeline, static web app.
- Items 1 to 8 above.

**Out (state as next steps, do not build)**

- Global coverage, live data, alerts, accounts, machine learning.
- Burned-area mapping or fire boundaries.
- Raw-detection export for large selections.
- A backend server or database.

## 3. Work items

Grouped by what gets built. No assignment to individuals.

### A. Data pipeline

- [ ] FIRMS MAP_KEY and a working test request
- [ ] Ingest script with per-year caching (MODIS from 2000, VIIRS from 2012)
- [ ] Cleaning: bounding-box clip, confidence filters, deduplication
- [ ] Gridding to 0.25 degrees and fire-day counting
- [ ] Monthly aggregation per cell and sensor
- [ ] Calibration in the 2012-onward overlap (per season)
- [ ] Harmonized series (MODIS-equivalent hotspot counts)
- [ ] Train/test validation, metrics and scatter plot
- [ ] Export of the compact web data file

### B. Web app

- [ ] Project scaffold, data loader, dummy data
- [ ] Leaflet map with cell layer and rectangle draw tool
- [ ] Coordinate entry and date range controls
- [ ] Selection logic (cells in the rectangle, summed per month)
- [ ] Calendar heatmap with three-way source toggle and accessible ramp
- [ ] Comparison line chart (raw MODIS, raw VIIRS, harmonized)
- [ ] Headline figures: current month against median, busiest month and year
- [ ] Anomaly scoring in the browser and the unusual-periods list
- [ ] Validation panel
- [ ] CSV export for the selection
- [ ] Limitations panel
- [ ] Responsive layout and keyboard focus pass
- [ ] Deploy to a public link

### C. Story and submission

- [ ] Final design pass (main screen exists; validation screen and mobile layout pending)
- [ ] Deck: problem, method, validation, demo, limitations, next steps
- [ ] Two-minute demo script, rehearsed
- [ ] Backup screen recording
- [ ] README and repository tidy-up
- [ ] Submission form completed ahead of the deadline

## 4. Timeline

Check the Space Apps rules on how much may be built before the event starts.
The safe approach: use the days before the event for preparation only (data
download and caching, a pipeline prototype on a sample, repository setup,
reading), and do the main build and submission during the event.

### November 11-13: preparation

- Register for a FIRMS MAP_KEY and test a small request.
- Confirm which MODIS and VIIRS products and years FIRMS offers for the
  Tanzania box, and note request limits.
- Download and cache MODIS from 2000 first (fewer rows), then VIIRS from 2012.
- Run cleaning and gridding on one year of each sensor and sanity-check counts.
- Prototype the calibration on the overlap and look at the scatter. This is
  the riskiest step.
- Scaffold the repository and an empty web page with the map and calendar
  loading dummy data.
- On November 13, re-check the challenge's Resources tab for new datasets and
  pick the color ramp.

### Day 1 (November 14): the method works

- Full pipeline for 2000 to present.
- Calibration and train/test validation, with numbers and a scatter plot.
- Export the web data file.
- Map with rectangle selection and date range, calendar wired to real data.
- **Checkpoint:** drawing a box updates the calendar, and raw and harmonized
  views both show.

### Day 2 (November 15): the product is convincing

- Comparison chart, validation panel, limitations panel.
- Headline figures and CSV download.
- Anomaly list. Coordinate entry if time allows.
- Deploy, test on a second device.
- Deck, demo rehearsal, backup recording.
- Submit with time to spare.

## 5. Cut order if time runs short

1. Satellite basemap toggle
2. Fire-season and critical-period highlighting
3. Quick-select regions
4. Coordinate entry
5. Anomaly list

**Never cut:** the calendar, the harmonization, the validation panel, the CSV
download.

## 6. Risks

| Risk | Mitigation |
|---|---|
| FIRMS limits slow the download | Start now, cache every chunk, use the archive tool for bulk requests |
| MODIS from 2000 makes the download large | Pull MODIS first, in per-year files |
| Web data file too large | Coarser grid or time step, split by year |
| Calibration looks noisy | Pool into larger blocks, calibrate per season, report uncertainty |
| Overlap agreement lower than hoped | Present the held-out result honestly; a measured limitation beats an unverified claim |
| Suomi NPP data delivery transition in November 2026 affects which VIIRS product is current | Check FIRMS announcements; use the standard-processing archive for the historical record |
| Someone asks if it is a fire map | Answer: it shows detected thermal activity, not fire boundaries |
| Network fails during the demo | Local build and recorded demo |

## 7. Demo script (two minutes)

1. **Problem.** Raw MODIS and VIIRS counts for the same area disagree, with an
   artificial jump when VIIRS begins.
2. **Fix.** The harmonized series lines up. Show the validation scatter and the
   held-out-years result.
3. **Product.** Draw a box, set a date range, the calendar updates. Toggle raw
   MODIS, raw VIIRS and harmonized.
4. **Insight.** This month against the historical median, busiest month and
   year, and one flagged unusual period.
5. **Output.** Download the CSV.
6. **Honesty.** One sentence on limitations.
7. **Path forward.** Global coverage, PostGIS, live FIRMS data, alerts,
   raw-detection export, extending to more sensors.

## 8. Open decisions

- Harmonized series for 2012 onward: calibrated VIIRS or observed MODIS where
  both exist (see system design, section 4.5).
- Grid size: 0.25 or 0.1 degrees (depends on file size).
- Calendar resolution: monthly only, or monthly plus day-of-year.
- Anomaly threshold: 3.5 robust z-score by default.
- Whether to include NOAA-20 and NOAA-21 VIIRS.
- License.

## 9. Resources to read

- NASA FIRMS: Active Fire Data page, Archive Download, Area API documentation,
  attribute descriptions for MODIS and VIIRS, FAQ and limitations notes.
- Giglio et al. (2016), the Collection 6 MODIS active fire detection
  algorithm, Remote Sensing of Environment.
- Schroeder et al. (2014), the VIIRS 375 m active fire detection product,
  Remote Sensing of Environment.
- The challenge's Resources tab on the Space Apps site, and the challenge
  author's video from CONAE.
- Literature on fire regimes in Tanzanian miombo woodland and East African
  savanna, for context and for sanity-checking flagged periods.
