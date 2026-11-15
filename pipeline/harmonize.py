"""Calibrate VIIRS fire-days to MODIS-equivalent hotspots."""

from __future__ import annotations

import argparse
import json

import polars as pl

import config


def fit_seasonal_k(frame: pl.DataFrame, train_year_start: int = 2012, train_year_end: int = 2018) -> dict[str, float]:
    """Fit MODIS-equivalent k per season from 1-degree x 1-degree x month blocks.

    Only trains on the overlap period (default 2012-2018). Raises RuntimeError
    if any season (dry/wet) has zero fire-days in the train period.
    """
    # Filter to train period by year (Date column, not YYYYMM int)
    frame = frame.filter(pl.col("month").dt.year().is_between(train_year_start, train_year_end))

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

    # Fail loudly if any season has no data in the train period
    required_seasons = {"dry", "wet"}
    found_seasons = set(totals["season"].to_list())
    missing = required_seasons - found_seasons
    if missing:
        raise RuntimeError(f"fit_seasonal_k: no data for season(s) {missing} in train period {train_year_start}-{train_year_end}")

    return {
        row["season"]: row["modis"] / row["virs"]
        for row in totals.iter_rows(named=True)
    }


def apply_harmonization(frame: pl.DataFrame, k_by_season: dict[str, float]) -> pl.DataFrame:
    """Write harmonized = k_season * VIIRS fire-days onto the cell-month frame."""
    # Compute harmonized directly from original columns (no temp columns)
    harmonized = pl.when(pl.col("month").dt.year() < 2012).then(
        pl.col("modis_hotspots").cast(pl.Float64)
    ).otherwise(
        pl.col("viirs_fire_days").cast(pl.Float64)
        * pl.when(pl.col("month").dt.month().is_between(5, 10)).then(
            pl.lit(k_by_season.get("dry", 0.0))
        ).otherwise(pl.lit(k_by_season.get("wet", 0.0)))
    ).alias("harmonized")
    # Contract: cell_month_raw columns + harmonized only
    return frame.with_columns(harmonized)


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

    train_year_start, train_year_end = map(int, args.train.split("-"))
    k_by_season = fit_seasonal_k(cell_month, train_year_start=train_year_start, train_year_end=train_year_end)
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
    main()