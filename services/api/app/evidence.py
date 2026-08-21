from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping

from jsonschema import Draft202012Validator

from app.constants import COMMON_LIMITATIONS_FA


RESOURCE_DIR = Path(__file__).resolve().parent / "resources"
INSIGHT_ID_PATTERN = re.compile(
    r"^merchant-(?P<merchant>[A-Za-z0-9_]+)--(?P<metric>[a-z0-9._-]+)--"
    r"(?P<start>\d{4}-\d{2}-\d{2})--(?P<end>\d{4}-\d{2}-\d{2})$"
)


class RegistryError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class InsightReference:
    merchant_key: str
    metric_id: str
    start: date
    end: date


class MetricRegistry:
    REQUIRED_FIELDS = {
        "metric_id",
        "name_fa",
        "description_fa",
        "business_question",
        "decision",
        "grain",
        "formula",
        "numerator",
        "denominator",
        "source_columns",
        "filters",
        "exclusions",
        "null_policy",
        "unit",
        "weighting",
        "minimum_sample_rule",
        "owner",
        "version",
        "rag_thresholds",
        "tests",
    }

    def __init__(self, path: Path | None = None):
        payload = json.loads((path or RESOURCE_DIR / "metric-registry.json").read_text(encoding="utf-8"))
        if payload.get("schema_version") != "1.0" or not isinstance(payload.get("metrics"), list):
            raise RegistryError("Metric registry must have schema_version 1.0 and a metrics array.")
        by_id: dict[str, dict[str, Any]] = {}
        for metric in payload["metrics"]:
            missing = self.REQUIRED_FIELDS - set(metric)
            if missing:
                raise RegistryError(
                    f"Metric {metric.get('metric_id', '<unknown>')} is missing {sorted(missing)}"
                )
            metric_id = str(metric["metric_id"])
            if metric_id in by_id:
                raise RegistryError(f"Duplicate metric_id: {metric_id}")
            if metric["grain"] not in {
                "attempt",
                "session",
                "customer_within_merchant",
                "terminal",
                "merchant",
                "category",
                "time_period",
            }:
                raise RegistryError(f"Invalid grain for {metric_id}: {metric['grain']}")
            by_id[metric_id] = metric
        self._by_id = by_id

    def get(self, metric_id: str) -> dict[str, Any]:
        try:
            return self._by_id[metric_id]
        except KeyError as exc:
            raise RegistryError(f"Unknown metric_id: {metric_id}") from exc

    def subset(self, metric_ids: list[str]) -> list[dict[str, Any]]:
        return [self.get(metric_id) for metric_id in metric_ids]

    @property
    def metric_ids(self) -> tuple[str, ...]:
        return tuple(self._by_id)


@lru_cache(maxsize=1)
def get_registry() -> MetricRegistry:
    return MetricRegistry()


@lru_cache(maxsize=1)
def get_evidence_validator() -> Draft202012Validator:
    schema = json.loads(
        (RESOURCE_DIR / "insight-evidence.schema.json").read_text(encoding="utf-8")
    )
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def make_insight_id(merchant_key: str, metric_id: str, start: date, end: date) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", merchant_key):
        raise ValueError("merchant_key contains unsupported characters")
    return f"merchant-{merchant_key}--{metric_id}--{start.isoformat()}--{end.isoformat()}"


def parse_insight_id(value: str) -> InsightReference:
    match = INSIGHT_ID_PATTERN.fullmatch(value)
    if not match:
        raise ValueError("Malformed insight_id")
    return InsightReference(
        merchant_key=match.group("merchant"),
        metric_id=match.group("metric"),
        start=date.fromisoformat(match.group("start")),
        end=date.fromisoformat(match.group("end")),
    )


def parameters_hash(parameters: Mapping[str, Any]) -> str:
    serialized = json.dumps(parameters, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return "sha256:" + hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def build_evidence(
    *,
    registry: MetricRegistry,
    merchant_key: str,
    metric_id: str,
    start: date,
    end: date,
    value: int | float | str | None,
    title: str,
    statement: str,
    sample_size: int,
    comparison: dict[str, Any] | None = None,
    insight_type: str = "descriptive",
    recommendation: dict[str, str] | None = None,
    extra_limitations: list[str] | None = None,
    generated_at: str | None = None,
    numerator_value: int | float | None = None,
    denominator_value: int | float | None = None,
) -> dict[str, Any]:
    metric = registry.get(metric_id)
    params = {
        "merchant_key": merchant_key,
        "metric_id": metric_id,
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
    }
    evidence: dict[str, Any] = {
        "schema_version": "1.0",
        "insight_id": make_insight_id(merchant_key, metric_id, start, end),
        "metric_id": metric_id,
        "title": title,
        "statement": statement,
        "insight_type": insight_type,
        "value": value,
        "unit": metric["unit"],
        "grain": metric["grain"],
        "population": (
            f"Validated records for merchant {merchant_key} with session created_at "
            f"from {start.isoformat()} through {end.isoformat()} in Asia/Tehran"
        ),
        "formula": metric["formula"],
        "source_columns": metric["source_columns"],
        "filters": {
            "merchant_key": merchant_key,
            "created_at_from": start.isoformat(),
            "created_at_to": end.isoformat(),
            "metric_rules": metric["filters"],
        },
        "exclusions": metric["exclusions"],
        "null_policy": metric["null_policy"],
        "date_range": {
            "start": f"{start.isoformat()}T00:00:00",
            "end": f"{end.isoformat()}T23:59:59.999999",
        },
        "timezone": "Asia/Tehran",
        "sample_size": max(0, int(sample_size)),
        "comparison": comparison or {"type": "none"},
        "calculation_inputs": {
            "numerator_definition": metric["numerator"],
            "numerator_value": numerator_value,
            "denominator_definition": metric["denominator"],
            "denominator_value": denominator_value,
        },
        "weighting": metric["weighting"],
        "minimum_sample_rule": metric["minimum_sample_rule"],
        "calculation_version": f"{metric_id}@{metric['version']}",
        "reproduction": {
            "method": "analytical_function",
            "reference": "app.metrics.AnalyticsRepository.dashboard",
            "parameters_hash": parameters_hash(params),
        },
        "limitations": list(COMMON_LIMITATIONS_FA) + list(extra_limitations or []),
        "generated_at": generated_at
        or datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }
    if insight_type == "recommendation":
        if recommendation is None:
            raise ValueError("Recommendation evidence requires recommendation metadata")
        evidence["recommendation"] = recommendation
    errors = sorted(get_evidence_validator().iter_errors(evidence), key=lambda error: list(error.path))
    if errors:
        details = "; ".join(f"{'.'.join(map(str, error.path))}: {error.message}" for error in errors)
        raise ValueError(f"Evidence failed schema validation: {details}")
    return evidence
