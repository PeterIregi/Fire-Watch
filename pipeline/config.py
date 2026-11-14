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

# Data window: MODIS starts in late 2000; VIIRS starts later. 2026 is partial.
DATA_START = date(2000, 11, 1)
DATA_END = date(2026, 6, 30)

# Archive standard-processing files only; near-real-time files are excluded.
INCLUDE_NRT = False
ARCHIVE_PATTERN = "fire_archive_*.csv"

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
FIREWATCH_JSON = WEB_DATA_DIR / "firewatch.json.gz"
