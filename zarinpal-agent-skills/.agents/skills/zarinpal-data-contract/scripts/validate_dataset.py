#!/usr/bin/env python3
"""Validate the ZarinPal challenge dataset contract.

The validator streams CSV or CSV.GZ input, checks required columns and row-level
rules, and uses a temporary SQLite database to detect inconsistent session-level
fields without loading the full dataset into memory.
"""

from __future__ import annotations

import argparse
import contextlib
import csv
import gzip
import hashlib
import json
import sqlite3
import sys
import tempfile
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import IO, Any, Iterable

REQUIRED_COLUMNS = [
    "session_key", "try_seq", "terminal_key", "merchant_key", "category_id",
    "category_title", "amount", "adjusted_fee", "session_status", "try_status",
    "switch_response_code", "psp_code", "issuer_bank_code", "payer_card_key",
    "verify_type", "init_time_ms", "verify_time_ms", "created_at",
    "try_created_at", "verified_at", "settled_at", "expire_in",
]

SESSION_LEVEL_COLUMNS = [
    "terminal_key", "merchant_key", "category_id", "category_title", "amount",
    "adjusted_fee", "session_status", "verify_type", "created_at", "verified_at",
    "settled_at", "expire_in",
]

SESSION_STATUSES = {"Verified", "Paid", "InBank", "Failed", "Reversed"}
TRY_STATUSES = SESSION_STATUSES | {"NoAttempt"}
TIMESTAMP_COLUMNS = ["created_at", "try_created_at", "verified_at", "settled_at", "expire_in"]
NUMERIC_COLUMNS = ["amount", "adjusted_fee", "init_time_ms", "verify_time_ms"]
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"


def open_text(path: Path) -> IO[str]:
    if path.suffix.lower() == ".gz":
        return gzip.open(path, "rt", encoding="utf-8-sig", newline="")
    return path.open("r", encoding="utf-8-sig", newline="")


def blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def signature(row: dict[str, str]) -> str:
    payload = "\x1f".join(row.get(column, "") for column in SESSION_LEVEL_COLUMNS)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def parse_nonnegative_number(value: str, column: str, row_number: int, errors: list[dict[str, Any]]) -> None:
    if blank(value):
        return
    try:
        number = float(value)
    except ValueError:
        errors.append({"row": row_number, "code": "invalid_number", "column": column, "value": value})
        return
    if number < 0:
        errors.append({"row": row_number, "code": "negative_number", "column": column, "value": value})


def parse_timestamp(value: str, column: str, row_number: int, errors: list[dict[str, Any]]) -> None:
    if blank(value):
        return
    try:
        datetime.strptime(value, TIMESTAMP_FORMAT)
    except ValueError:
        errors.append({"row": row_number, "code": "invalid_timestamp", "column": column, "value": value})


