"""Calibrate VIIRS fire-days to MODIS-equivalent hotspots."""

from __future__ import annotations

import argparse

import polars as pl

import config


def fit_seasonal_k(frame: pl.DataFrame) -> dict[str, float]:
    """Fit MODIS-equivalent k per season from 1-degree x 1-degree x month blocks."""
    # Extract month number from Date column (Polars 2.1 compatible)
    frame = frame.with_columns(pl.col("month").dt.month().alias("month_num"))
    totals = (
        frame.with_columns(
            pl.when(pl.col("month_num").is_between(5, 10)).then(pl.lit("dry")).otherwise(pl.lit("wet")).alias("season")
        )
        .group_by("season")
        .agg(
            pl.col("modis_hotspots").sum().alias("modis"),
            pl.col("viirs_fire_days").sum().alias("virs"),
        )
        .filter(pl.col("virs") > 0)
    )
    return {
        row["season"]: row["modis"] / row["virs"]
        for row in totals.iter_rows(named=True)
    }


def apply_harmonization(frame: pl.DataFrame, k_by_season: dict[str, float]) -> pl.DataFrame:
    """Write harmonized = k_season * VIIRS fire-days onto the cell-month frame."""
    # Extract month number from Date column (Polars 2.1 compatible)
    frame = frame.with_columns(pl.col("month").dt.month().alias("month_num"))
    # Map month number to season via expression (no apply needed)
    k_by_month = pl.when(pl.col("month_num").is_between(5, 10)).then(
        pl.lit(k_by_season.get("dry", 0.0))
    ).otherwise(
        pl.lit(k_by_season.get("wet", 0.0))
    ).alias("k_by_month")
    harmonized = pl.when(pl.col("month").dt.year() < 2012).then(
        pl.col("modis_hotspots").cast(pl.Float64)
    ).otherwise(pl.col("viirs_fire_days").cast(pl.Float64) * k_by_month).alias("harmonized")
    return frame.with_columns(k_by_month, harmonized)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Harmonize FireWatch cell-months.")
    parser.add_argument("--train", default="2012-2018")
    parser.add_argument("--test", default="2019-2025")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    cell_month = pl.read_parquet(config.CELL_MONTH_RAW)
    if cell_month.is_empty():
        raise RuntimeError("cell-month raw table is empty")

    k_by_season = fit_seasonal_k(cell_month)
    cell_month = apply_harmonization(cell_month, k_by_season)
    cell_month.write_parquet(config.CELL_MONTH, compression="zstd")

    # Write calibration.json
    calibration = {
        "k_by_season": k_by_season,
        "train_range": args.train,
        "test_range": args.test,
        "status": "fitted",
    }
    OUT_CALIBRATION = config.INTERIM_DIR / "calibration.json"
    OUT_CALIBRATION.parent.mkdir(parents=True, exist_ok=True)
    OUT_CALIBRATION.write_text(json.dumps(calibration, indent=2))

    print(f"Seasonal k: {k_by_season}")
    print(f"Wrote {config.CELL_MONTH}")
    print(f"Wrote {OUT_CALIBRATION}")


if __name__ == "__main__":
    import json
    main()
