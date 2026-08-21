from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import Sequence

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.bootstrap import DataContractError, bootstrap_database


def validate_dataset(source: Path) -> dict[str, object]:
    """Validate in an isolated DuckDB and clean it up safely on Windows.

    ``mkstemp`` returns an open OS handle. Closing that handle before removing
    the placeholder is essential on Windows; otherwise DuckDB cannot open the
    path and cleanup can fail with a sharing violation.
    """

    descriptor, temporary_name = tempfile.mkstemp(prefix="zarinpal-validation-", suffix=".duckdb")
    os.close(descriptor)
    temporary = Path(temporary_name)
    temporary.unlink(missing_ok=True)
    try:
        result = bootstrap_database(
            database_path=temporary,
            source=source.resolve(),
            allow_demo_fallback=False,
        )
        return {"valid": True, "errors": [], "manifest": asdict(result)}
    except DataContractError as exc:
        return {"valid": False, "errors": exc.issues or [{"message": str(exc)}], "manifest": None}
    finally:
        temporary.unlink(missing_ok=True)
        Path(str(temporary) + ".wal").unlink(missing_ok=True)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate the ZarinPal challenge dataset")
    parser.add_argument("source", type=Path)
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--fail-on-errors", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    payload = validate_dataset(args.source)
    rendered = json.dumps(payload, ensure_ascii=False, indent=2, default=str) + "\n"
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 1 if args.fail_on_errors and not payload["valid"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
