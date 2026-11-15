"""Compute held-out harmonization validation metrics and scatter data."""

import argparse

import polars as pl

import config


def compute_metrics(predicted: list[float], observed: list[float]) -> dict:
    """Return Pearson, Spearman, bias, MAE, and annual-total relative error."""
    n = len(predicted)
    if n < 2:
        return {
            "pearson": 0.0,
            "spearman": 0.0,
            "bias": 0.0,
            "mae": 0.0,
            "annual_total_relative_error": 0.0,
        }
    mean_p = sum(predicted) / n
    mean_o = sum(observed) / n
    cov = sum((p - mean_p) * (o - mean_o) for p, o in zip(predicted, observed)) / (n - 1)
    std_p = (sum((p - mean_p) ** 2 for p in predicted) / (n - 1)) ** 0.5
    std_o = (sum((o - mean_o) ** 2 for o in observed) / (n - 1)) ** 0.5
    pearson = cov / (std_p * std_o) if std_p > 0 and std_o > 0 else 0.0
    bias = mean_p - mean_o
    mae = sum(abs(p - o) for p, o in zip(predicted, observed)) / n
    annual = abs(sum(predicted) - sum(observed)) / abs(sum(observed)) if sum(observed) else 0.0
    return {
        "pearson": pearson,
        "bias": bias,
        "mae": mae,
        "annual_total_relative_error": annual,
    }


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
