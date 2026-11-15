# Setup

This guide describes how to set up the project. The `pipeline/` and `web/`
folders are created during the build, so the scripts named here are planned
and may change names. Update this file as the real commands settle.

## 1. Prerequisites

- Python 3.12 (3.10 or newer works; the scaffold environment uses 3.12)
- [uv](https://docs.astral.sh/uv/) for the Python environment
- Node.js 22 LTS or newer and npm (Vite 8 requires 20.19+ or 22.12+)
- Git
- Optional: a FIRMS **MAP_KEY** only if you need to refresh or extend the download
- Disk space: the raw download is about 0.7 GB; a few GB in total covers
  intermediate files

## 2. Repository

```bash
git clone <repo-url> firewatch
cd firewatch
mkdir -p data/raw/modis data/raw/viirs data/interim
```

The `pipeline/`, `web/`, and `.github/` scaffolds are already in the
repository; see [scaffold.md](scaffold.md) for the full layout. The root
`.gitignore` already excludes `data/`, `.venv/`, `node_modules/`, `dist/`, and
`.env`.

## 3. FIRMS access

**The team has already downloaded the data** (about 0.7 GB, shared through the
Drive folder linked in the README). Put the CSVs under `data/raw/modis/` and
`data/raw/viirs/`. The ingest step reads `modis_*.csv` from the MODIS folder
and `viirs_*.csv` from the VIIRS folder. A MAP_KEY is only needed to refresh or
extend the data; the rest of this section applies only if you need to download
again.

1. Request a MAP_KEY on the FIRMS website (look for the Area API / MAP_KEY
   registration page).
2. Store it as an environment variable, never in the repository:

```bash
export FIRMS_MAP_KEY=your_key_here
```

The current archive-only build does not require a MAP_KEY or an `.env` file.

3. Test a small request before any bulk download.

Two ways to get the data. Check the current documentation for limits before
choosing:

| Method | Use when |
|---|---|
| FIRMS archive download tool | Bulk history for a bounding box and date range |
| FIRMS Area API | Scripted, repeatable pulls; usually capped per request, so pull in small date chunks |

Pull in **per-year chunks** and cache every chunk under `data/raw/<product>/<year>.csv`
so nothing is downloaded twice.

Products to pull (confirm names and availability on FIRMS):

- MODIS standard-processing archive, from 2000
- VIIRS Suomi NPP 375 m standard-processing archive, from 2012
- Optional: VIIRS NOAA-20 and NOAA-21 375 m

## 4. Python pipeline

```bash
cd pipeline
uv sync --all-groups
source .venv/bin/activate          # Windows: .venv\Scripts\activate
```

`pyproject.toml` and `uv.lock` are the source of truth. After adding a
dependency, regenerate the pinned export:

```bash
uv export --format requirements-txt --no-hashes --all-groups --no-emit-project -o requirements.txt
```

Run the complete pipeline from the repository root with one command:

```bash
uv run --project pipeline python pipeline/run.py
```

This runs, in order:

```text
ingest -> clean -> grid -> aggregate -> harmonize -> validate -> export -> detections
```

The raw FIRMS archives must already be under `data/raw/` (see section 3).
Individual stages can still be run separately from `pipeline/`; use
`python <stage>.py --help` for their options.

Expected outputs:

| Step | Output |
|---|---|
| ingest | `data/interim/ingest_manifest.json` |
| clean | `data/interim/clean_detections.parquet` |
| grid | `data/interim/gridded_detections.parquet` |
| aggregate | `data/interim/cell_month_raw.parquet` |
| harmonize | `data/interim/cell_month.parquet`, `calibration.json` |
| validate | `data/interim/validation_metrics.json` |
| export | `web/public/data/firewatch.json.gz` |
| detections | `web/public/data/detections/YYYY.json.gz` |

Tests:

```bash
uv run --project pipeline python -m pytest pipeline/tests -q
```

Sanity checks after each step:

- Row counts per year are plausible and not zero in the dry season (roughly
  May to October).
- Cell count is in the low thousands, not millions.
- MODIS and VIIRS monthly totals move together in the overlap period.
- Before cleaning, print the distinct `satellite`, `confidence` and (VIIRS)
  `type` values and the date range of each file, and confirm which VIIRS
  satellites are present (see system design section 4.4).

Develop against **one year first**, then run the full range.

## 5. Web app

```bash
cd web
npm ci                 # clean install from package-lock.json
npm run dev            # http://localhost:5173
```

The Vite app and `leaflet`, `leaflet-draw`, and `echarts` are already
scaffolded. Replace the demo `App.jsx` with the FireWatch shell.

While the pipeline is unfinished, develop with a small dummy file at
`web/public/data/firewatch.json.gz` that follows the schema in
[system-design.md](system-design.md#52-web-data-file).

Build for hosting:

```bash
npm run build          # outputs web/dist
```

## 6. Deploy

Owned by the web core domain. Others do not change hosting settings.

- **GitHub Pages:** `.github/workflows/deploy.yml` builds and publishes
  `web/dist` on every push to `main`. It sets `VITE_BASE` to the repository
  path, which `vite.config.js` reads. Enable Pages with GitHub Actions as the
  source once.
- **Vercel:** import the repository, set the root directory to `web`, build
  command `npm run build`, output `dist`.

Open the public link on a second device before the demo.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Download returns an error or empty file | Invalid MAP_KEY or request too large | Check the key; shrink the date range; read the error body |
| Requests rejected after many calls | Rate or transaction limit | Pull in smaller chunks and cache; wait and resume |
| Web data file is very large | Too many cells or months | Coarser grid, coarser time step, or split by year |
| Calendar all one color | Ramp bounds set from outliers | Use percentile-based color bounds |
| Map blank on deploy | Wrong Vite `base` path | Set `base` for the hosting path |
| MODIS and VIIRS disagree strongly after calibration | Too few detections per block | Aggregate to coarser blocks; calibrate per season, not per cell |

## 8. Backup plan for the demo

- Keep a recorded screen capture of the full demo.
- Keep a local copy of the built site and the data file.
- Keep the validation figure as a standalone image.
