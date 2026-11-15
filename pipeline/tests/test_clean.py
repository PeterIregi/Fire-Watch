"""Tests for sensor confidence filters."""

import polars as pl

from clean import confidence_filter


def test_modis_filter_keeps_confidence_at_or_above_threshold() -> None:
    frame = pl.DataFrame({"confidence": ["29", "30", "100"]})

    filtered = frame.filter(confidence_filter("MODIS", 30, set()))

    assert filtered["confidence"].to_list() == ["30", "100"]


def test_viirs_filter_drops_configured_labels_case_insensitively() -> None:
    frame = pl.DataFrame({"confidence": ["l", "L", "low", "n", "h"]})

    filtered = frame.filter(confidence_filter("VIIRS", 0, {"l", "low"}))

    assert filtered["confidence"].to_list() == ["n", "h"]
