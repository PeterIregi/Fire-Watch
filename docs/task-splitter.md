# Task Splitter

Team Tazama, four people. This document assigns one domain per person so work
moves in parallel without two people editing the same files.

Read it together with the [development plan](development-plan.md) (what gets
built and when) and the [system design](system-design.md) (how the pieces fit).

## 1. Domains at a glance

| Domain | Owner | Primary output | Owned files / folders |
|---|---|---|---|
| A. Data engineering | _to fill_ | Clean, gridded, aggregated data and every file the web app loads | `pipeline/ingest.py`, `clean.py`, `grid.py`, `aggregate.py`, `export.py`, `data/` |
| B. Fire science and validation | _to fill_ | Calibration, harmonized series, held-out validation, method text | `pipeline/harmonize.py`, `validate.py`, `calibration.json`, validation figures and numbers |
| C. Web app core | _to fill_ | Map, area selection, date range, data store, app shell | `web/src/map/`, `web/src/store/`, `web/src/App.jsx`, routing and layout |
| D. Analytics and delivery | _to fill_ | Calendar, charts, KPIs, anomalies, downloads, accessibility, deploy, submission | `web/src/calendar/`, `charts/`, `kpis/`, `anomalies/`, `export/`, `deploy/` |

Each person owns their domain end to end: implementation, tests or sanity
checks, and the matching part of the docs.

## 2. Contracts between domains

These are the handoffs. Agree them before writing code; when one changes,
update the system design in the same pull request and tell the group.

| # | Contract | Producer | Consumers |
|---|---|---|---|
| 1 | `cell_month_raw.parquet`: `cell_id, month, modis_hotspots, modis_fire_days, viirs_hotspots, viirs_fire_days` (system design §5.1, without `harmonized`) | A | B |
| 2 | `cell_month.parquet`: contract 1 plus `harmonized` | B | A (export) |
| 3 | Web data file `firewatch.json.gz` (system design §5.2) | A | C, D |
| 4 | Per-year raw detection files `detections/YYYY.json.gz` (system design §5.3) | A | D |
| 5 | UI selection state `{ aoi, dateRange, source }` and the summed monthly series | C | D |

The calendar, charts and downloads read only the summed series and the shared
selection state. They never reach into each other's modules.

## 3. Work by day

### Before the checkpoint (Day 1)

- **A.** Ingest MODIS (2000+) and VIIRS (2012+), cache per year, clean, grid,
  aggregate. Publish `cell_month_raw.parquet` as early as possible, then the
  first `firewatch.json.gz`, initially with a placeholder `harmonized` value.
- **B.** Sanity-check fire-days, fit the seasonal calibration on 2012-2018,
  validate on 2019-2025, publish coefficients and metrics. Then replace the
  placeholder `harmonized` column.
- **C.** Scaffold the app, load the data file, build the map, rectangle draw and
  coordinate entry, date range, and the selection logic that sums cells.
- **D.** Build the calendar heatmap with the three-way source toggle and
  accessible ramp, the comparison chart, the KPI row, and the anomaly list
  against dummy data.

**Checkpoint:** drawing a box updates the calendar, and raw and harmonized
views both render.

### Day 2

- **A.** Per-year raw detection files, file-size and row-count checks, data
  fixes found by the other domains.
- **B.** Validation panel content, the plain-language reading of the metrics,
  limitations text, and a check of flagged periods against known fire seasons.
- **C.** Wire real data, performance pass, responsive layout, keyboard focus,
  deploy the static build.
- **D.** Aggregate and capped raw CSV downloads, calendar PNG, deploy test on a
  second device, deck, demo script, backup recording, submission form.

## 4. Working rules

- One owner per file or module. Reviewers comment, they do not commit into
  another owner's files without asking.
- One branch per domain: `feat/pipeline`, `feat/harmonize`, `feat/web-core`,
  `feat/insights`. Open a pull request into `main`; one teammate reviews.
- A contract change (column, file name, shape of the selection state) is a
  group announcement, not a silent edit.
- Blocked for more than 15 minutes: say so. A blocked handoff is the one thing
  that stalls all four domains.
- Do not edit `docs/system-design.md` alone if the change affects another
  domain; make it in the pull request that changes the contract.

## 5. Definition of done per domain

**A. Data engineering**
- Full 2000-present run from a clean checkout, every chunk cached.
- `cell_month.parquet` and `firewatch.json.gz` regenerate with the documented
  commands.
- Row counts and cell counts pass the sanity checks in `setup.md` §4.
- Per-year detection files exist for the years the app exports.

**B. Fire science and validation**
- Calibration is fit on 2012-2018 only; test years are never used for fitting.
- Metrics reported as measured: Pearson, Spearman, bias, MAE, annual-total
  relative error, plus the scatter data.
- The harmonized series and every metric can be reproduced from the notebook or
  script in one command.
- The validation panel's wording matches the numbers and the limitations.

**C. Web app core**
- Rectangle and coordinate selection produce the same cell set for the same
  bounds.
- The summed series matches a manual sum over a test AOI.
- The app makes no network calls after the initial load, apart from the
  on-demand raw-detection files used by the raw CSV export.
- Keyboard focus, touch targets, and phone-width layout pass.

**D. Analytics and delivery**
- Calendar, comparison chart, KPIs, and anomalies update for any selection.
- Aggregate CSV, capped raw CSV, and calendar PNG download with clear names and
  labels.
- Public link works on a second device.
- Deck, two-minute demo, and backup recording are ready before the deadline.

## 6. If time runs short

Use the cut order in the development plan §5. Per domain, protect the item the
challenge scores hardest:

- **A:** the data file the app loads.
- **B:** the held-out validation numbers.
- **C:** a working area selection wired to the calendar.
- **D:** the calendar and at least one CSV download.
