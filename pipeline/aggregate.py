"""Aggregate gridded detections into cell-month sensor counts."""

from __future__ import annotations

import argparse
from pathlib import Path

import polars as pl

import config

OUTPUT_COLUMNS = [
    "cell_id",
    "month",
    "modis_hotspots",
    "modis_fire_days",
    "viirs_hotspots",
    "viirs_fire_days",
]


def aggregate_sensor(sensor: str, prefix: str) -> pl.LazyFrame:
    return (
        pl.scan_parquet(config.GRIDDED_DETECTIONS)
        .filter(pl.col("sensor") == sensor)
        .group_by(["cell_id", "month"])
        .agg(
            pl.len().alias(f"{prefix}_hotspots"),
            pl.col("acq_date").n_unique().alias(f"{prefix}_fire_days"),
        )
    )


def build_cell_month() -> pl.DataFrame:
    if not config.GRIDDED_DETECTIONS.exists():
        raise FileNotFoundError(
            f"{config.GRIDDED_DETECTIONS} not found; run grid.py first"
        )

    modis = aggregate_sensor("MODIS", "modis")
    viirs = aggregate_sensor("VIIRS", "viirs")

    return (
        modis.join(viirs, on=["cell_id", "month"], how="full", coalesce=True)
        .with_columns(
            pl.col("modis_hotspots").fill_null(0).cast(pl.UInt32),
            pl.col("modis_fire_days").fill_null(0).cast(pl.UInt32),
            pl.col("viirs_hotspots").fill_null(0).cast(pl.UInt32),
            pl.col("viirs_fire_days").fill_null(0).cast(pl.UInt32),
        )
        .select(OUTPUT_COLUMNS)
        .sort(["cell_id", "month"])
        .collect()
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aggregate FireWatch cell-months.")
    parser.add_argument("--out", type=Path, default=config.CELL_MONTH_RAW)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out = args.out.expanduser().resolve()

    cell_month = build_cell_month()
    if cell_month.is_empty():
        raise RuntimeError("aggregation produced no rows")

    out.parent.mkdir(parents=True, exist_ok=True)
    cell_month.write_parquet(out, compression="zstd")

    print(f"Cell-month rows: {cell_month.height:,}")
    print(f"Unique cells: {cell_month['cell_id'].n_unique():,}")
    print(f"Month range: {cell_month['month'].min()} to {cell_month['month'].max()}")
    print(
        "Hotspot totals: "
        f"MODIS={cell_month['modis_hotspots'].sum():,}, "
        f"VIIRS={cell_month['viirs_hotspots'].sum():,}"
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
