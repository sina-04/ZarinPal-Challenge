#!/usr/bin/env python3
"""Validate ZarinPal insight-evidence JSON without third-party dependencies."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

REQUIRED = {
    "schema_version", "insight_id", "metric_id", "title", "statement",
    "insight_type", "value", "unit", "grain", "population", "formula",
    "source_columns", "filters", "exclusions", "null_policy", "date_range",
    "timezone", "sample_size", "comparison", "weighting",
    "minimum_sample_rule", "calculation_version", "reproduction",
    "limitations", "generated_at",
}

GRAINS = {"attempt", "session", "customer_within_merchant", "terminal", "merchant", "category", "time_period"}
INSIGHT_TYPES = {"descriptive", "diagnostic", "inferential", "predictive", "recommendation", "alert"}
COMPARISON_TYPES = {"none", "previous_period", "previous_year", "peer_group", "target", "baseline"}
REPRODUCTION_METHODS = {"query_registry", "materialized_aggregate", "analytical_function"}
METRIC_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]*$")
ADJUSTED_FEE_WARNING = "does not represent ZarinPal's actual"


def load_documents(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".jsonl":
        documents = []
        for line_number, line in enumerate(text.splitlines(), start=1):
            if line.strip():
                value = json.loads(line)
                if not isinstance(value, dict):
                    raise ValueError(f"JSONL line {line_number} is not an object")
                documents.append(value)
        return documents

    value = json.loads(text)
    if isinstance(value, list):
        if not all(isinstance(item, dict) for item in value):
            raise ValueError("Every array item must be an object")
        return value
    if not isinstance(value, dict):
        raise ValueError("JSON root must be an object or an array of objects")
    return [value]


def validate(document: dict[str, Any], index: int) -> list[str]:
    errors: list[str] = []
    prefix = f"document[{index}]"

    missing = sorted(REQUIRED - document.keys())
    if missing:
        errors.append(f"{prefix}: missing required fields: {', '.join(missing)}")

    if document.get("schema_version") != "1.0":
        errors.append(f"{prefix}: schema_version must be '1.0'")

    metric_id = document.get("metric_id")
    if not isinstance(metric_id, str) or not METRIC_ID_PATTERN.fullmatch(metric_id):
        errors.append(f"{prefix}: metric_id must match {METRIC_ID_PATTERN.pattern}")

    if document.get("grain") not in GRAINS:
        errors.append(f"{prefix}: invalid grain")

    insight_type = document.get("insight_type")
    if insight_type not in INSIGHT_TYPES:
        errors.append(f"{prefix}: invalid insight_type")

    source_columns = document.get("source_columns")
    if not isinstance(source_columns, list) or not source_columns or not all(isinstance(v, str) and v for v in source_columns):
        errors.append(f"{prefix}: source_columns must be a non-empty string array")

    if not isinstance(document.get("filters"), dict):
        errors.append(f"{prefix}: filters must be an object")

    for field in ("exclusions", "limitations"):
        value = document.get(field)
        if not isinstance(value, list) or (field == "limitations" and not value):
            errors.append(f"{prefix}: {field} must be {'a non-empty' if field == 'limitations' else 'an'} array")

    sample_size = document.get("sample_size")
    if not isinstance(sample_size, int) or isinstance(sample_size, bool) or sample_size < 0:
        errors.append(f"{prefix}: sample_size must be a non-negative integer")

    date_range = document.get("date_range")
    if not isinstance(date_range, dict) or not date_range.get("start") or not date_range.get("end"):
        errors.append(f"{prefix}: date_range must contain start and end")

    comparison = document.get("comparison")
    if not isinstance(comparison, dict) or comparison.get("type") not in COMPARISON_TYPES:
        errors.append(f"{prefix}: comparison.type is missing or invalid")
    elif comparison.get("relative_difference") is not None and comparison.get("value") == 0:
        errors.append(f"{prefix}: relative_difference must not be used with a zero comparison value")

    reproduction = document.get("reproduction")
    if not isinstance(reproduction, dict):
        errors.append(f"{prefix}: reproduction must be an object")
    else:
        if reproduction.get("method") not in REPRODUCTION_METHODS:
            errors.append(f"{prefix}: reproduction.method is missing or invalid")
        for field in ("reference", "parameters_hash"):
            if not isinstance(reproduction.get(field), str) or not reproduction[field].strip():
                errors.append(f"{prefix}: reproduction.{field} is required")

    if insight_type == "recommendation":
        recommendation = document.get("recommendation")
        required_recommendation = {"action", "trigger", "expected_mechanism", "priority", "confidence", "measurement_plan"}
        if not isinstance(recommendation, dict):
            errors.append(f"{prefix}: recommendation object is required")
        else:
            missing_recommendation = required_recommendation - recommendation.keys()
            if missing_recommendation:
                errors.append(f"{prefix}: recommendation missing: {', '.join(sorted(missing_recommendation))}")
            if recommendation.get("priority") not in {"low", "medium", "high"}:
                errors.append(f"{prefix}: recommendation.priority is invalid")
            if recommendation.get("confidence") not in {"exploratory", "supported", "strong"}:
                errors.append(f"{prefix}: recommendation.confidence is invalid")

    if insight_type == "predictive" and not isinstance(document.get("model_evidence"), dict):
        errors.append(f"{prefix}: predictive insight requires model_evidence")

    source_text = " ".join(str(document.get(key, "")) for key in ("formula", "statement", "population", "limitations"))
    uses_adjusted_fee = "adjusted_fee" in source_columns or "adjusted_fee" in source_text
    if uses_adjusted_fee and ADJUSTED_FEE_WARNING.lower() not in source_text.lower():
        errors.append(
            f"{prefix}: evidence using adjusted_fee must state that it does not represent ZarinPal's actual fee"
        )

    if document.get("grain") == "customer_within_merchant":
        columns = set(source_columns or [])
        if not {"merchant_key", "payer_card_key"}.issubset(columns):
            errors.append(
                f"{prefix}: customer_within_merchant evidence must include merchant_key and payer_card_key"
            )

    if "switch_response_code" in set(source_columns or []) and "psp_code" not in set(source_columns or []):
        errors.append(f"{prefix}: switch_response_code evidence must include psp_code")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evidence", type=Path, help="Path to JSON or JSONL evidence")
    parser.add_argument("--report", type=Path, help="Optional JSON validation report")
    parser.add_argument("--fail-on-errors", action="store_true")
    args = parser.parse_args()

    if not args.evidence.exists():
        print(f"Evidence file not found: {args.evidence}", file=sys.stderr)
        return 2

    try:
        documents = load_documents(args.evidence)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"Could not load evidence: {exc}", file=sys.stderr)
        return 2

    all_errors: list[str] = []
    for index, document in enumerate(documents):
        all_errors.extend(validate(document, index))

    report = {
        "valid": not all_errors,
        "document_count": len(documents),
        "error_count": len(all_errors),
        "errors": all_errors,
    }
    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output, encoding="utf-8")

    if args.fail_on_errors and all_errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
