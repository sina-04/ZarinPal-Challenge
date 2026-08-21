from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(StrictModel):
    status: Literal["ok", "degraded"]
    database_ready: bool
    source_kind: str | None = None
    source_sha256: str | None = None
    checksum_status: str | None = None
    build_id: str | None = None
    auth_configured: bool


class MerchantItem(StrictModel):
    merchant_key: str
    category_id: int
    category_title: str
    terminal_count: int
    session_count: int
    verified_session_count: int
    verified_session_rate: float
    verified_revenue: int
    data_start: date
    data_end: date
    is_featured_demo: bool = False


class MerchantListResponse(StrictModel):
    items: list[MerchantItem]
    total: int
    adjusted_fee_notice: str


class DashboardMeta(StrictModel):
    merchant_key: str
    date_from: date
    date_to: date
    timezone: Literal["Asia/Tehran"]
    source_kind: str
    data_freshness: str
    partial_data: bool
    calculation_version: str


class DashboardMerchant(StrictModel):
    merchant_key: str
    category_id: int
    category_title: str
    terminal_count: int


class Comparison(StrictModel):
    type: Literal["none", "previous_period", "previous_year", "peer_group", "target", "baseline"]
    value: int | float | str | None = None
    absolute_difference: int | float | None = None
    relative_difference: float | None = None
    definition: str | None = None
    weighting: str | None = None


class ConfidenceInterval(StrictModel):
    low: float | None
    high: float | None


class DashboardKpi(StrictModel):
    metric_id: str
    label: str
    value: int | float | None
    unit: str
    evidence_id: str
    comparison: Comparison | None = None
    confidence_interval_95: ConfidenceInterval | None = None


class LifecycleStage(StrictModel):
    stage: Literal["Created", "Attempted", "InBank", "Paid", "Verified"]
    count: int
    dropoff_from_previous: float | None


class LifecycleSection(StrictModel):
    stages: list[LifecycleStage]
    grain: Literal["session"]
    evidence_id: str


class TrendPoint(StrictModel):
    date: date
    sessions: int
    verified_sessions: int
    verified_revenue: int


class AmountBandRow(StrictModel):
    band_id: str
    label_fa: str
    min_irr: int
    max_exclusive_irr: int | None
    sessions: int
    verified_sessions: int
    conversion_rate: float | None
    verified_revenue: int
    evidence_id: str


class DecompositionPeriod(StrictModel):
    sessions: int
    conversion_rate: float | None
    verified_aov: float | None
    verified_revenue: int


class DecompositionEvidenceIds(StrictModel):
    sessions: str
    conversion_rate: str
    verified_aov: str
    verified_revenue: str


class RevenueDecomposition(StrictModel):
    current: DecompositionPeriod
    previous: DecompositionPeriod
    note: str
    evidence_ids: DecompositionEvidenceIds


class RetrySection(StrictModel):
    retry_sessions: int
    retry_rate: float | None
    rescued_sessions: int
    evidence_id: str
    rescued_evidence_id: str


class RepeatSection(StrictModel):
    observed_cards: int
    repeat_cards: int
    observed_repeat_rate: float | None
    scope: str
    evidence_id: str


class PaidNotVerifiedSection(StrictModel):
    sessions: int
    rate: float | None
    evidence_id: str


class LatencySection(StrictModel):
    psp_sample_size: int
    switch_code_sample_size: int
    init_sample_size: int
    init_median_ms: float | None
    init_p90_ms: float | None
    init_p95_ms: float | None
    verify_sample_size: int
    verify_median_ms: float | None
    verify_p90_ms: float | None
    verify_p95_ms: float | None
    definition: str
    evidence_id: str
    verify_evidence_id: str


class PspCodeRow(StrictModel):
    psp_code: str
    switch_response_code: str
    attempt_count: int
    associated_verified_attempts: int
    evidence_id: str


class PspCodeCoverage(StrictModel):
    eligible_psp_attempts: int
    coded_attempts: int
    missing_code_attempts: int
    coverage_rate: float | None
    evidence_id: str


class PeerSection(StrictModel):
    peer_count: int
    median_rate: float | None
    p25_rate: float | None
    p75_rate: float | None
    eligible: bool
    definition: str
    minimum_sample_rule: str
    merchant_rate: float | None
    gap_percentage_points: float | None


