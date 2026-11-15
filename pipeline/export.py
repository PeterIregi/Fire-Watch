"""Export the cell-month table to the frontend JSON format."""

from __future__ import annotations

import argparse
import gzip
import json
from datetime import date
from pathlib import Path

import polars as pl

import config

ROW_COLUMNS = [
    "cell_id",
    "month",
    "modis_hotspots",
    "modis_fire_days",
    "viirs_hotspots",
    "viirs_fire_days",
]


def month_range(start: date, end: date) -> list[date]:
    """Return every first-of-month date from start through end."""
    months = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        months.append(date(year, month, 1))
        if month == 12:
            year += 1
            month = 1
        else:
            month += 1
    return months


def build_payload(cell_month: pl.DataFrame, source_name: str) -> dict:
    if cell_month.is_empty():
        raise RuntimeError("cell-month table is empty")

    has_harmonized = "harmonized" in cell_month.columns
    harmonized_status = "calibrated" if has_harmonized else "placeholder"
    harmonized_expr = (
        pl.col("harmonized").cast(pl.Float64)
        if has_harmonized
        else pl.col("modis_hotspots").cast(pl.Float64)
    )

    frame = (
        cell_month.with_columns(
            pl.col("cell_id")
            .str.split_exact("_", 1)
            .struct.field("field_0")
            .cast(pl.Float64)
            .alias("lat"),
            pl.col("cell_id")
            .str.split_exact("_", 1)
            .struct.field("field_1")
            .cast(pl.Float64)
            .alias("lon"),
            harmonized_expr.alias("harmonized_value"),
        )
        .select(ROW_COLUMNS + ["lat", "lon", "harmonized_value"])
        .sort(["cell_id", "month"])
    )

    months = month_range(frame["month"].min(), frame["month"].max())
    month_index = {month: index for index, month in enumerate(months)}

    cells = [
        {"id": row["cell_id"], "lat": row["lat"], "lon": row["lon"]}
        for row in frame.select(["cell_id", "lat", "lon"])
        .unique()
        .sort("cell_id")
        .iter_rows(named=True)
    ]

    data: dict[str, list[list[int | float]]] = {}
    for row in frame.iter_rows(named=True):
        data.setdefault(row["cell_id"], []).append(
            [
                month_index[row["month"]],
                int(row["modis_hotspots"]),
                int(row["modis_fire_days"]),
                int(row["viirs_hotspots"]),
                int(row["viirs_fire_days"]),
                float(row["harmonized_value"]),
            ]
        )

    meta = {
        "version": 1,
        "grid_deg": config.GRID_DEG,
        "bbox": list(config.BBOX),
        "months": [month.strftime("%Y-%m") for month in months],
        "filters": {
            "modis_min_conf": config.MODIS_MIN_CONFIDENCE,
            "viirs_drop": sorted(config.VIIRS_LOW_CONFIDENCE),
            "keep_fire_type": config.KEEP_FIRE_TYPE,
        },
        "calibration": {
            "overlap": "2012-2026",
            "train": "2012-2018",
            "test": "2019-2025",
            "k_by_season": {"dry": 0.0, "wet": 0.0},
            "status": "placeholder",
        },
        "validation": {
            "pearson": 0.0,
            "spearman": 0.0,
            "bias": 0.0,
            "mae": 0.0,
            "annual_total_relative_error": 0.0,
            "scatter": [],
            "status": "placeholder",
        },
        "harmonized_status": harmonized_status,
        "data_start": config.DATA_START.isoformat(),
        "data_end": config.DATA_END.isoformat(),
        "source": source_name,
    }
    if harmonized_status == "placeholder":
        meta["harmonized_placeholder"] = "modis_hotspots"

    return {"meta": meta, "cells": cells, "data": data}


def write_payload(payload: dict, out: Path) -> int:
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("wb") as raw:
        with gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as handle:
            handle.write(encoded)
    return out.stat().st_size


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export FireWatch web data.")
    parser.add_argument("--input", type=Path, default=config.CELL_MONTH_RAW)
    parser.add_argument("--out", type=Path, default=config.FIREWATCH_JSON)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.input.expanduser().resolve()
    out = args.out.expanduser().resolve()

    if not source.exists():
        raise FileNotFoundError(f"{source} not found; run aggregate.py first")

    cell_month = pl.read_parquet(source)
    payload = build_payload(cell_month, source.name)
    size = write_payload(payload, out)

    print(f"Cells: {len(payload['cells']):,}")
    print(f"Data rows: {sum(len(rows) for rows in payload['data'].values()):,}")
    print(f"Months: {len(payload['meta']['months'])}")
    print(f"Harmonized status: {payload['meta']['harmonized_status']}")
    print(f"Wrote {out} ({size:,} bytes)")


if __name__ == "__main__":
    main()
