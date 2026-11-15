"""Synthetic-fixture smoke tests for the harmonize and validate scaffolds."""

import polars as pl

from harmonize import apply_harmonization, fit_seasonal_k
from validate import compute_metrics, scatter_points


def test_scaffold_functions_accept_synthetic_frame() -> None:
    frame = pl.DataFrame({"cell_id": ["0.0_0.0"], "month": [0]})
    assert callable(fit_seasonal_k)
    assert callable(apply_harmonization)
    assert callable(compute_metrics)
    assert callable(scatter_points)
