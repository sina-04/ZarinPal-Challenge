from __future__ import annotations

import csv
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.bootstrap import bootstrap_database
from app.config import OFFICIAL_DATASET_URL, Settings
from app.constants import REQUIRED_COLUMNS
from app.metrics import AnalyticsRepository


def source_row(
    session_key: str,
    merchant_key: str,
    *,
    try_seq: int = 1,
    session_status: str = "Verified",
    try_status: str | None = None,
    amount: int = 100,
    card: str | None = "CARD-1",
    created_day: int = 1,
    category_id: int = 56610001,
    category_title: str = "Ø±Ø´ØªÙ‡ Ù…Ø¹ÛŒÙˆØ¨",
    init_time_ms: int | None = 100,
) -> dict[str, object | None]:
    created = datetime(2026, 1, created_day, 10, 0, 0)
    no_attempt = try_seq == 0
    actual_try_status = try_status or ("NoAttempt" if no_attempt else session_status)
    verified = session_status == "Verified"
    return {
        "session_key": session_key,
        "try_seq": try_seq,
        "terminal_key": f"T-{merchant_key}",
        "merchant_key": merchant_key,
        "category_id": category_id,
        "category_title": category_title,
        "amount": amount,
        "adjusted_fee": 7,
        "session_status": session_status,
        "try_status": actual_try_status,
        "switch_response_code": None,
        "psp_code": None if no_attempt else "PSP-03",
        "issuer_bank_code": "BANK-01" if verified and try_seq > 0 else None,
        "payer_card_key": card if verified and try_seq > 0 else None,
        "verify_type": "Automated",
        "init_time_ms": None if no_attempt else init_time_ms,
        "verify_time_ms": 80 if verified and try_seq > 0 else None,
        "created_at": created.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
        "try_created_at": None if no_attempt else (created + timedelta(seconds=1)).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
        "verified_at": (created + timedelta(seconds=5)).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] if verified else None,
        "settled_at": (created + timedelta(seconds=4)).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] if verified else None,
        "expire_in": (created + timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
    }


def write_csv(path: Path, rows: list[dict[str, object | None]]) -> Path:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=REQUIRED_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    return path


@pytest.fixture()
def source_rows() -> list[dict[str, object | None]]:
    retry_one = source_row(
        "S2", "M43", try_seq=1, session_status="Verified", try_status="InBank", amount=200, card=None, created_day=2, init_time_ms=150
    )
    retry_two = source_row(
        "S2", "M43", try_seq=2, session_status="Verified", try_status="Verified", amount=200, card="CARD-1", created_day=2, init_time_ms=200
    )
    return [
        source_row("S1", "M43", amount=100, card="CARD-1", created_day=1),
        retry_one,
        retry_two,
        source_row("S3", "M43", session_status="Paid", amount=300, card=None, created_day=3),
        source_row("S4", "M43", try_seq=0, session_status="Failed", amount=400, card=None, created_day=4),
        source_row(
            "S5", "M31", amount=500, card="CARD-1", created_day=1,
            category_id=82410000, category_title="Ù…Ø±Ø§Ú©Ø² Ø¢Ù…ÙˆØ²Ø´ÛŒ"
        ),
    ]


@pytest.fixture()
def built_backend(tmp_path: Path, source_rows: list[dict[str, object | None]]):
    source = write_csv(tmp_path / "fixture.csv", source_rows)
    database = tmp_path / "analytics.duckdb"
    settings = Settings(
        base_dir=Path(__file__).resolve().parents[1],
        data_dir=tmp_path / "data",
        database_path=database,
        dataset_path=source,
        dataset_url=OFFICIAL_DATASET_URL,
        dataset_sha256=None,
        internal_api_key=None,
        allow_demo_fallback=False,
    )
    result = bootstrap_database(settings, source=source, database_path=database)
    return settings, result, AnalyticsRepository(database)
