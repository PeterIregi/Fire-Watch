"""Tests for per-year detection exports."""

import gzip
import json
from datetime import date

import polars as pl

from detections import export_year, prepare_frame


def gridded_frame() -> pl.DataFrame:
    return pl.DataFrame(
        {
            "sensor": ["MODIS", "VIIRS"],
            "satellite": ["Terra", "SNPP"],
            "acq_date": [date(2026, 6, 30), date(2026, 7, 1)],
            "acq_time": ["1200", "0100"],
            "latitude": [-1.23456, -2.0],
            "longitude": [30.98765, 31.0],
            "confidence": ["80", "n"],
            "frp": [12.345, 7.89],
            "daynight": ["D", "N"],
            "cell_id": ["-1.25_30.75", "-2.00_31.00"],
        }
    )


def test_prepare_frame_clips_to_cutoff_and_rounds_coordinates(tmp_path) -> None:
    path = tmp_path / "gridded.parquet"
    gridded_frame().write_parquet(path)

    frame = prepare_frame(path)

    assert frame.height == 1
    row = frame.row(0, named=True)
    assert row["lat"] == -1.2346
    assert row["lon"] == 30.9876
    assert row["frp"] == 12.3


def test_export_year_writes_count_and_rows(tmp_path) -> None:
    path = tmp_path / "gridded.parquet"
    gridded_frame().write_parquet(path)
    frame = prepare_frame(path)

    rows, size = export_year(frame, 2026, tmp_path)

    assert rows == 1
    assert size > 0
    with gzip.open(tmp_path / "2026.json.gz", "rt") as handle:
        payload = json.load(handle)
    assert payload["year"] == 2026
    assert payload["count"] == 1
    assert len(payload["data"]["sensor"]) == 1


def test_export_year_sorts_by_all_columns_for_stable_output(tmp_path) -> None:
    path = tmp_path / "gridded.parquet"
    frame = pl.DataFrame(
        {
            "sensor": ["MODIS", "MODIS"],
            "satellite": ["Terra", "Terra"],
            "acq_date": [date(2026, 6, 30), date(2026, 6, 30)],
            "acq_time": ["1200", "1200"],
            "latitude": [-1.0, -1.0],
            "longitude": [30.0, 30.0],
            "confidence": ["90", "10"],
            "frp": [10.0, 10.0],
            "daynight": ["D", "D"],
            "cell_id": ["-1.00_30.00", "-1.00_30.00"],
        }
    )
    frame.write_parquet(path)
    prepared = prepare_frame(path)

    export_year(prepared, 2026, tmp_path)

    with gzip.open(tmp_path / "2026.json.gz", "rt") as handle:
        payload = json.load(handle)
    assert payload["data"]["confidence"] == ["10", "90"]
