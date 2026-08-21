from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from app.bootstrap import (
    DataContractError,
    SourceUnavailableError,
    XLSX_MAX_DATA_ROWS,
    _has_spreadsheet_ceiling_risk,
    bootstrap_database,
)
from app.config import OFFICIAL_DATASET_URL, Settings
from conftest import write_csv


def test_canonical_grains_and_monetary_reconciliation(built_backend) -> None:
    settings, result, _ = built_backend
    assert result.attempt_rows == 6
    assert result.session_rows == 5
    with duckdb.connect(str(settings.database_path), read_only=True) as connection:
        m43 = connection.execute(
            """SELECT count(*), count(*) FILTER (WHERE is_verified),
                      sum(amount) FILTER (WHERE is_verified),
                      count(*) FILTER (WHERE attempt_count > 1),
                      count(*) FILTER (WHERE attempt_count > 1 AND is_verified)
               FROM session_fact WHERE merchant_key='M43'"""
        ).fetchone()
        assert m43 == (4, 2, 300, 1, 1)
        title = connection.execute(
            "SELECT DISTINCT category_title FROM session_fact WHERE merchant_key='M43'"
        ).fetchone()[0]
        assert title == "کیف و کفش فروشی"


def test_no_attempt_is_excluded_from_attempt_denominators(built_backend) -> None:
    settings, _, _ = built_backend
    with duckdb.connect(str(settings.database_path), read_only=True) as connection:
        positive_attempts, timed_attempts, no_attempts = connection.execute(
            """SELECT count(*) FILTER (WHERE try_seq > 0),
                      count(*) FILTER (WHERE try_seq > 0 AND init_time_ms IS NOT NULL),
                      count(*) FILTER (WHERE try_seq = 0)
               FROM attempt_fact WHERE merchant_key='M43'"""
        ).fetchone()
    assert (positive_attempts, timed_attempts, no_attempts) == (4, 4, 1)


def test_session_conflict_stops_without_leaving_temp_database(
    tmp_path: Path, source_rows
) -> None:
    source_rows[2] = {**source_rows[2], "amount": 999}
    source = write_csv(tmp_path / "conflict.csv", source_rows)
    target = tmp_path / "should-not-exist.duckdb"
    settings = Settings(
        base_dir=Path(__file__).resolve().parents[1], data_dir=tmp_path,
        database_path=target, dataset_path=source, dataset_url=OFFICIAL_DATASET_URL,
        dataset_sha256=None, internal_api_key=None, allow_demo_fallback=False,
    )
    with pytest.raises(DataContractError, match="mandatory data-contract") as error:
        bootstrap_database(settings, source=source, database_path=target)
    assert any(issue["check_name"] == "inconsistent_session_fields" for issue in error.value.issues)
    assert not target.exists()
    assert list(tmp_path.glob(".*.building-*.duckdb")) == []


def test_explicit_invalid_source_does_not_silently_fallback(tmp_path: Path) -> None:
    source = write_csv(tmp_path / "invalid.csv", [{"session_key": "S1"}])
    target = tmp_path / "invalid.duckdb"
    settings = Settings(
        base_dir=Path(__file__).resolve().parents[1], data_dir=tmp_path,
        database_path=target, dataset_path=source, dataset_url=OFFICIAL_DATASET_URL,
        dataset_sha256=None, internal_api_key=None, allow_demo_fallback=True,
    )
    with pytest.raises(DataContractError, match="required-value validation"):
        bootstrap_database(settings, source=source, database_path=target, allow_demo_fallback=True)
    assert not target.exists()


def test_non_demo_url_bootstrap_requires_pinned_hash(tmp_path: Path) -> None:
    base_dir = tmp_path / "workspace" / "services" / "api"
    base_dir.mkdir(parents=True)
    target = tmp_path / "production.duckdb"
    settings = Settings(
        base_dir=base_dir, data_dir=tmp_path / "data", database_path=target,
        dataset_path=None, dataset_url=OFFICIAL_DATASET_URL, dataset_sha256=None,
        internal_api_key=None, allow_demo_fallback=False,
    )
    with pytest.raises(SourceUnavailableError, match="DATASET_SHA256 is required"):
        bootstrap_database(
            settings,
            database_path=target,
            download=True,
            allow_demo_fallback=False,
        )
    assert not target.exists()


def test_spreadsheet_row_ceiling_is_marked_partial() -> None:
    assert _has_spreadsheet_ceiling_risk("cleaned_xlsx", XLSX_MAX_DATA_ROWS)
    assert _has_spreadsheet_ceiling_risk("cleaned_markdown", XLSX_MAX_DATA_ROWS)
    assert not _has_spreadsheet_ceiling_risk("csv_gz", XLSX_MAX_DATA_ROWS)
    assert not _has_spreadsheet_ceiling_risk("cleaned_xlsx", XLSX_MAX_DATA_ROWS - 1)
