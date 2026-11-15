"""Tests for cell-month aggregation."""

from datetime import date

import polars as pl

import aggregate
import config


def test_build_cell_month_joins_sensors_and_fills_missing_counts(tmp_path, monkeypatch) -> None:
    gridded = pl.DataFrame(
        {
            "sensor": ["MODIS", "MODIS", "VIIRS"],
            "acq_date": [date(2020, 7, 1), date(2020, 7, 2), date(2020, 7, 1)],
            "month": [date(2020, 7, 1)] * 3,
            "cell_id": ["-1.00_30.75"] * 3,
        }
    )
    path = tmp_path / "gridded.parquet"
    gridded.write_parquet(path)
    monkeypatch.setattr(config, "GRIDDED_DETECTIONS", path)

    result = aggregate.build_cell_month()

    assert result.columns == aggregate.OUTPUT_COLUMNS
    assert result.height == 1
    row = result.row(0, named=True)
    assert row["modis_hotspots"] == 2
    assert row["modis_fire_days"] == 2
    assert row["viirs_hotspots"] == 1
    assert row["viirs_fire_days"] == 1
