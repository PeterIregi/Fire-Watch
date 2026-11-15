"""Compute held-out harmonization validation metrics and scatter data."""

import argparse
import json

import polars as pl

import config


def compute_metrics(predicted: list[float], observed: list[float], years: list[int] | None = None) -> dict:
    """Return Pearson, Spearman, bias, MAE, and annual-total relative error.

    If ``years`` is provided (same length as predicted/observed), the annual
    total relative error is computed per-year and returned as
    ``annual_total_relative_error_by_year``; otherwise a single total is
    returned (current behaviour).
    """
    n = len(predicted)
    if n < 2:
        return {
            "pearson": 0.0,
            "spearman": 0.0,
            "bias": 0.0,
            "mae": 0.0,
            "annual_total_relative_error": 0.0,
            "annual_total_relative_error_by_year": {},
        }
    mean_p = sum(predicted) / n
    mean_o = sum(observed) / n
    cov = sum((p - mean_p) * (o - mean_o) for p, o in zip(predicted, observed)) / (n - 1)
    std_p = (sum((p - mean_p) ** 2 for p in predicted) / (n - 1)) ** 0.5
    std_o = (sum((o - mean_o) ** 2 for o in observed) / (n - 1)) ** 0.5
    pearson = cov / (std_p * std_o) if std_p > 0 and std_o > 0 else 0.0
    bias = mean_p - mean_o
    mae = sum(abs(p - o) for p, o in zip(predicted, observed)) / n

    if years is not None and len(years) == n:
        # Compute annual total relative error per year
        by_year: dict[int, tuple[int, int]] = {}  # year -> (pred_sum, obs_sum)
        for p, o, y in zip(predicted, observed, years):
            by_year.setdefault(y, [0, 0])
            by_year[y][0] += p
            by_year[y][1] += o
        yearly_errors = {}
        for y, (pred_sum, obs_sum) in by_year.items():
            if obs_sum != 0:
                yearly_errors[y] = abs(pred_sum - obs_sum) / abs(obs_sum)
            else:
                yearly_errors[y] = 0.0
        overall = sum(yearly_errors.values()) / len(yearly_errors) if yearly_errors else 0.0
        return {
            "pearson": pearson,
            "spearman": None,  # placeholder; computed separately if needed
            "bias": bias,
            "mae": mae,
            "annual_total_relative_error": overall,
            "annual_total_relative_error_by_year": yearly_errors,
        }
    else:
        annual = abs(sum(predicted) - sum(observed)) / abs(sum(observed)) if sum(observed) else 0.0
        return {
            "pearson": pearson,
            "spearman": None,
            "bias": bias,
            "mae": mae,
            "annual_total_relative_error": annual,
            "annual_total_relative_error_by_year": {},
        }


def _rank(values: list[float]) -> list[float]:
    ordered = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(ordered):
        j = i
        while j + 1 < len(ordered) and values[ordered[j + 1]] == values[ordered[i]]:
            j += 1
        rank = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[ordered[k]] = rank
        i = j + 1
    return ranks


def scatter_points(predicted: list[float], observed: list[float]) -> list[list[float]]:
    """Return [predicted, observed] pairs for the validation scatter plot."""
    return [
        [p, o] for p, o in zip(predicted, observed)
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate FireWatch harmonization.")
    parser.add_argument("--train", default="2012-2018")
    parser.add_argument("--test", default="2019-2025")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Load harmonized cell-month data
    cell_month = pl.read_parquet(config.CELL_MONTH)
    if cell_month.is_empty():
        raise RuntimeError("cell-month table is empty, run harmonize.py first")

    # Separate train / test periods by year (Date column, not YYYYMM int)
    # Train: 2012–2018 overlap period; Test: 2019–2025 (2026 excluded per data policy)
    train = cell_month.filter(pl.col("month").dt.year().is_between(2012, 2018))
    test = cell_month.filter(pl.col("month").dt.year().is_between(2019, 2025))

    # Build predicted (harmonized) and observed (MODIS) vectors
    train_pred = train["harmonized"].to_list()
    train_obs = train["modis_hotspots"].to_list()
    test_pred = test["harmonized"].to_list()
    test_obs = test["modis_hotspots"].to_list()

    # Compute metrics
    # Pass year labels (per data policy, 2026 is excluded from test set) so
    # compute_metrics returns per-year annual_total_relative_error.
    test_years = test["month"].dt.year().to_list()
    train_metrics = compute_metrics(train_pred, train_obs)
    test_metrics = compute_metrics(test_pred, test_obs, years=test_years)

    # Compute scatter data
    scatter = scatter_points(test_pred, test_obs)

    # Write metrics output
    metrics = {
        "train": train_metrics,
        "test": test_metrics,
        "scatter_points": scatter,
    }
    OUT_METRICS = config.INTERIM_DIR / "validation_metrics.json"
    OUT_METRICS.parent.mkdir(parents=True, exist_ok=True)
    OUT_METRICS.write_text(json.dumps(metrics, indent=2))

    print(f"Train metrics: {train_metrics}")
    print(f"Test metrics: {test_metrics}")
    print(f"Wrote {OUT_METRICS} ({len(scatter)} scatter points)")


if __name__ == "__main__":
    main()
