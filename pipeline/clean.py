"""Clean and filter the FireWatch archive detections."""

from __future__ import annotations

import argparse
from pathlib import Path

import polars as pl

import config

DATE_FORMAT = "%Y-%m-%d"
OUTPUT_COLUMNS = [
    "sensor",
    "satellite",
    "acq_date",
    "acq_time",
    "latitude",
    "longitude",
    "confidence",
    "frp",
    "daynight",
]
DEDUPE_COLUMNS = [
    "sensor",
    "satellite",
    "acq_date",
    "acq_time",
    "latitude",
    "longitude",
]
SCHEMA_OVERRIDES = {
    "latitude": pl.Float64,
    "longitude": pl.Float64,
    "acq_date": pl.String,
    "acq_time": pl.String,
    "satellite": pl.String,
    "confidence": pl.String,
    "type": pl.Int8,
    "frp": pl.Float64,
    "daynight": pl.String,
}

SOURCES = {
    "MODIS": (config.MODIS_DIR, config.MODIS_SOURCE_GLOB),
    "VIIRS": (config.VIIRS_DIR, config.VIIRS_SOURCE_GLOB),
}


def source_paths(sensor: str) -> list[Path]:
    directory, pattern = SOURCES[sensor]
    paths = sorted(path for path in directory.glob(pattern) if path.is_file())
    if not paths:
        raise FileNotFoundError(f"no {sensor} files matching {pattern} in {directory}")
    return paths


def confidence_filter(sensor: str, modis_min_confidence: int, viirs_drop: set[str]) -> pl.Expr:
    if sensor == "MODIS":
        return pl.col("confidence").cast(pl.Int16, strict=False) >= modis_min_confidence
    return ~pl.col("confidence").str.to_lowercase().is_in(viirs_drop)


def clean_source(
    path: Path,
    sensor: str,
    *,
    bbox: tuple[float, float, float, float],
    modis_min_confidence: int,
    viirs_drop: set[str],
) -> pl.LazyFrame:
    west, south, east, north = bbox
    return (
        pl.scan_csv(path, schema_overrides=SCHEMA_OVERRIDES)
        .with_columns(
            pl.lit(sensor).alias("sensor"),
            pl.col("acq_date").str.to_date(DATE_FORMAT).alias("acq_date"),
        )
        .filter(
            (pl.col("acq_date") >= config.DATA_START)
            & (pl.col("acq_date") <= config.DATA_END)
            & pl.col("latitude").is_between(south, north)
            & pl.col("longitude").is_between(west, east)
            & (pl.col("type") == config.KEEP_FIRE_TYPE)
            & confidence_filter(sensor, modis_min_confidence, viirs_drop)
        )
        .select(OUTPUT_COLUMNS)
    )


def build_cleaned(
    *,
    bbox: tuple[float, float, float, float],
    modis_min_confidence: int,
    viirs_drop: set[str],
) -> pl.DataFrame:
    frames = []
    for sensor in SOURCES:
        for path in source_paths(sensor):
            print(f"Cleaning {sensor}: {path}")
            frames.append(
                clean_source(
                    path,
                    sensor,
                    bbox=bbox,
                    modis_min_confidence=modis_min_confidence,
                    viirs_drop=viirs_drop,
                )
            )

    cleaned = (
        pl.concat(frames, how="vertical")
        .unique(subset=DEDUPE_COLUMNS, keep="first")
        .collect()
    )
    if cleaned.is_empty():
        raise RuntimeError("cleaning produced no rows")
    return cleaned


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean FireWatch archive detections.")
    parser.add_argument("--modis-min-conf", type=int, default=config.MODIS_MIN_CONFIDENCE)
    parser.add_argument(
        "--viirs-drop",
        nargs="+",
        default=sorted(config.VIIRS_LOW_CONFIDENCE),
        help="VIIRS confidence labels to drop (case-insensitive).",
    )
    parser.add_argument("--out", type=Path, default=config.CLEAN_DETECTIONS)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0 <= args.modis_min_conf <= 100:
        raise ValueError("--modis-min-conf must be between 0 and 100")

    viirs_drop = {value.lower() for value in args.viirs_drop}
    out = args.out.expanduser().resolve()

    cleaned = build_cleaned(
        bbox=config.BBOX,
        modis_min_confidence=args.modis_min_conf,
        viirs_drop=viirs_drop,
    )

    out.parent.mkdir(parents=True, exist_ok=True)
    cleaned.write_parquet(out, compression="zstd")

    print(f"Cleaned rows: {cleaned.height:,}")
    for row in cleaned.group_by("sensor").len().sort("sensor").iter_rows(named=True):
        print(f"  {row['sensor']}: {row['len']:,}")
    print(f"Date range: {cleaned['acq_date'].min()} to {cleaned['acq_date'].max()}")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
