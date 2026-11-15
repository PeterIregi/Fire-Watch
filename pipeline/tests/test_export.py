"""Tests for exporting harmonized cell-month data to the web payload."""

from datetime import date

import polars as pl

from export import build_payload, write_payload


def test_build_payload_includes_harmonization_metadata() -> None:
    cell_month = pl.DataFrame(
        {
            "cell_id": ["-1.00_30.75"],
            "month": [date(2012, 1, 1)],
            "modis_hotspots": [10],
            "modis_fire_days": [3],
            "viirs_hotspots": [4],
            "viirs_fire_days": [2],
            "harmonized": [1.5],
        }
    )
    calibration = {
        "k_by_season": {"dry": 1.25, "wet": 0.5},
        "train_range": "2012-2018",
        "test_range": "2019-2025",
        "status": "fitted",
    }
    validation = {
        "train": {"pearson": 0.8},
        "test": {
            "pearson": 0.7,
            "spearman": 0.65,
            "bias": 0.1,
            "mae": 2.0,
            "annual_total_relative_error": 0.05,
            "annual_total_relative_error_by_year": {"2019": 0.05},
        },
        "scatter_points": [[1.5, 1.0]],
    }

    payload = build_payload(
        cell_month,
        "cell_month.parquet",
        calibration,
        validation,
    )

    meta = payload["meta"]
    assert meta["harmonized_status"] == "calibrated"
    assert meta["calibration"]["k_by_season"] == {"dry": 1.25, "wet": 0.5}
    assert meta["calibration"]["status"] == "fitted"
    assert meta["validation"]["spearman"] == 0.65
    assert meta["validation"]["scatter"] == [[1.5, 1.0]]
    assert meta["validation"]["status"] == "validated"
    assert payload["data"]["-1.00_30.75"][0][-1] == 1.5


def test_build_payload_keeps_placeholder_without_harmonized() -> None:
    cell_month = pl.DataFrame(
        {
            "cell_id": ["-1.00_30.75"],
            "month": [date(2012, 1, 1)],
            "modis_hotspots": [10],
            "modis_fire_days": [3],
            "viirs_hotspots": [4],
            "viirs_fire_days": [2],
        }
    )

    payload = build_payload(cell_month, "cell_month_raw.parquet")

    meta = payload["meta"]
    assert meta["harmonized_status"] == "placeholder"
    assert meta["calibration"]["status"] == "placeholder"
    assert meta["validation"]["status"] == "placeholder"
    assert meta["validation"]["scatter"] == []


def test_write_payload_is_path_independent(tmp_path) -> None:
    payload = {"meta": {"version": 1}, "cells": [], "data": {}}
    first = tmp_path / "first.json.gz"
    second = tmp_path / "second.json.gz"

    write_payload(payload, first)
    write_payload(payload, second)

    assert first.read_bytes() == second.read_bytes()
