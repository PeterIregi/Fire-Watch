"""Run the complete FireWatch pipeline in order."""

from __future__ import annotations

import subprocess
import sys

import config

STEPS = (
    "ingest.py",
    "clean.py",
    "grid.py",
    "aggregate.py",
    "harmonize.py",
    "validate.py",
    "export.py",
    "detections.py",
)

REQUIRED_OUTPUTS = (
    config.CELL_MONTH_RAW,
    config.CELL_MONTH,
    config.CALIBRATION_JSON,
    config.VALIDATION_METRICS_JSON,
    config.FIREWATCH_JSON,
)


def main() -> None:
    pipeline_dir = config.REPO_ROOT / "pipeline"

    for step in STEPS:
        print(f"\n=== {step} ===", flush=True)
        subprocess.run(
            [sys.executable, step],
            cwd=pipeline_dir,
            check=True,
        )

    missing = [str(path) for path in REQUIRED_OUTPUTS if not path.exists()]
    if missing:
        raise RuntimeError(f"pipeline finished without expected outputs: {missing}")

    print("\nPipeline complete.")
    for path in REQUIRED_OUTPUTS:
        print(f"  {path.relative_to(config.REPO_ROOT)}")


if __name__ == "__main__":
    main()
