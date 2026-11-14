"""Assign cleaned FireWatch detections to the common lat/lon grid."""

from __future__ import annotations

import argparse
from pathlib import Path

import polars as pl

import config

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
    "month",
    "cell_id",
]


def signed_hundredths(value: pl.Expr) -> pl.Expr:
    """Format an integer count of hundredths as a signed two-decimal string."""
    absolute = value.abs()
    return pl.concat_str(
        [
            pl.when(value < 0).then(pl.lit("-")).otherwise(pl.lit("")),
            (absolute // 100).cast(pl.String),
            pl.lit("."),
            (absolute % 100).cast(pl.String).str.zfill(2),
        ],
        separator="",
    )


def cell_id_expr(grid_deg: float) -> pl.Expr:
    """Build a stable southwest-corner cell ID without float formatting drift."""
    hundredths_per_cell = round(grid_deg * 100)
    lat_hundredths = (
        (pl.col("latitude") / grid_deg).floor().cast(pl.Int64) * hundredths_per_cell
    )
    lon_hundredths = (
        (pl.col("longitude") / grid_deg).floor().cast(pl.Int64) * hundredths_per_cell
    )
    return pl.concat_str(
        [
            signed_hundredths(lat_hundredths),
            pl.lit("_"),
            signed_hundredths(lon_hundredths),
        ],
        separator="",
    )


def build_gridded(grid_deg: float) -> pl.DataFrame:
    if not config.CLEAN_DETECTIONS.exists():
        raise FileNotFoundError(
            f"{config.CLEAN_DETECTIONS} not found; run clean.py first"
        )

    return (
        pl.scan_parquet(config.CLEAN_DETECTIONS)
        .with_columns(
            pl.col("acq_date").dt.truncate("1mo").alias("month"),
            cell_id_expr(grid_deg).alias("cell_id"),
        )
        .select(OUTPUT_COLUMNS)
        .collect()
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Grid FireWatch detections.")
    parser.add_argument("--grid", type=float, default=config.GRID_DEG)
    parser.add_argument("--out", type=Path, default=config.GRIDDED_DETECTIONS)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.grid <= 0:
        raise ValueError("--grid must be positive")
    if abs(args.grid * 100 - round(args.grid * 100)) > 1e-9:
        raise ValueError("--grid must be a multiple of 0.01 for two-decimal cell IDs")

    out = args.out.expanduser().resolve()
    gridded = build_gridded(args.grid)

    out.parent.mkdir(parents=True, exist_ok=True)
    gridded.write_parquet(out, compression="zstd")

    print(f"Gridded rows: {gridded.height:,}")
    print(f"Unique cells: {gridded['cell_id'].n_unique():,}")
    print(f"Month range: {gridded['month'].min()} to {gridded['month'].max()}")
    print(f"Example cell IDs: {gridded['cell_id'].head(5).to_list()}")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
