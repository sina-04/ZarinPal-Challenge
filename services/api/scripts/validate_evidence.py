from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.evidence import get_evidence_validator


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate ZarinPal insight evidence JSON")
    parser.add_argument("evidence", type=Path)
    parser.add_argument("--fail-on-errors", action="store_true")
    args = parser.parse_args(argv)
    payload = json.loads(args.evidence.read_text(encoding="utf-8"))
    candidates = payload if isinstance(payload, list) else [payload]
    errors: list[dict[str, str]] = []
    validator = get_evidence_validator()
    for index, candidate in enumerate(candidates):
        for error in validator.iter_errors(candidate):
            errors.append(
                {
                    "index": str(index),
                    "path": ".".join(map(str, error.path)),
                    "message": error.message,
                }
            )
    result = {"valid": not errors, "evidence_count": len(candidates), "errors": errors}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if args.fail_on_errors and errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