class OpportunitySection(StrictModel):
    value: int | None
    unit: str
    is_forecast: Literal[False]
    formula: str
    evidence_id: str


class Recommendation(StrictModel):
    action: str
    trigger: str
    expected_mechanism: str
    priority: Literal["low", "medium", "high"]
    confidence: Literal["exploratory", "supported", "strong"]
    measurement_plan: str


class DashboardInsight(StrictModel):
    insight_id: str
    metric_id: str
    title: str
    statement: str
    recommendation: Recommendation | None = None


class RagThresholds(StrictModel):
    warning: str | int | float | None
    critical: str | int | float | None


class MetricRegistryItem(StrictModel):
    metric_id: str
    name_fa: str
    description_fa: str
    business_question: str
    decision: str
    grain: Literal["attempt", "session", "customer_within_merchant", "terminal", "merchant", "category", "time_period"]
    formula: str
    numerator: str
    denominator: str | None
    source_columns: list[str]
    filters: list[str]
    exclusions: list[str]
    null_policy: str
    unit: str
    currency: str | None
    weighting: str
    minimum_sample_rule: str
    owner: str
    version: str
    rag_thresholds: RagThresholds
    tests: list[str]


class DashboardResponse(StrictModel):
    meta: DashboardMeta
    merchant: DashboardMerchant
    kpis: list[DashboardKpi]
    lifecycle: LifecycleSection
    trend: list[TrendPoint]
    amount_bands: list[AmountBandRow]
    revenue_decomposition: RevenueDecomposition
    retry: RetrySection
    repeat: RepeatSection
    paid_not_verified: PaidNotVerifiedSection
    latency: LatencySection
    psp_codes: list[PspCodeRow]
    psp_code_coverage: PspCodeCoverage
    peer: PeerSection
    opportunity: OpportunitySection
    insights: list[DashboardInsight]
    metric_registry: list[MetricRegistryItem]
    adjusted_fee_notice: str


class EvidenceDateRange(StrictModel):
    start: str
    end: str


class EvidenceFilters(StrictModel):
    merchant_key: str
    created_at_from: str
    created_at_to: str
    metric_rules: list[str]


class CalculationInputs(StrictModel):
    numerator_definition: str | None
    numerator_value: int | float | None
    denominator_definition: str | None
    denominator_value: int | float | None


class EvidenceReproduction(StrictModel):
    method: Literal["query_registry", "materialized_aggregate", "analytical_function"]
    reference: str
    parameters_hash: str
    git_revision: str | None = None


class InsightEvidence(StrictModel):
    schema_version: Literal["1.0"]
    insight_id: str
    metric_id: str
    title: str
    statement: str
    insight_type: Literal["descriptive", "diagnostic", "inferential", "predictive", "recommendation", "alert"]
    value: int | float | str | None
    unit: str
    grain: Literal["attempt", "session", "customer_within_merchant", "terminal", "merchant", "category", "time_period"]
    population: str
    formula: str
    source_columns: list[str]
    filters: EvidenceFilters
    exclusions: list[str]
    null_policy: str
    date_range: EvidenceDateRange
    timezone: Literal["Asia/Tehran"]
    sample_size: int = Field(ge=0)
    comparison: Comparison
    calculation_inputs: CalculationInputs
    weighting: str
    minimum_sample_rule: str
    calculation_version: str
    reproduction: EvidenceReproduction
    limitations: list[str]
    recommendation: Recommendation | None = None
    model_evidence: dict[str, Any] | None = None
    generated_at: str


class EvidenceResponse(StrictModel):
    evidence: InsightEvidence


class SessionEvidenceRecord(StrictModel):
    session_key: str
    created_at: datetime
    session_status: str
    amount: int
    attempt_count: int
    final_try_status: str | None
    psp_path: str | None
    payer_card_key: str | None


class AttemptEvidenceRecord(StrictModel):
    session_key: str
    try_seq: int
    try_created_at: datetime | None
    try_status: str
    psp_code: str | None
    switch_response_code: str | None
    init_time_ms: int | None
    verify_time_ms: int | None


class EvidenceRecordsResponse(StrictModel):
    insight_id: str
    merchant_key: str
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    items: list[SessionEvidenceRecord | AttemptEvidenceRecord]
    columns: list[str]
    grain: Literal["session", "attempt", "customer_within_merchant"]
    limitations: list[str]
