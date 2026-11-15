"""Calibrate VIIRS fire-days to MODIS-equivalent hotspots."""

import argparse

import polars as pl

import config


def season_of(month: int) -> str:
    """Map calendar month to dry/wet season."""
    return "dry" if 5 <= month <= 10 else "wet"


def fit_seasonal_k(frame: pl.DataFrame) -> dict[str, float]:
    """Fit MODIS-equivalent k per season from 1-degree x 1-degree x month blocks."""
    totals = (
        frame.with_columns(pl.col("month").apply(season_of).alias("season"))
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
    k_by_month = pl.col("month").apply(season_of).map_elements(
        lambda season: k_by_season.get(season, 0.0), return_dtype=pl.Float64
    )
    harmonized = pl.when(pl.col("month") < 201201).then(
        pl.col("modis_hotspots").cast(pl.Float64)
    ).otherwise(pl.col("viirs_fire_days").cast(pl.Float64) * k_by_month).alias("harmonized")
    return frame.with_columns(harmonized)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Harmonize FireWatch cell-months.")
    parser.add_argument("--train", default="2012-2018")
    parser.add_argument("--test", default="2019-2025")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ...
