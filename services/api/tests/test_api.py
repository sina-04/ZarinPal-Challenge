from __future__ import annotations

from dataclasses import replace

from fastapi.testclient import TestClient

import duckdb
import pytest

from app.bootstrap import SourceUnavailableError
from app.main import _database_is_authorized, create_app, ensure_database


def test_health_is_public_and_api_contract_is_typed(built_backend) -> None:
    settings, _, _ = built_backend
    with TestClient(create_app(settings)) as client:
        health = client.get("/healthz")
        assert health.status_code == 200
        assert health.json()["database_ready"] is True
        merchants = client.get("/api/v1/merchants")
        assert merchants.status_code == 200
        assert merchants.json()["total"] == 2
        dashboard = client.get(
            "/api/v1/dashboard",
            params={"merchant_key": "M43", "from": "2026-01-01", "to": "2026-01-04"},
        )
        assert dashboard.status_code == 200
        assert dashboard.json()["meta"]["timezone"] == "Asia/Tehran"


def test_shared_secret_protects_everything_except_health(built_backend) -> None:
    settings, _, _ = built_backend
    protected = replace(settings, internal_api_key="test-secret")
    with TestClient(create_app(protected)) as client:
        assert client.get("/healthz").status_code == 200
        assert client.get("/api/v1/merchants").status_code == 401
        assert client.get("/docs").status_code == 401
        assert client.get("/openapi.json").status_code == 401
        response = client.get(
            "/api/v1/merchants", headers={"X-Internal-API-Key": "test-secret"}
        )
        assert response.status_code == 200


def test_dashboard_and_evidence_reconcile(built_backend) -> None:
    settings, _, _ = built_backend
    with TestClient(create_app(settings)) as client:
        dashboard = client.get(
            "/api/v1/dashboard",
            params={"merchant_key": "M43", "from": "2026-01-01", "to": "2026-01-04"},
        ).json()
        revenue = next(item for item in dashboard["kpis"] if item["metric_id"] == "verified_revenue")
        evidence = client.get(
            f"/api/v1/insights/{revenue['evidence_id']}/evidence"
        ).json()["evidence"]
        assert revenue["value"] == evidence["value"] == 300
        records = client.get(
            f"/api/v1/insights/{revenue['evidence_id']}/records",
            params={"page": 1, "page_size": 1},
        ).json()
        assert records["total"] == 2
        assert len(records["items"]) == 1
        assert records["merchant_key"] == "M43"


def test_invalid_filters_and_unknown_merchants_are_rejected(built_backend) -> None:
    settings, _, _ = built_backend
    with TestClient(create_app(settings)) as client:
        backwards = client.get(
            "/api/v1/dashboard",
            params={"merchant_key": "M43", "from": "2026-01-04", "to": "2026-01-01"},
        )
        assert backwards.status_code == 422
        assert client.get("/api/v1/dashboard", params={"merchant_key": "UNKNOWN"}).status_code == 404


def test_no_attempt_rows_do_not_enter_latency(built_backend) -> None:
    settings, _, _ = built_backend
    with TestClient(create_app(settings)) as client:
        payload = client.get(
            "/api/v1/dashboard",
            params={"merchant_key": "M43", "from": "2026-01-01", "to": "2026-01-04"},
        ).json()
    assert payload["latency"]["init_sample_size"] == 4


def test_openapi_exposes_nested_dashboard_and_evidence_contracts(built_backend) -> None:
    settings, _, _ = built_backend
    schemas = create_app(settings).openapi()["components"]["schemas"]
    dashboard_properties = schemas["DashboardResponse"]["properties"]
    assert dashboard_properties["amount_bands"]["items"]["$ref"].endswith("/AmountBandRow")
    assert dashboard_properties["psp_code_coverage"]["$ref"].endswith("/PspCodeCoverage")
    assert schemas["InsightEvidence"]["properties"]["calculation_inputs"]["$ref"].endswith("/CalculationInputs")
    assert schemas["DashboardResponse"]["additionalProperties"] is False


def test_production_refuses_stale_demo_database(built_backend, tmp_path) -> None:
    settings, _, _ = built_backend
    with duckdb.connect(str(settings.database_path)) as connection:
        connection.execute(
            "UPDATE build_manifest SET value='embedded_demo' WHERE key='source_kind'"
        )
    isolated_base = tmp_path / "isolated" / "services" / "api"
    isolated_base.mkdir(parents=True)
    production = replace(
        settings,
        base_dir=isolated_base,
        dataset_path=None,
        dataset_sha256=None,
        allow_demo_fallback=False,
        force_demo_data=False,
    )
    with pytest.raises(SourceUnavailableError, match="DATASET_SHA256 is required"):
        ensure_database(production)


def test_ready_database_cannot_bypass_configured_hash(built_backend) -> None:
    settings, _, _ = built_backend
    production = replace(settings, dataset_sha256="0" * 64, allow_demo_fallback=False)
    with pytest.raises(SourceUnavailableError, match="SHA-256 mismatch"):
        ensure_database(production)


def test_force_demo_rejects_stale_demo_version(built_backend) -> None:
    settings, _, _ = built_backend
    with duckdb.connect(str(settings.database_path)) as connection:
        connection.execute(
            "UPDATE build_manifest SET value='embedded_demo' WHERE key='source_kind'"
        )
        connection.execute(
            "UPDATE build_manifest SET value='stale-demo-hash' WHERE key='source_sha256'"
        )
        connection.execute(
            "UPDATE build_manifest SET value='embedded-versioned' WHERE key='checksum_status'"
        )
    assert not _database_is_authorized(replace(settings, force_demo_data=True))