def add_error(errors: list[dict[str, Any]], row: int, code: str, **details: Any) -> None:
    errors.append({"row": row, "code": code, **details})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path, help="Path to a CSV or CSV.GZ dataset")
    parser.add_argument("--json-output", type=Path, help="Write the full report to this JSON file")
    parser.add_argument("--max-error-examples", type=int, default=200, help="Maximum row-level error examples retained")
    parser.add_argument("--fail-on-errors", action="store_true", help="Return exit code 1 when errors are found")
    args = parser.parse_args()

    if not args.dataset.exists():
        print(f"Dataset not found: {args.dataset}", file=sys.stderr)
        return 2

    counters: Counter[str] = Counter()
    session_statuses: Counter[str] = Counter()
    try_statuses: Counter[str] = Counter()
    missing_counts: Counter[str] = Counter()
    errors: list[dict[str, Any]] = []
    error_counts: Counter[str] = Counter()

    tmp = tempfile.NamedTemporaryFile(prefix="zarinpal_sessions_", suffix=".sqlite3", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()
    with contextlib.ExitStack() as stack:
        stack.callback(tmp_path.unlink, missing_ok=True)
        connection = sqlite3.connect(tmp_path)
        stack.callback(connection.close)
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute("PRAGMA synchronous=OFF")
        connection.execute(
            """
            CREATE TABLE sessions (
                session_key TEXT PRIMARY KEY,
                row_signature TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 1,
                inconsistent INTEGER NOT NULL DEFAULT 0,
                no_attempt_rows INTEGER NOT NULL DEFAULT 0,
                positive_attempt_rows INTEGER NOT NULL DEFAULT 0,
                max_try_seq INTEGER NOT NULL DEFAULT 0
            )
            """
        )

        def record_error(row_number: int, code: str, **details: Any) -> None:
            error_counts[code] += 1
            if len(errors) < args.max_error_examples:
                add_error(errors, row_number, code, **details)

        with open_text(args.dataset) as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames is None:
                print("CSV header is missing.", file=sys.stderr)
                return 2

            missing_required = [column for column in REQUIRED_COLUMNS if column not in reader.fieldnames]
            unexpected = [column for column in reader.fieldnames if column not in REQUIRED_COLUMNS]
            if missing_required:
                report = {
                    "valid": False,
                    "fatal": "missing_required_columns",
                    "missing_required_columns": missing_required,
                    "unexpected_columns": unexpected,
                }
                print(json.dumps(report, indent=2, ensure_ascii=False))
                if args.json_output:
                    args.json_output.parent.mkdir(parents=True, exist_ok=True)
                    args.json_output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
                return 1

            for row_number, row in enumerate(reader, start=2):
                counters["rows"] += 1
                for column in REQUIRED_COLUMNS:
                    if blank(row.get(column)):
                        missing_counts[column] += 1

                session_key = (row.get("session_key") or "").strip()
                if not session_key:
                    record_error(row_number, "missing_session_key")
                    continue

                raw_try_seq = (row.get("try_seq") or "").strip()
                try:
                    try_seq = int(raw_try_seq)
                except ValueError:
                    record_error(row_number, "invalid_try_seq", value=raw_try_seq)
                    try_seq = -1

                if try_seq < 0:
                    record_error(row_number, "negative_try_seq", value=raw_try_seq)

                session_status = (row.get("session_status") or "").strip()
                try_status = (row.get("try_status") or "").strip()
                session_statuses[session_status or "<blank>"] += 1
                try_statuses[try_status or "<blank>"] += 1

                if session_status not in SESSION_STATUSES:
                    record_error(row_number, "unexpected_session_status", value=session_status)
                if try_status not in TRY_STATUSES:
                    record_error(row_number, "unexpected_try_status", value=try_status)

                if try_seq == 0:
                    counters["no_attempt_rows"] += 1
                    if try_status != "NoAttempt":
                        record_error(row_number, "try_seq_zero_without_noattempt", try_status=try_status)
                    for column in ("psp_code", "try_created_at"):
                        if not blank(row.get(column)):
                            record_error(row_number, "no_attempt_has_attempt_field", column=column, value=row.get(column))
                elif try_seq > 0:
                    counters["positive_attempt_rows"] += 1
                    if try_status == "NoAttempt":
                        record_error(row_number, "positive_try_seq_with_noattempt")

                for column in NUMERIC_COLUMNS:
                    before = len(errors)
                    local_errors: list[dict[str, Any]] = []
                    parse_nonnegative_number(row.get(column, ""), column, row_number, local_errors)
                    for item in local_errors:
                        record_error(row_number, item["code"], column=column, value=item.get("value"))

                for column in TIMESTAMP_COLUMNS:
                    local_errors = []
                    parse_timestamp(row.get(column, ""), column, row_number, local_errors)
                    for item in local_errors:
                        record_error(row_number, item["code"], column=column, value=item.get("value"))

                if session_status == "Verified" and blank(row.get("verified_at")):
                    record_error(row_number, "verified_session_missing_verified_at")

                if not blank(row.get("payer_card_key")) and blank(row.get("issuer_bank_code")):
                    record_error(row_number, "payer_card_without_issuer_bank")

                sig = signature(row)
                no_attempt = 1 if try_seq == 0 else 0
                positive = 1 if try_seq > 0 else 0
                connection.execute(
                    """
                    INSERT INTO sessions (
                        session_key, row_signature, row_count, inconsistent,
                        no_attempt_rows, positive_attempt_rows, max_try_seq
                    ) VALUES (?, ?, 1, 0, ?, ?, ?)
                    ON CONFLICT(session_key) DO UPDATE SET
                        row_count = row_count + 1,
                        inconsistent = CASE
                            WHEN sessions.row_signature = excluded.row_signature THEN sessions.inconsistent
                            ELSE 1
                        END,
                        no_attempt_rows = no_attempt_rows + excluded.no_attempt_rows,
                        positive_attempt_rows = positive_attempt_rows + excluded.positive_attempt_rows,
                        max_try_seq = MAX(max_try_seq, excluded.max_try_seq)
                    """,
                    (session_key, sig, no_attempt, positive, max(try_seq, 0)),
                )

                if counters["rows"] % 100_000 == 0:
                    connection.commit()

        connection.commit()
        session_count = connection.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        repeated_session_count = connection.execute("SELECT COUNT(*) FROM sessions WHERE row_count > 1").fetchone()[0]
        inconsistent_session_count = connection.execute("SELECT COUNT(*) FROM sessions WHERE inconsistent = 1").fetchone()[0]
        mixed_noattempt_count = connection.execute(
            "SELECT COUNT(*) FROM sessions WHERE no_attempt_rows > 0 AND positive_attempt_rows > 0"
        ).fetchone()[0]
        duplicate_seq_risk_count = connection.execute(
            "SELECT COUNT(*) FROM sessions WHERE positive_attempt_rows > max_try_seq AND max_try_seq > 0"
        ).fetchone()[0]

    if inconsistent_session_count:
        error_counts["inconsistent_session_level_fields"] += inconsistent_session_count
    if mixed_noattempt_count:
        error_counts["session_mixes_noattempt_and_attempt_rows"] += mixed_noattempt_count
    if duplicate_seq_risk_count:
        error_counts["possible_duplicate_try_seq"] += duplicate_seq_risk_count

    report = {
        "valid": sum(error_counts.values()) == 0,
        "dataset": str(args.dataset),
        "row_count": counters["rows"],
        "session_count": session_count,
        "repeated_session_count": repeated_session_count,
        "inconsistent_session_count": inconsistent_session_count,
        "sessions_mixing_noattempt_and_attempt_rows": mixed_noattempt_count,
        "sessions_with_possible_duplicate_try_seq": duplicate_seq_risk_count,
        "session_status_counts": dict(session_statuses),
        "try_status_counts": dict(try_statuses),
        "missing_counts": dict(missing_counts),
        "error_counts": dict(error_counts),
        "error_examples": errors,
        "contract_notes": [
            "Rows are payment attempts, not automatically unique sessions.",
            "Session-level monetary metrics require validated session deduplication.",
            "adjusted_fee is transformed and is not ZarinPal's actual fee.",
            "payer_card_key is scoped within merchant_key.",
        ],
    }

    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(output, encoding="utf-8")

    if args.fail_on_errors and not report["valid"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
