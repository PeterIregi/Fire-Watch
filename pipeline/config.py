"""Shared constants for the FireWatch data pipeline."""

from datetime import date
from pathlib import Path

# Study area: Tanzania bounding box, west/south/east/north.
BBOX_WEST = 29.3
BBOX_SOUTH = -11.8
BBOX_EAST = 40.5
BBOX_NORTH = -0.9
BBOX = (BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH)

GRID_DEG = 0.25

# Cleaning thresholds.
MODIS_MIN_CONFIDENCE = 30
VIIRS_LOW_CONFIDENCE = frozenset({"l", "low"})
KEEP_FIRE_TYPE = 0

# Source coverage in the current archive files.
MODIS_START = date(2000, 11, 1)
VIIRS_START = date(2012, 1, 20)
DATA_START = MODIS_START

# Processing cutoff. The raw archives extend past this date (MODIS to 2026-08-31,
# VIIRS to 2026-07-31); 2026 is treated as a partial year.
DATA_END = date(2026, 6, 30)

# Current source files are standard-processing archive products only.
MODIS_SOURCE_GLOB = "modis_*.csv"
VIIRS_SOURCE_GLOB = "viirs_*.csv"
SOURCE_GLOBS = {
    "MODIS": MODIS_SOURCE_GLOB,
    "VIIRS": VIIRS_SOURCE_GLOB,
}

# Satellites present in the archive files. VIIRS stays on Suomi NPP only.
MODIS_SATELLITES = frozenset({"Terra", "Aqua"})
VIIRS_SATELLITES = frozenset({"SNPP"})

# Both archive files currently share this 15-column FIRMS schema.
SOURCE_COLUMNS = (
    "latitude",
    "longitude",
    "brightness",
    "scan",
    "track",
    "acq_date",
    "acq_time",
    "satellite",
    "instrument",
    "confidence",
    "version",
    "bright_t31",
    "frp",
    "daynight",
    "type",
)

# Repository paths.
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
MODIS_DIR = RAW_DIR / "modis"
VIIRS_DIR = RAW_DIR / "viirs"
INTERIM_DIR = DATA_DIR / "interim"
WEB_DATA_DIR = REPO_ROOT / "web" / "public" / "data"
SAMPLE_DIR = WEB_DATA_DIR / "sample"
DETECTIONS_DIR = WEB_DATA_DIR / "detections"

# Pipeline outputs.
INGEST_MANIFEST = INTERIM_DIR / "ingest_manifest.json"
CLEAN_DETECTIONS = INTERIM_DIR / "clean_detections.parquet"
GRIDDED_DETECTIONS = INTERIM_DIR / "gridded_detections.parquet"
CELL_MONTH_RAW = INTERIM_DIR / "cell_month_raw.parquet"
CELL_MONTH = INTERIM_DIR / "cell_month.parquet"
CALIBRATION_JSON = INTERIM_DIR / "calibration.json"
VALIDATION_METRICS_JSON = INTERIM_DIR / "validation_metrics.json"
FIREWATCH_JSON = WEB_DATA_DIR / "firewatch.json.gz"
