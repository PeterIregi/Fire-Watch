# FireWatch pipeline

The pipeline turns the archive FIRMS CSVs into the calibrated static web data
file and the per-year raw-detection exports.

## Prerequisites

- Python 3.12 or newer
- [`uv`](https://docs.astral.sh/uv/) installed
- The raw FIRMS CSV archives under `data/raw/`:

```text
data/raw/modis/modis_*.csv
data/raw/viirs/viirs_*.csv
```

The raw archives are not committed. Download them from the shared Drive folder
linked in the root `README.md`.

## Run everything

From the repository root:

```bash
uv run --project pipeline python pipeline/run.py
```

`uv` creates or updates `pipeline/.venv` from `pyproject.toml` and `uv.lock`,
then runs every stage in order:

```text
ingest -> clean -> grid -> aggregate -> harmonize -> validate -> export -> detections
```

Expected outputs:

| Path | Contents |
|---|---|
| `data/interim/ingest_manifest.json` | Source-file validation summary |
| `data/interim/clean_detections.parquet` | Filtered detections |
| `data/interim/gridded_detections.parquet` | Detections assigned to grid cells |
| `data/interim/cell_month_raw.parquet` | Unharmonized cell-month counts |
| `data/interim/cell_month.parquet` | Cell-month counts with `harmonized` |
| `data/interim/calibration.json` | Seasonal calibration coefficients |
| `data/interim/validation_metrics.json` | Train/test metrics and scatter |
| `web/public/data/firewatch.json.gz` | Calibrated web data |
| `web/public/data/detections/YYYY.json.gz` | Per-year raw detections |

## Tests

From the repository root:

```bash
uv run --project pipeline python -m pytest pipeline/tests -q
```

## Individual stages

Each stage can also be run separately from `pipeline/` after the preceding
stage has produced its output. Run `python <stage>.py --help` for options.
