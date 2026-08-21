#!/usr/bin/env python3
"""Cross-platform smoke tests for the two versioned challenge validators."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "zarinpal-agent-skills" / ".agents" / "skills"
DATA_SKILL = SKILLS / "zarinpal-data-contract"
EVIDENCE_SKILL = SKILLS / "zarinpal-insight-traceability"


def run(*arguments: Path | str, expected: int) -> None:
    command = [sys.executable, *(str(argument) for argument in arguments)]
    result = subprocess.run(command, cwd=ROOT, check=False)
    if result.returncode != expected:
        rendered = " ".join(command)
        raise SystemExit(
            f"Expected exit {expected}, received {result.returncode}: {rendered}"
        )


def main() -> int:
    validator = DATA_SKILL / "scripts" / "validate_dataset.py"
    valid_fixture = DATA_SKILL / "tests" / "sample_valid.csv"
    invalid_fixture = DATA_SKILL / "tests" / "sample_invalid.csv"
    evidence_validator = EVIDENCE_SKILL / "scripts" / "validate_evidence.py"
    evidence_fixture = EVIDENCE_SKILL / "assets" / "example-insight-evidence.json"

    before = set(Path(tempfile.gettempdir()).glob("zarinpal_sessions_*.sqlite3"))

    with tempfile.TemporaryDirectory(prefix="zarinpal_validator_test_") as directory:
        report = Path(directory) / "valid-report.json"
        run(
            validator,
            valid_fixture,
            "--json-output",
            report,
            "--fail-on-errors",
            expected=0,
        )
        if not report.is_file():
            raise SystemExit("Dataset validator did not write its JSON report.")

        run(validator, invalid_fixture, "--fail-on-errors", expected=1)
        run(evidence_validator, evidence_fixture, "--fail-on-errors", expected=0)

    leaked = set(Path(tempfile.gettempdir()).glob("zarinpal_sessions_*.sqlite3")) - before
    if leaked:
        raise SystemExit(f"Validator leaked temporary SQLite files: {sorted(leaked)}")

    print("Dataset and evidence validators passed; temporary SQLite cleanup verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
