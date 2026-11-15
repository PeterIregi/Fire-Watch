"""Tests for stable grid-cell formatting."""

import polars as pl

from grid import cell_id_expr, signed_hundredths


def test_signed_hundredths_formats_positive_and_negative_values() -> None:
    frame = pl.DataFrame({"value": [1234, -500, 0]}).select(
        signed_hundredths(pl.col("value")).alias("formatted")
    )

    assert frame["formatted"].to_list() == ["12.34", "-5.00", "0.00"]


def test_cell_id_expr_uses_two_decimal_southwest_corners() -> None:
    frame = pl.DataFrame(
        {
            "latitude": [-1.0, 0.25],
            "longitude": [30.75, 29.5],
        }
    ).select(cell_id_expr(0.25).alias("cell_id"))

    assert frame["cell_id"].to_list() == ["-1.00_30.75", "0.25_29.50"]
