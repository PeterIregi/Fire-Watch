"""Compute held-out harmonization validation metrics and scatter data."""

import argparse

import polars as pl

import config


def compute_metrics(predicted: list[float], observed: list[float]) -> dict:
    """Return Pearson, Spearman, bias, MAE, and annual-total relative error."""
    ...


def scatter_points(predicted: list[float], observed: list[float]) -> list[list[float]]:
    """Return [predicted, observed] pairs for the validation scatter plot."""
    ...


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate FireWatch harmonization.")
    parser.add_argument("--train", default="2012-2018")
    parser.add_argument("--test", default="2019-2025")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ...
