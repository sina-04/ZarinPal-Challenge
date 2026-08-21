from __future__ import annotations

from datetime import date

from app.evidence import get_evidence_validator
from app.metrics import wilson_interval


def test_wilson_interval_contains_observed_rate() -> None:
    low, high = wilson_interval(72, 120)
    assert low is not None and high is not None
    assert low < 0.6 < high


def test_repeat_cards_are_merchant_scoped(built_backend) -> None:
    _, _, repository = built_backend
    m43 = repository.dashboard("M43", date(2026, 1, 1), date(2026, 1, 4))
    m31 = repository.dashboard("M31", date(2026, 1, 1), date(2026, 1, 1))
    assert m43["repeat"] == {
        **m43["repeat"],
        "observed_cards": 1,
        "repeat_cards": 1,
        "observed_repeat_rate": 1.0,
    }
    assert m31["repeat"]["observed_cards"] == 1
    assert m31["repeat"]["repeat_cards"] == 0


def test_peer_benchmark_is_suppressed_without_ten_peers(built_backend) -> None:
    _, _, repository = built_backend
    dashboard = repository.dashboard("M43", date(2026, 1, 1), date(2026, 1, 4))
    assert dashboard["peer"]["eligible"] is False
    assert dashboard["peer"]["median_rate"] is None
    assert dashboard["opportunity"]["value"] is None


def test_all_dashboard_evidence_passes_contract(built_backend) -> None:
    _, _, repository = built_backend
    dashboard = repository.dashboard("M43", date(2026, 1, 1), date(2026, 1, 4))
    ids = {item["evidence_id"] for item in dashboard["kpis"]}
    ids.update(item["insight_id"] for item in dashboard["insights"])
    validator = get_evidence_validator()
    for insight_id in ids:
        evidence = repository.evidence(insight_id)
        assert list(validator.iter_errors(evidence)) == []
        assert evidence["filters"]["merchant_key"] == "M43"
        assert isinstance(evidence["filters"]["metric_rules"], list)
        assert "numerator_definition" in evidence["calculation_inputs"]


def test_adjusted_fee_is_never_presented_as_actual_fee(built_backend) -> None:
    _, _, repository = built_backend
    dashboard = repository.dashboard("M43", date(2026, 1, 1), date(2026, 1, 4))
    assert "does not represent ZarinPal's actual tariff" in dashboard["adjusted_fee_notice"]
    for item in dashboard["kpis"]:
        assert item["metric_id"] != "adjusted_fee"


def test_amount_bands_reconcile_to_session_totals(built_backend) -> None:
    _, _, repository = built_backend
    dashboard = repository.dashboard("M43", date(2026, 1, 1), date(2026, 1, 4))
    assert len(dashboard["amount_bands"]) == 5
    assert sum(band["sessions"] for band in dashboard["amount_bands"]) == 4
    assert sum(band["verified_sessions"] for band in dashboard["amount_bands"]) == 2
    assert sum(band["verified_revenue"] for band in dashboard["amount_bands"]) == 300


def test_psp_code_coverage_reconciles(built_backend) -> None:
    _, _, repository = built_backend
    dashboard = repository.dashboard("M43", date(2026, 1, 1), date(2026, 1, 4))
    coverage = dashboard["psp_code_coverage"]
    assert coverage["eligible_psp_attempts"] == 4
    assert coverage["coded_attempts"] == 0
    assert coverage["missing_code_attempts"] == 4
    assert coverage["coverage_rate"] == 0
    assert dashboard["psp_codes"] == []


def test_trend_includes_zero_activity_dates(built_backend) -> None:
    _, _, repository = built_backend
    dashboard = repository.dashboard("M43", date(2026, 1, 1), date(2026, 1, 5))
    assert [point["date"] for point in dashboard["trend"]] == [date(2026, 1, day) for day in range(1, 6)]
    assert dashboard["trend"][-1] == {
        "date": date(2026, 1, 5),
        "sessions": 0,
        "verified_sessions": 0,
        "verified_revenue": 0,
    }
