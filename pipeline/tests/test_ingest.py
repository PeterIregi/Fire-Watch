"""Tests for archive CSV validation."""

import pytest

import config
from ingest import validate_header


def write_header(path, columns) -> None:
    path.write_text(",".join(columns) + "\n", encoding="utf-8")


def test_validate_header_accepts_expected_columns(tmp_path) -> None:
    path = tmp_path / "modis_2000.csv"
    write_header(path, config.SOURCE_COLUMNS)

    assert validate_header(path) == config.SOURCE_COLUMNS


def test_validate_header_rejects_unexpected_columns(tmp_path) -> None:
    path = tmp_path / "modis_2000.csv"
    write_header(path, config.SOURCE_COLUMNS[:-1])

    with pytest.raises(ValueError, match="missing="):
        validate_header(path)
