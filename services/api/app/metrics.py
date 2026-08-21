from __future__ import annotations

import json
import math
import threading
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Iterable

import duckdb

from app.constants import ADJUSTED_FEE_NOTICE
from app.evidence import (
    MetricRegistry,
    build_evidence,
    get_registry,
    parse_insight_id,
)


CALCULATION_VERSION = "dashboard@1.0.0"
FEATURED_MERCHANTS = {"M43", "M31", "M156"}


def _ratio(numerator: int | float, denominator: int | float) -> float | None:
    return float(numerator) / float(denominator) if denominator else None


def _relative_difference(value: int | float, baseline: int | float) -> float | None:
    return (float(value) - float(baseline)) / float(baseline) if baseline else None


def wilson_interval(successes: int, trials: int, z: float = 1.959963984540054) -> tuple[float | None, float | None]:
    if trials <= 0:
        return None, None
    observed = successes / trials
    denominator = 1 + z * z / trials
    center = (observed + z * z / (2 * trials)) / denominator
    margin = z * math.sqrt(observed * (1 - observed) / trials + z * z / (4 * trials * trials)) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)


class AnalyticsRepository:
    def __init__(self, database_path: Path, registry: MetricRegistry | None = None):
        self.database_path = database_path.resolve()
        self.registry = registry or get_registry()
        self._evidence_cache: dict[str, dict[str, Any]] = {}
        self._cache_lock = threading.RLock()

    def _connect(self) -> duckdb.DuckDBPyConnection:
        connection = duckdb.connect(str(self.database_path), read_only=True)
        connection.execute("SET TimeZone='Asia/Tehran'")
        return connection

    @staticmethod
    def _row(cursor: duckdb.DuckDBPyConnection) -> dict[str, Any]:
        values = cursor.fetchone()
        if values is None:
            return {}
        return {description[0]: value for description, value in zip(cursor.description, values)}

    @staticmethod
    def _rows(cursor: duckdb.DuckDBPyConnection) -> list[dict[str, Any]]:
        columns = [description[0] for description in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def manifest(self) -> dict[str, Any]:
        with self._connect() as connection:
            raw = dict(connection.execute("SELECT key, value FROM build_manifest").fetchall())
        parsed: dict[str, Any] = {}
        for key, value in raw.items():
            try:
                parsed[key] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                parsed[key] = value
        return parsed

    def date_range(self, merchant_key: str | None = None) -> tuple[date, date]:
        sql = "SELECT min(cast(created_at AS DATE)), max(cast(created_at AS DATE)) FROM session_fact"
        parameters: list[Any] = []
        if merchant_key:
            sql += " WHERE merchant_key = ?"
            parameters.append(merchant_key)
        with self._connect() as connection:
            row = connection.execute(sql, parameters).fetchone()
        if not row or row[0] is None or row[1] is None:
            raise KeyError(merchant_key or "dataset")
        return row[0], row[1]

    def merchants(self) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = self._rows(
                connection.execute(
                    """
                    SELECT
                        s.merchant_key,
                        any_value(s.category_id)::BIGINT AS category_id,
                        any_value(s.category_title) AS category_title,
                        count(DISTINCT s.terminal_key)::INTEGER AS terminal_count,
                        count(*)::BIGINT AS session_count,
                        count(*) FILTER (WHERE s.is_verified)::BIGINT AS verified_session_count,
                        coalesce(count(*) FILTER (WHERE s.is_verified)::DOUBLE / nullif(count(*), 0), 0) AS verified_session_rate,
                        coalesce(sum(s.amount) FILTER (WHERE s.is_verified), 0)::BIGINT AS verified_revenue,
                        min(cast(s.created_at AS DATE)) AS data_start,
                        max(cast(s.created_at AS DATE)) AS data_end
                    FROM session_fact s
                    GROUP BY s.merchant_key
                    ORDER BY session_count DESC, s.merchant_key
                    """
                )
            )
        for row in rows:
            row["is_featured_demo"] = row["merchant_key"] in FEATURED_MERCHANTS
        return rows

    @staticmethod
    def _validate_dates(start: date, end: date) -> None:
        if end < start:
            raise ValueError("date_to must be on or after date_from")
        if (end - start).days > 366:
            raise ValueError("Date range cannot exceed 367 inclusive days")

    def _session_stats(
        self, connection: duckdb.DuckDBPyConnection, merchant_key: str, start: date, end: date
    ) -> dict[str, Any]:
        return self._row(
            connection.execute(
                """
                SELECT
                    count(*)::BIGINT AS sessions,
                    count(*) FILTER (WHERE is_verified)::BIGINT AS verified_sessions,
                    coalesce(sum(amount) FILTER (WHERE is_verified), 0)::BIGINT AS verified_revenue,
                    count(*) FILTER (WHERE is_paid_not_verified)::BIGINT AS paid_not_verified,
                    count(*) FILTER (WHERE attempt_count = 0)::BIGINT AS no_attempt,
                    count(*) FILTER (WHERE attempt_count > 1)::BIGINT AS retry_sessions,
                    count(*) FILTER (WHERE attempt_count > 1 AND is_verified)::BIGINT AS rescued_sessions,
                    count(*) FILTER (WHERE has_attempt)::BIGINT AS attempted_sessions,
                    count(*) FILTER (WHERE reached_inbank)::BIGINT AS reached_inbank,
                    count(*) FILTER (WHERE reached_paid)::BIGINT AS reached_paid,
                    count(DISTINCT terminal_key)::INTEGER AS terminal_count,
                    any_value(category_id)::BIGINT AS category_id,
                    any_value(category_title) AS category_title
                FROM session_fact
                WHERE merchant_key = ? AND created_at >= ?::DATE
                  AND created_at < (?::DATE + INTERVAL 1 DAY)
                """,
                [merchant_key, start.isoformat(), end.isoformat()],
            )
        )

    def _repeat_stats(
        self, connection: duckdb.DuckDBPyConnection, merchant_key: str, start: date, end: date
    ) -> dict[str, Any]:
        return self._row(
            connection.execute(
                """
                WITH cards AS (
                    SELECT payer_card_key, count(*)::BIGINT AS verified_sessions
                    FROM session_fact
                    WHERE merchant_key = ? AND is_verified AND payer_card_key IS NOT NULL
                      AND created_at >= ?::DATE AND created_at < (?::DATE + INTERVAL 1 DAY)
                    GROUP BY payer_card_key
                )
                SELECT count(*)::BIGINT AS observed_cards,
                       count(*) FILTER (WHERE verified_sessions >= 2)::BIGINT AS repeat_cards
                FROM cards
                """,
                [merchant_key, start.isoformat(), end.isoformat()],
            )
        )

    def _latency_stats(
        self, connection: duckdb.DuckDBPyConnection, merchant_key: str, start: date, end: date
    ) -> dict[str, Any]:
        return self._row(
            connection.execute(
                """
                SELECT
                    count(*) FILTER (WHERE psp_code IS NOT NULL)::BIGINT AS psp_sample_size,
                    count(*) FILTER (WHERE psp_code IS NOT NULL AND switch_response_code IS NOT NULL)::BIGINT AS switch_code_sample_size,
                    count(*) FILTER (WHERE init_time_ms IS NOT NULL)::BIGINT AS init_sample_size,
                    median(init_time_ms) FILTER (WHERE init_time_ms IS NOT NULL)::DOUBLE AS init_median_ms,
                    quantile_cont(init_time_ms, 0.9) FILTER (WHERE init_time_ms IS NOT NULL)::DOUBLE AS init_p90_ms,
                    quantile_cont(init_time_ms, 0.95) FILTER (WHERE init_time_ms IS NOT NULL)::DOUBLE AS init_p95_ms,
                    count(*) FILTER (WHERE verify_time_ms IS NOT NULL)::BIGINT AS verify_sample_size,
                    median(verify_time_ms) FILTER (WHERE verify_time_ms IS NOT NULL)::DOUBLE AS verify_median_ms,
                    quantile_cont(verify_time_ms, 0.9) FILTER (WHERE verify_time_ms IS NOT NULL)::DOUBLE AS verify_p90_ms,
                    quantile_cont(verify_time_ms, 0.95) FILTER (WHERE verify_time_ms IS NOT NULL)::DOUBLE AS verify_p95_ms
                FROM attempt_fact
                WHERE merchant_key = ? AND try_seq > 0
                  AND created_at >= ?::DATE AND created_at < (?::DATE + INTERVAL 1 DAY)
                """,
                [merchant_key, start.isoformat(), end.isoformat()],
            )
        )

    def _peer_stats(
        self,
        connection: duckdb.DuckDBPyConnection,
        merchant_key: str,
        category_id: int,
        start: date,
        end: date,
    ) -> dict[str, Any]:
        row = self._row(
            connection.execute(
                """
                WITH selected AS (
                    SELECT volume_tercile FROM merchant_profile WHERE merchant_key = ?
                ), period_stats AS (
                    SELECT s.merchant_key, count(*)::BIGINT AS sessions,
                           count(*) FILTER (WHERE s.is_verified)::BIGINT AS verified_sessions
                    FROM session_fact s
                    JOIN merchant_profile p USING (merchant_key)
                    WHERE p.category_id = ?
                      AND p.volume_tercile = (SELECT volume_tercile FROM selected)
                      AND s.merchant_key <> ?
                      AND s.created_at >= ?::DATE AND s.created_at < (?::DATE + INTERVAL 1 DAY)
                    GROUP BY s.merchant_key
                    HAVING count(*) >= 100
                )
                SELECT count(*)::INTEGER AS peer_count,
                       median(verified_sessions::DOUBLE / sessions)::DOUBLE AS median_rate,
                       quantile_cont(verified_sessions::DOUBLE / sessions, 0.25)::DOUBLE AS p25_rate,
                       quantile_cont(verified_sessions::DOUBLE / sessions, 0.75)::DOUBLE AS p75_rate
                FROM period_stats
                """,
                [merchant_key, category_id, merchant_key, start.isoformat(), end.isoformat()],
            )
        )
        row["eligible"] = int(row.get("peer_count") or 0) >= 10
        if not row["eligible"]:
            row.update({"median_rate": None, "p25_rate": None, "p75_rate": None})
        row["definition"] = "همان دسته و همان سهک حجم کل؛ میانه با وزن برابر برای هر پذیرنده"
        row["minimum_sample_rule"] = "حداقل ۱۰ همتا و حداقل ۱۰۰ نشست برای هر همتا"
        return row

    def _trend(
        self, connection: duckdb.DuckDBPyConnection, merchant_key: str, start: date, end: date
    ) -> list[dict[str, Any]]:
        return self._rows(
            connection.execute(
                """
                WITH calendar AS (
                    SELECT cast(day AS DATE) AS activity_date
                    FROM generate_series(?::DATE, ?::DATE, INTERVAL '1 day') AS days(day)
                )
                SELECT c.activity_date AS date,
                       coalesce(d.session_count, 0)::BIGINT AS sessions,
                       coalesce(d.verified_session_count, 0)::BIGINT AS verified_sessions,
                       coalesce(d.verified_revenue, 0)::BIGINT AS verified_revenue
                FROM calendar c
                LEFT JOIN merchant_daily d
                  ON d.activity_date = c.activity_date AND d.merchant_key = ?
                ORDER BY c.activity_date
                """,
                [start.isoformat(), end.isoformat(), merchant_key],
            )
        )

    def _amount_bands(
        self, connection: duckdb.DuckDBPyConnection, merchant_key: str, start: date, end: date
    ) -> list[dict[str, Any]]:
        return self._rows(
            connection.execute(
                """
                WITH bands AS (
                    SELECT * FROM (VALUES
                        (1, 'under_1m', 'کمتر از ۱ میلیون', 0::BIGINT, 1000000::BIGINT),
                        (2, '1m_to_5m', '۱ تا ۵ میلیون', 1000000::BIGINT, 5000000::BIGINT),
                        (3, '5m_to_20m', '۵ تا ۲۰ میلیون', 5000000::BIGINT, 20000000::BIGINT),
                        (4, '20m_to_100m', '۲۰ تا ۱۰۰ میلیون', 20000000::BIGINT, 100000000::BIGINT),
                        (5, '100m_plus', '۱۰۰ میلیون و بیشتر', 100000000::BIGINT, NULL::BIGINT)
                    ) AS b(sort_order, band_id, label_fa, min_irr, max_exclusive_irr)
                )
                SELECT b.band_id, b.label_fa, b.min_irr, b.max_exclusive_irr,
                       count(s.session_key)::BIGINT AS sessions,
                       count(s.session_key) FILTER (WHERE s.is_verified)::BIGINT AS verified_sessions,
                       count(s.session_key) FILTER (WHERE s.is_verified)::DOUBLE
                         / nullif(count(s.session_key), 0) AS conversion_rate,
                       coalesce(sum(s.amount) FILTER (WHERE s.is_verified), 0)::BIGINT AS verified_revenue
                FROM bands b
                LEFT JOIN session_fact s
                  ON s.merchant_key = ?
                 AND s.created_at >= ?::DATE AND s.created_at < (?::DATE + INTERVAL 1 DAY)
                 AND s.amount >= b.min_irr
                 AND (b.max_exclusive_irr IS NULL OR s.amount < b.max_exclusive_irr)
                GROUP BY b.sort_order, b.band_id, b.label_fa, b.min_irr, b.max_exclusive_irr
                ORDER BY b.sort_order
                """,
                [merchant_key, start.isoformat(), end.isoformat()],
            )
        )

    def _psp_codes(
        self, connection: duckdb.DuckDBPyConnection, merchant_key: str, start: date, end: date
    ) -> list[dict[str, Any]]:
        return self._rows(
            connection.execute(
                """
                SELECT psp_code, switch_response_code,
                       count(*)::BIGINT AS attempt_count,
                       count(*) FILTER (WHERE session_status = 'Verified')::BIGINT AS associated_verified_attempts
                FROM attempt_fact
                WHERE merchant_key = ? AND try_seq > 0 AND psp_code IS NOT NULL
                  AND switch_response_code IS NOT NULL
                  AND created_at >= ?::DATE AND created_at < (?::DATE + INTERVAL 1 DAY)
                GROUP BY psp_code, switch_response_code
                ORDER BY attempt_count DESC, psp_code, switch_response_code
                LIMIT 8
                """,
                [merchant_key, start.isoformat(), end.isoformat()],
            )
        )

    def _cache_evidence(self, evidence: Iterable[dict[str, Any]]) -> None:
        with self._cache_lock:
            for item in evidence:
                self._evidence_cache[item["insight_id"]] = item

    def dashboard(self, merchant_key: str, start: date, end: date) -> dict[str, Any]:
        self._validate_dates(start, end)
        manifest = self.manifest()
        period_days = (end - start).days + 1
        previous_end = start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=period_days - 1)
        with self._connect() as connection:
            stats = self._session_stats(connection, merchant_key, start, end)
            if int(stats.get("sessions") or 0) == 0:
                merchant_profile = connection.execute(
                    "SELECT category_id, category_title FROM merchant_profile WHERE merchant_key = ?",
                    [merchant_key],
                ).fetchone()
                if not merchant_profile:
                    raise KeyError(merchant_key)
                stats["category_id"], stats["category_title"] = merchant_profile
            previous = self._session_stats(connection, merchant_key, previous_start, previous_end)
            repeat = self._repeat_stats(connection, merchant_key, start, end)
            latency = self._latency_stats(connection, merchant_key, start, end)
            peer = self._peer_stats(
                connection, merchant_key, int(stats.get("category_id") or 0), start, end
            )
            trend = self._trend(connection, merchant_key, start, end)
            amount_bands = self._amount_bands(connection, merchant_key, start, end)
            psp_codes = self._psp_codes(connection, merchant_key, start, end)

        sessions = int(stats.get("sessions") or 0)
        verified = int(stats.get("verified_sessions") or 0)
        revenue = int(stats.get("verified_revenue") or 0)
        conversion = _ratio(verified, sessions)
        previous_revenue = int(previous.get("verified_revenue") or 0)
        previous_sessions = int(previous.get("sessions") or 0)
        previous_verified = int(previous.get("verified_sessions") or 0)
        previous_conversion = _ratio(previous_verified, previous_sessions)
        aov = _ratio(revenue, verified)
        previous_aov = _ratio(previous_revenue, previous_verified)
        repeat_rate = _ratio(int(repeat.get("repeat_cards") or 0), int(repeat.get("observed_cards") or 0))
        paid_rate = _ratio(int(stats.get("paid_not_verified") or 0), sessions)
        retry_sessions = int(stats.get("retry_sessions") or 0)
        rescued_sessions = int(stats.get("rescued_sessions") or 0)
        retry_rate = _ratio(retry_sessions, sessions)
        rescue_rate = _ratio(rescued_sessions, retry_sessions)
        no_attempt_rate = _ratio(int(stats.get("no_attempt") or 0), sessions)
        ci_low, ci_high = wilson_interval(verified, sessions)
        peer_rate = peer.get("median_rate") if peer.get("eligible") else None
        gap = max(float(peer_rate) - float(conversion), 0.0) if peer_rate is not None and conversion is not None else None
        opportunity = round(gap * sessions * aov) if gap is not None and aov is not None else None

        revenue_comparison = {
            "type": "previous_period",
            "value": previous_revenue,
            "absolute_difference": revenue - previous_revenue,
            "relative_difference": _relative_difference(revenue, previous_revenue),
            "definition": f"بازه بلافاصله قبل با طول برابر ({previous_start} تا {previous_end})",
            "weighting": "session-weighted",
        }
        conversion_comparison = {
            "type": "peer_group" if peer_rate is not None else "none",
            "value": peer_rate,
            "absolute_difference": (conversion - peer_rate) if conversion is not None and peer_rate is not None else None,
            "relative_difference": _relative_difference(conversion, peer_rate) if conversion is not None and peer_rate is not None else None,
            "definition": peer["definition"],
            "weighting": "merchant-weighted median",
        }

        lifecycle_counts = [
            ("Created", sessions),
            ("Attempted", int(stats.get("attempted_sessions") or 0)),
            ("InBank", int(stats.get("reached_inbank") or 0)),
            ("Paid", int(stats.get("reached_paid") or 0)),
            ("Verified", verified),
        ]
        psp_attempts = int(latency.get("psp_sample_size") or 0)
        coded_psp_attempts = int(latency.get("switch_code_sample_size") or 0)
        missing_code_attempts = max(psp_attempts - coded_psp_attempts, 0)
        top_psp = psp_codes[0] if psp_codes else None

        revenue_change = _relative_difference(revenue, previous_revenue)
        revenue_comparison_ready = (
            sessions >= 100 and previous_sessions >= 100 and previous_revenue > 0
        )
        revenue_priority = (
            "high"
            if revenue_comparison_ready and revenue_change is not None and revenue_change <= -0.10
            else (
                "medium"
                if revenue_comparison_ready and revenue_change is not None and abs(revenue_change) >= 0.05
                else "low"
            )
        )
        revenue_trigger = (
            f"درآمد {revenue:,} ریال در برابر {previous_revenue:,} ریال؛ "
            f"تغییر {revenue - previous_revenue:+,} ریال ({revenue_change:+.1%}) با "
            f"{sessions:,} و {previous_sessions:,} نشست واجد شرایط."
            if revenue_comparison_ready and revenue_change is not None
            else (
                f"درآمد جاری {revenue:,} ریال از {verified:,} نشست Verified؛ "
                f"مبنای قبل {previous_revenue:,} ریال با {previous_sessions:,} نشست است، "
                "بنابراین آستانه مقایسه عددی برآورده نشده است."
            )
        )
        peer_comparison_ready = bool(peer.get("eligible")) and sessions >= 100 and peer_rate is not None
        conversion_trigger = (
            f"نرخ تکمیل {(conversion or 0):.1%} از {verified:,}/{sessions:,} نشست، در برابر "
            f"میانه {(peer_rate or 0):.1%} میان {int(peer.get('peer_count') or 0)} همتا؛ "
            f"فاصله {((conversion or 0) - (peer_rate or 0)) * 100:+.1f} واحد درصد."
            if peer_comparison_ready
            else (
                f"نرخ تکمیل {(conversion or 0):.1%} از {verified:,}/{sessions:,} نشست؛ "
                f"فقط {int(peer.get('peer_count') or 0)} همتای واجد شرایط موجود است "
                "(حداقل لازم: ۱۰)."
            )
        )
        evidences = [
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="eligible_sessions",
                start=start, end=end, value=sessions, title="حجم نشست‌های پرداخت",
                statement=f"در بازه انتخابی {sessions:,} نشست معتبر ثبت شده است.", sample_size=sessions,
                numerator_value=sessions,
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="verified_sessions",
                start=start, end=end, value=verified, title="پرداخت‌های کامل‌شده",
                statement=f"{verified:,} نشست به وضعیت نهایی Verified رسیده است.", sample_size=sessions,
                numerator_value=verified,
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="verified_revenue",
                start=start, end=end, value=revenue, title="تغییر درآمد تأییدشده",
                statement=(f"درآمد تأییدشده {revenue:,} ریال است؛ تغییر نسبت به بازه قبل "
                           f"{_relative_difference(revenue, previous_revenue):+.1%}." if previous_revenue else
                           f"درآمد تأییدشده {revenue:,} ریال است و مبنای قبلی برای درصد تغییر کافی نیست."),
                sample_size=verified, comparison=revenue_comparison, insight_type="recommendation",
                numerator_value=revenue,
                recommendation={
                    "action": "تجزیه تغییر درآمد به حجم نشست، نرخ تکمیل و میانگین مبلغ را بررسی کنید.",
                    "trigger": revenue_trigger,
                    "expected_mechanism": "تفکیک سه مؤلفه مشخص می‌کند مداخله باید روی جذب، تکمیل یا ارزش سبد متمرکز شود.",
                    "priority": revenue_priority,
                    "confidence": "supported" if revenue_comparison_ready else "exploratory",
                    "measurement_plan": "سه مؤلفه را در بازه هم‌طول بعدی با همین تعریف پایش کنید.",
                },
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="verified_session_rate",
                start=start, end=end, value=conversion, title="نرخ تکمیل پرداخت",
                statement=f"نرخ تکمیل نشست‌ها {(conversion or 0):.1%} است.", sample_size=sessions,
                comparison=conversion_comparison, insight_type="recommendation",
                numerator_value=verified, denominator_value=sessions,
                recommendation={
                    "action": "افت‌های چرخه پرداخت و مسیرهای پرتکرار را پیش از تغییر کمپین بررسی کنید.",
                    "trigger": conversion_trigger,
                    "expected_mechanism": "کاهش افت در مرحله پرتعداد می‌تواند نشست‌های بیشتری را به Verified برساند.",
                    "priority": (
                        "high"
                        if peer_comparison_ready and conversion is not None and peer_rate is not None and conversion <= peer_rate - 0.10
                        else ("medium" if peer_comparison_ready and conversion is not None and peer_rate is not None and conversion < peer_rate else "low")
                    ),
                    "confidence": "supported" if peer_comparison_ready else "exploratory",
                    "measurement_plan": "نرخ تکمیل و فاصله اطمینان ۹۵٪ را هفتگی با حجم کافی مقایسه کنید.",
                },
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="verified_session_aov",
                start=start, end=end, value=aov, title="میانگین مبلغ پرداخت کامل",
                statement=(f"میانگین مبلغ هر نشست Verified برابر {aov:,.0f} ریال است."
                           if aov is not None else "در این بازه نشست Verified برای محاسبه میانگین مبلغ وجود ندارد."),
                sample_size=verified,
                numerator_value=revenue, denominator_value=verified,
                comparison={
                    "type": "previous_period",
                    "value": previous_aov,
                    "absolute_difference": (aov - previous_aov) if aov is not None and previous_aov is not None else None,
                    "relative_difference": _relative_difference(aov, previous_aov) if aov is not None and previous_aov is not None else None,
                    "definition": f"بازه بلافاصله قبل با طول برابر ({previous_start} تا {previous_end})",
                    "weighting": "session-weighted",
                },
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="paid_not_verified_rate",
                start=start, end=end, value=paid_rate, title="پرداخت‌های تأییدنشده",
                statement=f"{int(stats.get('paid_not_verified') or 0):,} نشست ({(paid_rate or 0):.1%}) در Paid متوقف شده‌اند.",
                sample_size=sessions, insight_type="recommendation",
                numerator_value=int(stats.get("paid_not_verified") or 0), denominator_value=sessions,
                recommendation={
                    "action": "لاگ callback و فراخوانی verify را برای نشست‌های Paid بازبینی کنید.",
                    "trigger": f"{int(stats.get('paid_not_verified') or 0):,} نشست با برداشت وجه بدون تأیید نهایی.",
                    "expected_mechanism": "تشخیص وقفه در مسیر بازگشت یا verify می‌تواند مانع باقی‌ماندن نشست پس از برداشت وجه شود.",
                    "priority": "high" if (paid_rate or 0) >= 0.01 else ("medium" if int(stats.get("paid_not_verified") or 0) > 0 else "low"),
                    "confidence": "supported" if sessions >= 100 else "exploratory",
                    "measurement_plan": "تعداد و نرخ Paid را پس از اصلاح با همین جمعیت و بازه مقایسه کنید.",
                },
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="retry_session_rate",
                start=start, end=end, value=retry_rate, title="نشست‌های چندتلاش",
                statement=(
                    f"از {retry_sessions:,} نشست چندتلاش، {rescued_sessions:,} نشست "
                    f"({(rescue_rate or 0):.1%}) در نهایت Verified شده‌اند."
                ),
                sample_size=sessions, insight_type="recommendation",
                numerator_value=retry_sessions, denominator_value=sessions,
                recommendation={
                    "action": "مسیر ادامه پرداخت پس از شکست نخست را حفظ کنید و بازیابی تلاش بعدی را هفتگی پایش کنید.",
                    "trigger": (
                        f"{retry_sessions:,} نشست بیش از یک تلاش داشته‌اند و "
                        f"{rescued_sessions:,} مورد ({(rescue_rate or 0):.1%}) در نهایت Verified شده‌اند."
                    ),
                    "expected_mechanism": "ادامه‌دادن مسیر پرداخت، فرصت رسیدن تلاش بعدی به تأیید نهایی را باز نگه می‌دارد؛ این رابطه مشاهده‌ای است.",
                    "priority": "medium" if rescued_sessions > 0 else "low",
                    "confidence": "supported" if retry_sessions >= 100 else "exploratory",
                    "measurement_plan": "تعداد نشست‌های نجات‌یافته و سهم آن‌ها از نشست‌های چندتلاش را با همین تعریف در بازه بعدی مقایسه کنید.",
                },
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="rescued_sessions",
                start=start, end=end, value=int(stats.get("rescued_sessions") or 0), title="نشست‌های نجات‌یافته",
                statement=f"{int(stats.get('rescued_sessions') or 0):,} نشست چندتلاش در نهایت Verified شده‌اند.", sample_size=int(stats.get("retry_sessions") or 0),
                numerator_value=int(stats.get("rescued_sessions") or 0),
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="observed_repeat_card_rate",
                start=start, end=end, value=repeat_rate, title="رفتار مشاهده‌شده کارت تکراری",
                statement=f"{int(repeat.get('repeat_cards') or 0):,} کارت در همین پذیرنده دست‌کم دو پرداخت Verified داشته است.",
                sample_size=int(repeat.get("observed_cards") or 0),
                numerator_value=int(repeat.get("repeat_cards") or 0), denominator_value=int(repeat.get("observed_cards") or 0),
                extra_limitations=["شناسه کارت فقط در محدوده همین پذیرنده یکتا است و معادل شخص واقعی نیست."],
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="no_attempt_rate",
                start=start, end=end, value=no_attempt_rate, title="نشست‌های بدون تلاش",
                statement=f"{int(stats.get('no_attempt') or 0):,} نشست پیش از ثبت تلاش بانکی متوقف شده‌اند.", sample_size=sessions,
                numerator_value=int(stats.get("no_attempt") or 0), denominator_value=sessions,
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="init_latency_p95_ms",
                start=start, end=end, value=latency.get("init_p95_ms"), title="دم تأخیر API ایجاد پرداخت",
                statement=f"صدک ۹۵ زمان API ایجاد پرداخت {float(latency.get('init_p95_ms') or 0):,.0f} میلی‌ثانیه است.",
                sample_size=int(latency.get("init_sample_size") or 0),
                denominator_value=int(latency.get("init_sample_size") or 0),
                extra_limitations=["این زمان مربوط به API درگاه است و زمان فکر یا تعامل کاربر نیست."],
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="verify_latency_p95_ms",
                start=start, end=end, value=latency.get("verify_p95_ms"), title="دم تأخیر API تأیید",
                statement=f"صدک ۹۵ زمان API تأیید {float(latency.get('verify_p95_ms') or 0):,.0f} میلی‌ثانیه است.",
                sample_size=int(latency.get("verify_sample_size") or 0),
                denominator_value=int(latency.get("verify_sample_size") or 0),
                extra_limitations=["زمان verify فقط برای تلاش‌هایی که به مرحله تأیید رسیده‌اند موجود است."],
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="payment_lifecycle_counts",
                start=start, end=end,
                value="; ".join(f"{stage}={count}" for stage, count in lifecycle_counts),
                title="چرخه پرداخت",
                statement=f"از {sessions:,} نشست ایجادشده، {verified:,} نشست به Verified رسیده است.",
                sample_size=sessions,
                numerator_value=verified, denominator_value=sessions,
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="amount_band_performance",
                start=start, end=end,
                value="; ".join(
                    f"{band['band_id']}={band['verified_sessions']}/{band['sessions']}"
                    for band in amount_bands
                ),
                title="عملکرد بازه‌های مبلغ",
                statement=f"{sessions:,} نشست در پنج بازه ثابت مبلغ IRR طبقه‌بندی شده‌اند.",
                sample_size=sessions,
                numerator_value=verified, denominator_value=sessions,
                extra_limitations=["تفاوت بین بازه‌ها توصیفی است و اثر علّی مبلغ را اثبات نمی‌کند."],
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="psp_code_frequency",
                start=start, end=end,
                value=(
                    f"{top_psp['psp_code']} / {top_psp['switch_response_code']}"
                    if top_psp else None
                ),
                title="کدهای پاسخ در محدوده PSP",
                statement=(
                    f"پرتکرارترین گروه مشاهده‌شده {top_psp['psp_code']} / "
                    f"{top_psp['switch_response_code']} با {top_psp['attempt_count']:,} تلاش است."
                    if top_psp else "در بازه انتخابی تلاش واجد PSP برای رتبه‌بندی وجود ندارد."
                ),
                sample_size=coded_psp_attempts,
                numerator_value=int(top_psp["attempt_count"]) if top_psp else 0,
                denominator_value=coded_psp_attempts,
                extra_limitations=["معنای کدهای پاسخ ارائه نشده و هیچ برچسب معنایی به آن‌ها نسبت داده نمی‌شود."],
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="psp_code_coverage",
                start=start, end=end, value=_ratio(coded_psp_attempts, psp_attempts),
                title="پوشش کد پاسخ PSP",
                statement=(
                    f"از {psp_attempts:,} تلاش دارای PSP، {coded_psp_attempts:,} تلاش کد پاسخ دارند "
                    f"و {missing_code_attempts:,} تلاش بدون کد هستند."
                ),
                sample_size=psp_attempts,
                numerator_value=coded_psp_attempts, denominator_value=psp_attempts,
                extra_limitations=["نبود کد می‌تواند ساختاری باشد و به‌عنوان خطای بانکی تفسیر نمی‌شود."],
            ),
            build_evidence(
                registry=self.registry, merchant_key=merchant_key, metric_id="opportunity_scenario_irr",
                start=start, end=end, value=opportunity, title="سناریوی حسابی فرصت",
                statement=(f"رسیدن حسابی به میانه همتایان با فرض ثبات مبلغ، سناریویی برابر {opportunity:,} ریال می‌سازد."
                           if opportunity is not None else "به‌دلیل ناکافی بودن همتایان واجد شرایط، سناریوی فرصت نمایش داده نمی‌شود."),
                sample_size=sessions, comparison=conversion_comparison,
                numerator_value=opportunity,
                extra_limitations=["این مقدار یک سناریوی حسابی است، نه پیش‌بینی یا اثر علّی تضمین‌شده."],
            ),
        ]
        self._cache_evidence(evidences)
        evidence_by_metric = {item["metric_id"]: item for item in evidences}

        lifecycle_stages = []
        previous_count: int | None = None
        for name, count in lifecycle_counts:
            lifecycle_stages.append(
                {
                    "stage": name,
                    "count": count,
                    "dropoff_from_previous": (
                        _ratio(previous_count - count, previous_count) if previous_count is not None else None
                    ),
                }
            )
            previous_count = count

        metric_ids = [item["metric_id"] for item in evidences]
        return {
            "meta": {
                "merchant_key": merchant_key,
                "date_from": start,
                "date_to": end,
                "timezone": "Asia/Tehran",
                "source_kind": str(manifest.get("source_kind", "unknown")),
                "data_freshness": str(manifest.get("generated_at", "unknown")),
                "partial_data": bool(manifest.get("partial_data", False)),
                "calculation_version": CALCULATION_VERSION,
            },
            "merchant": {
                "merchant_key": merchant_key,
                "category_id": int(stats.get("category_id") or 0),
                "category_title": stats.get("category_title") or "نامشخص",
                "terminal_count": int(stats.get("terminal_count") or 0),
            },
            "kpis": [
                {"metric_id": "verified_revenue", "label": "درآمد تأییدشده", "value": revenue, "unit": "IRR", "comparison": revenue_comparison, "evidence_id": evidence_by_metric["verified_revenue"]["insight_id"]},
                {"metric_id": "verified_session_rate", "label": "نرخ تکمیل", "value": conversion, "unit": "ratio", "confidence_interval_95": {"low": ci_low, "high": ci_high}, "comparison": conversion_comparison, "evidence_id": evidence_by_metric["verified_session_rate"]["insight_id"]},
                {"metric_id": "eligible_sessions", "label": "نشست‌ها", "value": sessions, "unit": "sessions", "evidence_id": evidence_by_metric["eligible_sessions"]["insight_id"]},
                {"metric_id": "observed_repeat_card_rate", "label": "کارت تکراری مشاهده‌شده", "value": repeat_rate, "unit": "ratio", "evidence_id": evidence_by_metric["observed_repeat_card_rate"]["insight_id"]},
            ],
            "lifecycle": {
                "stages": lifecycle_stages,
                "grain": "session",
                "evidence_id": evidence_by_metric["payment_lifecycle_counts"]["insight_id"],
            },
            "trend": trend,
            "amount_bands": [
                {
                    **band,
                    "evidence_id": evidence_by_metric["amount_band_performance"]["insight_id"],
                }
                for band in amount_bands
            ],
            "revenue_decomposition": {
                "current": {"sessions": sessions, "conversion_rate": conversion, "verified_aov": aov, "verified_revenue": revenue},
                "previous": {"sessions": previous_sessions, "conversion_rate": previous_conversion, "verified_aov": previous_aov, "verified_revenue": previous_revenue},
                "note": "اجزای توصیفی هستند و به‌تنهایی علت تغییر را اثبات نمی‌کنند.",
                "evidence_ids": {
                    "sessions": evidence_by_metric["eligible_sessions"]["insight_id"],
                    "conversion_rate": evidence_by_metric["verified_session_rate"]["insight_id"],
                    "verified_aov": evidence_by_metric["verified_session_aov"]["insight_id"],
                    "verified_revenue": evidence_by_metric["verified_revenue"]["insight_id"],
                },
            },
            "retry": {"retry_sessions": int(stats.get("retry_sessions") or 0), "retry_rate": retry_rate, "rescued_sessions": int(stats.get("rescued_sessions") or 0), "evidence_id": evidence_by_metric["retry_session_rate"]["insight_id"], "rescued_evidence_id": evidence_by_metric["rescued_sessions"]["insight_id"]},
            "repeat": {"observed_cards": int(repeat.get("observed_cards") or 0), "repeat_cards": int(repeat.get("repeat_cards") or 0), "observed_repeat_rate": repeat_rate, "scope": "(merchant_key, payer_card_key)", "evidence_id": evidence_by_metric["observed_repeat_card_rate"]["insight_id"]},
            "paid_not_verified": {"sessions": int(stats.get("paid_not_verified") or 0), "rate": paid_rate, "evidence_id": evidence_by_metric["paid_not_verified_rate"]["insight_id"]},
            "latency": {**latency, "definition": "مدت فراخوانی API درگاه؛ نه زمان تعامل کاربر", "evidence_id": evidence_by_metric["init_latency_p95_ms"]["insight_id"], "verify_evidence_id": evidence_by_metric["verify_latency_p95_ms"]["insight_id"]},
            "psp_codes": [
                {**item, "evidence_id": evidence_by_metric["psp_code_frequency"]["insight_id"]}
                for item in psp_codes
            ],
            "psp_code_coverage": {
                "eligible_psp_attempts": psp_attempts,
                "coded_attempts": coded_psp_attempts,
                "missing_code_attempts": missing_code_attempts,
                "coverage_rate": _ratio(coded_psp_attempts, psp_attempts),
                "evidence_id": evidence_by_metric["psp_code_coverage"]["insight_id"],
            },
            "peer": {**peer, "merchant_rate": conversion, "gap_percentage_points": ((float(conversion) - float(peer_rate)) * 100 if conversion is not None and peer_rate is not None else None)},
            "opportunity": {"value": opportunity, "unit": "IRR scenario", "is_forecast": False, "formula": self.registry.get("opportunity_scenario_irr")["formula"], "evidence_id": evidence_by_metric["opportunity_scenario_irr"]["insight_id"]},
            "insights": [
                {"insight_id": evidence_by_metric[metric_id]["insight_id"], "metric_id": metric_id, "title": evidence_by_metric[metric_id]["title"], "statement": evidence_by_metric[metric_id]["statement"], "recommendation": evidence_by_metric[metric_id].get("recommendation")}
                for metric_id in ("paid_not_verified_rate", "retry_session_rate", "verified_session_rate")
            ],
            "metric_registry": self.registry.subset(metric_ids),
            "adjusted_fee_notice": ADJUSTED_FEE_NOTICE,
        }

    def evidence(self, insight_id: str) -> dict[str, Any]:
        with self._cache_lock:
            cached = self._evidence_cache.get(insight_id)
        if cached is not None:
            return cached
        reference = parse_insight_id(insight_id)
        self.dashboard(reference.merchant_key, reference.start, reference.end)
        with self._cache_lock:
            try:
                return self._evidence_cache[insight_id]
            except KeyError as exc:
                raise KeyError(insight_id) from exc

    def records(self, insight_id: str, page: int, page_size: int) -> dict[str, Any]:
        reference = parse_insight_id(insight_id)
        self.registry.get(reference.metric_id)
        offset = (page - 1) * page_size
        if reference.metric_id in {"init_latency_p95_ms", "verify_latency_p95_ms", "psp_code_frequency", "psp_code_coverage"}:
            extra = (
                "AND init_time_ms IS NOT NULL"
                if reference.metric_id == "init_latency_p95_ms"
                else (
                    "AND verify_time_ms IS NOT NULL"
                    if reference.metric_id == "verify_latency_p95_ms"
                    else (
                        "AND psp_code IS NOT NULL AND switch_response_code IS NOT NULL"
                        if reference.metric_id == "psp_code_frequency"
                        else "AND psp_code IS NOT NULL"
                    )
                )
            )
            parameters = [reference.merchant_key, reference.start.isoformat(), reference.end.isoformat()]
            with self._connect() as connection:
                total = int(
                    connection.execute(
                        f"""SELECT count(*) FROM attempt_fact
                            WHERE merchant_key = ? AND try_seq > 0
                              AND created_at >= ?::DATE
                              AND created_at < (?::DATE + INTERVAL 1 DAY) {extra}""",
                        parameters,
                    ).fetchone()[0]
                )
                rows = self._rows(
                    connection.execute(
                        f"""
                        SELECT session_key, try_seq, try_created_at, try_status,
                               psp_code, switch_response_code, init_time_ms, verify_time_ms
                        FROM attempt_fact
                        WHERE merchant_key = ? AND try_seq > 0
                          AND created_at >= ?::DATE
                          AND created_at < (?::DATE + INTERVAL 1 DAY) {extra}
                        ORDER BY created_at DESC, session_key, try_seq
                        LIMIT ? OFFSET ?
                        """,
                        parameters + [page_size, offset],
                    )
                )
            return {
                "insight_id": insight_id,
                "merchant_key": reference.merchant_key,
                "page": page,
                "page_size": page_size,
                "total": total,
                "items": rows,
                "columns": ["session_key", "try_seq", "try_created_at", "try_status", "psp_code", "switch_response_code", "init_time_ms", "verify_time_ms"],
                "grain": "attempt",
                "limitations": [
                    "رکوردهای try_seq=0 از مخرج تلاش‌ها حذف شده‌اند.",
                    "معنای کد پاسخ بدون کدبوک معتبر تفسیر نمی‌شود.",
                ],
            }
        where_extra = {
            "verified_revenue": "AND is_verified",
            "verified_sessions": "AND is_verified",
            "verified_session_aov": "AND is_verified",
            "paid_not_verified_rate": "AND is_paid_not_verified",
            "rescued_sessions": "AND attempt_count > 1 AND is_verified",
            "observed_repeat_card_rate": "AND is_verified AND payer_card_key IS NOT NULL",
            "no_attempt_rate": "AND attempt_count = 0",
        }.get(reference.metric_id, "")
        parameters = [reference.merchant_key, reference.start.isoformat(), reference.end.isoformat()]
        with self._connect() as connection:
            total = int(
                connection.execute(
                    f"""SELECT count(*) FROM session_fact
                        WHERE merchant_key = ? AND created_at >= ?::DATE
                          AND created_at < (?::DATE + INTERVAL 1 DAY) {where_extra}""",
                    parameters,
                ).fetchone()[0]
            )
            rows = self._rows(
                connection.execute(
                    f"""
                    SELECT session_key, created_at, session_status, amount, attempt_count,
                           final_try_status, psp_path, payer_card_key
                    FROM session_fact
                    WHERE merchant_key = ? AND created_at >= ?::DATE
                      AND created_at < (?::DATE + INTERVAL 1 DAY) {where_extra}
                    ORDER BY created_at DESC, session_key
                    LIMIT ? OFFSET ?
                    """,
                    parameters + [page_size, offset],
                )
            )
        return {
            "insight_id": insight_id,
            "merchant_key": reference.merchant_key,
            "page": page,
            "page_size": page_size,
            "total": total,
            "items": rows,
            "columns": ["session_key", "created_at", "session_status", "amount", "attempt_count", "final_try_status", "psp_path", "payer_card_key"],
            "grain": "session",
            "limitations": [
                "فقط رکوردهای همان پذیرنده انتخاب‌شده نمایش داده می‌شوند.",
                "شناسه‌ها مستعار هستند و هویت واقعی را نشان نمی‌دهند.",
            ],
        }
