"""Synthetic-fixture execution tests for the harmonize and validate scaffolds.

These tests exercise the functions with real Polars DataFrames (including
Date-typed months, as produced by grid.py), not just `callable()` checks.
"""

from datetime import date

import polars as pl

from harmonize import apply_harmonization, fit_seasonal_k
from validate import compute_metrics, scatter_points


def test_fit_seasonal_k_with_date_month() -> None:
    """fit_seasonal_k should work when month is a Date, not YYYYMM int."""
    frame = pl.DataFrame({
        "cell_id": ["0.0_0.0", "0.0_0.0"],
        "month": [date(2019, 6, 1), date(2019, 11, 1)],
        "modis_hotspots": [100, 200],
        "viirs_fire_days": [50, 80],
    })
    k_by_season = fit_seasonal_k(frame, train_year_start=2019, train_year_end=2020)
    assert "dry" in k_by_season, "expected 'dry' season in k_by_season"
    assert "wet" in k_by_season, "expected 'wet' season in k_by_season"
    # dry k should be ~100/50 = 2.0, wet k should be ~200/80 = 2.5
    assert abs(k_by_season["dry"] - 2.0) < 0.1, f"dry k should be ~2.0, got {k_by_season['dry']}"
    assert abs(k_by_season["wet"] - 2.5) < 0.1, f"wet k should be ~2.5, got {k_by_season['wet']}"


def test_fit_seasonal_k_missing_season_raises() -> None:
    """fit_seasonal_k should raise RuntimeError if a season has no data."""
    frame = pl.DataFrame({
        "cell_id": ["0.0_0.0"],
        "month": [date(2019, 1, 1)],  # only January, no dry/wet seasons with fire
        "modis_hotspots": [10],
        "viirs_fire_days": [1],
    })
    try:
        fit_seasonal_k(frame, train_year_start=2019, train_year_end=2020)
        assert False, "Expected RuntimeError for missing season"
    except RuntimeError as e:
        assert "no data for season(s)" in str(e).lower()


def test_apply_harmonization_with_date_month() -> None:
    """apply_harmonization should work when month is a Date column."""
    frame = pl.DataFrame({
        "cell_id": ["0.0_0.0"],
        "month": [date(2019, 6, 1)],  # June -> dry season
        "modis_hotspots": [100],
        "viirs_fire_days": [50],
    })
    k_by_season = {"dry": 2.0, "wet": 2.5}
    result = apply_harmonization(frame, k_by_season)
    assert "harmonized" in result.columns, "expected 'harmonized' column"
    # harmonized = k_dry * viirs_fire_days = 2.0 * 50 = 100.0
    assert result["harmonized"][0] == 100.0, f"expected 100.0, got {result['harmonized'][0]}"


def test_apply_harmonization_pre_2012() -> None:
    """apply_harmonization should use MODIS counts for pre-2012 months."""
    frame = pl.DataFrame({
        "cell_id": ["0.0_0.0"],
        "month": [date(2005, 3, 1)],  # March -> wet season, but pre-2012
        "modis_hotspots": [80],
        "viirs_fire_days": [30],
    })
    k_by_season = {"dry": 2.0, "wet": 2.5}
    result = apply_harmonization(frame, k_by_season)
    assert "harmonized" in result.columns
    # pre-2012: use MODIS hotspots, not k * VIIRS
    assert result["harmonized"][0] == 80.0, f"expected 80.0 (MODIS), got {result['harmonized'][0]}"


def test_compute_metrics_with_years() -> None:
    """compute_metrics with years=list should return per-year annual error."""
    predicted = [100.0, 200.0, 150.0, 120.0]
    observed = [110.0, 190.0, 140.0, 130.0]
    years = [2019, 2019, 2020, 2020]
    m = compute_metrics(predicted, observed, years=years)
    assert "annual_total_relative_error" in m
    assert "annual_total_relative_error_by_year" in m
    assert 2019 in m["annual_total_relative_error_by_year"]
    assert 2020 in m["annual_total_relative_error_by_year"]
    assert m["spearman"] is not None
    assert -1.0 <= m["spearman"] <= 1.0


def test_compute_metrics_without_years_fallback() -> None:
    """compute_metrics without years should fall back to single total."""
    predicted = [100.0, 200.0]
    observed = [110.0, 190.0]
    m = compute_metrics(predicted, observed)
    assert "annual_total_relative_error" in m
    assert "annual_total_relative_error_by_year" in m
    assert m["annual_total_relative_error_by_year"] == {}
    assert m["spearman"] is not None
    assert -1.0 <= m["spearman"] <= 1.0


def test_scatter_points() -> None:
    """scatter_points should return predicted-observed pairs."""
    predicted = [100.0, 200.0, 150.0]
    observed = [110.0, 190.0, 140.0]
    pairs = scatter_points(predicted, observed)
    assert pairs == [[100.0, 110.0], [200.0, 190.0], [150.0, 140.0]]


def test_scaffold_functions_accept_synthetic_frame() -> None:
    """Original smoke test: functions are callable with synthetic input."""
    frame = pl.DataFrame({"cell_id": ["0.0_0.0"], "month": [0]})
    assert callable(fit_seasonal_k)
    assert callable(apply_harmonization)
    assert callable(compute_metrics)
    assert callable(scatter_points)