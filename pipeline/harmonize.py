"""Calibrate VIIRS fire-days to MODIS-equivalent hotspots."""

import argparse

import polars as pl

import config


def fit_seasonal_k(frame: pl.DataFrame) -> dict[str, float]:
    """Fit MODIS-equivalent k per season from 1-degree x 1-degree x month blocks."""
    ...


def apply_harmonization(frame: pl.DataFrame, k_by_season: dict[str, float]) -> pl.DataFrame:
    """Write harmonized = k_season * VIIRS fire-days onto the cell-month frame."""
    ...


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Harmonize FireWatch cell-months.")
    parser.add_argument("--train", default="2012-2018")
    parser.add_argument("--test", default="2019-2025")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ...
