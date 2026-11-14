"""Discover and validate the FireWatch source CSVs.

This step does not download anything. It validates the archive files already
present under data/raw/ and writes a manifest for the later pipeline stages.
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import UTC, datetime
from pathlib import Path

import polars as pl

import config


SENSORS = {
    "MODIS": {
        "directory": config.MODIS_DIR,
        "glob": config.MODIS_SOURCE_GLOB,
        "satellites": config.MODIS_SATELLITES,
        "start": config.MODIS_START,
    },
    "VIIRS": {
        "directory": config.VIIRS_DIR,
        "glob": config.VIIRS_SOURCE_GLOB,
        "satellites": config.VIIRS_SATELLITES,
        "start": config.VIIRS_START,
    },
}

DATETIME_FORMAT = "%Y-%m-%d"


def read_header(path: Path) -> tuple[str, ...]:
    """Return the CSV header, failing clearly for an empty file."""
    with path.open(newline="") as handle:
        try:
            return tuple(next(csv.reader(handle)))
        except StopIteration as exc:
            raise ValueError(f"{path}: empty CSV") from exc


def display_path(path: Path) -> str:
    """Use a repo-relative path when possible; keep external paths absolute."""
    try:
        return str(path.resolve().relative_to(config.REPO_ROOT))
    except ValueError:
        return str(path.resolve())


def validate_header(path: Path) -> tuple[str, ...]:
    header = read_header(path)
    if header != config.SOURCE_COLUMNS:
        expected = set(config.SOURCE_COLUMNS)
        actual = set(header)
        raise ValueError(
            f"{path}: unexpected columns; "
            f"missing={sorted(expected - actual)}, extra={sorted(actual - expected)}"
        )
    return header


def summarize_file(path: Path, sensor: str, bbox: tuple[float, ...]) -> dict:
    """Summarize one archive CSV without loading all of its columns."""
    header = validate_header(path)

    west, south, east, north = bbox
    dates = pl.col("acq_date").str.to_date(DATETIME_FORMAT)
    inside_bbox = (
        pl.col("latitude").is_between(south, north)
        & pl.col("longitude").is_between(west, east)
    )

    lf = pl.scan_csv(
        path,
        schema_overrides={
            "latitude": pl.Float64,
            "longitude": pl.Float64,
            "acq_date": pl.String,
            "acq_time": pl.String,
            "satellite": pl.String,
        },
    )

    summary = (
        lf.select(
            pl.len().alias("rows"),
            dates.min().alias("start_date"),
            dates.max().alias("end_date"),
            pl.col("satellite").unique().sort().implode().alias("satellites"),
            (dates <= pl.lit(config.DATA_END)).sum().alias("rows_on_or_before_cutoff"),
            inside_bbox.sum().alias("rows_inside_bbox"),
        )
        .collect()
        .row(0, named=True)
    )

    satellites = summary["satellites"]
    unexpected = set(satellites) - SENSORS[sensor]["satellites"]
    if unexpected:
        raise ValueError(
            f"{path}: unexpected {sensor} satellites {sorted(unexpected)}; "
            f"allowed={sorted(SENSORS[sensor]['satellites'])}"
        )

    rows = summary["rows"]
    return {
        "sensor": sensor,
        "path": display_path(path),
        "file_name": path.name,
        "size_bytes": path.stat().st_size,
        "rows": rows,
        "start_date": summary["start_date"].isoformat(),
        "end_date": summary["end_date"].isoformat(),
        "expected_start": SENSORS[sensor]["start"].isoformat(),
        "satellites": satellites,
        "allowed_satellites": sorted(SENSORS[sensor]["satellites"]),
        "rows_on_or_before_cutoff": summary["rows_on_or_before_cutoff"],
        "rows_after_cutoff": rows - summary["rows_on_or_before_cutoff"],
        "rows_inside_bbox": summary["rows_inside_bbox"],
        "rows_outside_bbox": rows - summary["rows_inside_bbox"],
        "columns": list(header),
    }


def build_manifest(raw_dir: Path, bbox: tuple[float, ...], out: Path) -> dict:
    west, south, east, north = bbox
    if west >= east or south >= north:
        raise ValueError(f"invalid bbox: {bbox}")

    sources = []
    for sensor, settings in SENSORS.items():
        directory = raw_dir / settings["directory"].name
        paths = sorted(path for path in directory.glob(settings["glob"]) if path.is_file())
        if not paths:
            raise FileNotFoundError(f"no {sensor} files matching {settings['glob']} in {directory}")

        for path in paths:
            print(f"Validating {sensor}: {path}")
            sources.append(summarize_file(path, sensor, bbox))

    manifest = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "raw_dir": str(raw_dir),
        "bbox": list(bbox),
        "grid_deg": config.GRID_DEG,
        "data_start": config.DATA_START.isoformat(),
        "data_end": config.DATA_END.isoformat(),
        "filters": {
            "modis_min_confidence": config.MODIS_MIN_CONFIDENCE,
            "viirs_low_confidence": sorted(config.VIIRS_LOW_CONFIDENCE),
            "keep_fire_type": config.KEEP_FIRE_TYPE,
        },
        "source_globs": config.SOURCE_GLOBS,
        "sources": sources,
        "totals": {
            "files": len(sources),
            "rows": sum(source["rows"] for source in sources),
            "rows_on_or_before_cutoff": sum(
                source["rows_on_or_before_cutoff"] for source in sources
            ),
            "rows_inside_bbox": sum(source["rows_inside_bbox"] for source in sources),
        },
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate FireWatch archive CSVs.")
    parser.add_argument("--raw-dir", type=Path, default=config.RAW_DIR)
    parser.add_argument(
        "--bbox",
        type=float,
        nargs=4,
        metavar=("WEST", "SOUTH", "EAST", "NORTH"),
        default=config.BBOX,
        help="Bounding box in west/south/east/north order.",
    )
    parser.add_argument("--out", type=Path, default=config.INGEST_MANIFEST)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    raw_dir = args.raw_dir.expanduser().resolve()
    bbox = tuple(args.bbox)
    out = args.out.expanduser().resolve()

    manifest = build_manifest(raw_dir, bbox, out)
    totals = manifest["totals"]
    print(
        f"Wrote {out} ({totals['files']} files, {totals['rows']:,} rows, "
        f"{totals['rows_on_or_before_cutoff']:,} rows on or before "
        f"{config.DATA_END.isoformat()})"
    )


if __name__ == "__main__":
    main()
