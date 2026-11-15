"""Export quality-filtered detections by year for the raw CSV download."""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path

import polars as pl

import config

COLUMNS = [
    "sensor",
    "satellite",
    "acq_date",
    "acq_time",
    "lat",
    "lon",
    "confidence",
    "frp",
    "daynight",
    "cell_id",
]


def prepare_frame(path: Path) -> pl.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"{path} not found; run grid.py first")

    return (
        pl.read_parquet(path)
        .filter(
            (pl.col("acq_date") >= config.DATA_START)
            & (pl.col("acq_date") <= config.DATA_END)
        )
        .select(
            pl.col("acq_date").dt.year().alias("_year"),
            pl.col("sensor"),
            pl.col("satellite"),
            pl.col("acq_date").dt.strftime("%Y-%m-%d").alias("acq_date"),
            pl.col("acq_time"),
            pl.col("latitude").round(4).alias("lat"),
            pl.col("longitude").round(4).alias("lon"),
            pl.col("confidence"),
            pl.col("frp").round(1).alias("frp"),
            pl.col("daynight"),
            pl.col("cell_id"),
        )
    )


def write_gzip_json(payload: dict, out: Path) -> int:
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    with out.open("wb") as raw:
        with gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as handle:
            handle.write(encoded)
    return out.stat().st_size


def export_year(frame: pl.DataFrame, year: int, out_dir: Path) -> tuple[int, int]:
    year_frame = (
        frame.filter(pl.col("_year") == year)
        .drop("_year")
        .sort(["acq_date", "acq_time", "satellite", "lat", "lon"])
    )
    payload = {
        "year": year,
        "count": year_frame.height,
        "columns": COLUMNS,
        "data": year_frame.select(COLUMNS).to_dict(as_series=False),
    }
    out = out_dir / f"{year}.json.gz"
    return year_frame.height, write_gzip_json(payload, out)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export FireWatch detections by year.")
    parser.add_argument("--input", type=Path, default=config.GRIDDED_DETECTIONS)
    parser.add_argument("--out-dir", type=Path, default=config.DETECTIONS_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.input.expanduser().resolve()
    out_dir = args.out_dir.expanduser().resolve()

    frame = prepare_frame(source)
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.json.gz"):
        stale.unlink()

    years = range(config.DATA_START.year, config.DATA_END.year + 1)
    total_rows = 0
    total_bytes = 0
    largest = (0, 0)

    for year in years:
        rows, size = export_year(frame, year, out_dir)
        total_rows += rows
        total_bytes += size
        if size > largest[1]:
            largest = (year, size)
        print(f"{year}: {rows:,} rows, {size:,} bytes")

    print(f"Total: {total_rows:,} rows, {total_bytes:,} bytes")
    print(f"Largest: {largest[0]} ({largest[1]:,} bytes)")
    if largest[1] > 10 * 1024 * 1024:
        print("WARNING: largest file exceeds 10 MB; split it by month.")


if __name__ == "__main__":
    main()
