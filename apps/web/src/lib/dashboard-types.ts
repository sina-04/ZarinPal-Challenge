export type Comparison = {
  type?: string;
  absolute_change?: number | null;
  relative_change?: number | null;
  percentage_point_change?: number | null;
  definition?: string | null;
};

export type DashboardKpi = {
  metric_id: string;
  label: string;
  value: number | null;
  unit: "IRR" | "ratio" | "sessions" | string;
  comparison?: Comparison;
  confidence_interval_95?: { low: number; high: number };
  evidence_id: string;
};

export type LifecycleStage = {
  stage: "Created" | "Attempted" | "InBank" | "Paid" | "Verified";
  count: number;
  dropoff_from_previous: number | null;
};

export type Insight = {
  insight_id: string;
  metric_id: string;
  title: string;
  statement: string;
  recommendation?: string | null;
  trigger?: string | null;
  expected_mechanism?: string | null;
  measurement_plan?: string | null;
  confidence?: string | null;
  priority?: string | null;
};

export type AmountBandRow = {
  band_id: string;
  label_fa: string;
  min_irr: number;
  max_exclusive_irr: number | null;
  sessions: number;
  verified_sessions: number;
  conversion_rate: number | null;
  verified_revenue: number;
  evidence_id: string;
};

export type DashboardData = {
  meta: {
    merchant_key: string;
    date_from: string;
    date_to: string;
    timezone: string;
    source_kind: string;
    data_freshness: string;
    partial_data: boolean;
    calculation_version: string;
  };
  merchant: {
    merchant_key: string;
    category_id: number;
    category_title: string;
    terminal_count: number;
  };
  kpis: DashboardKpi[];
  lifecycle: { stages: LifecycleStage[]; grain: string; evidence_id: string };
  trend: Array<{ date: string; sessions: number; verified_sessions: number; verified_revenue: number; conversion_rate: number }>;
  amount_bands: AmountBandRow[];
  revenue_decomposition: {
    current: { sessions: number; conversion_rate: number | null; verified_aov: number | null; verified_revenue: number };
    previous: { sessions: number; conversion_rate: number | null; verified_aov: number | null; verified_revenue: number };
    note: string;
    evidence_ids?: Record<string, string>;
  };
  retry: { retry_sessions: number; retry_rate: number | null; rescued_sessions: number; evidence_id: string; rescued_evidence_id?: string };
  repeat: { observed_cards: number; repeat_cards: number; observed_repeat_rate: number | null; scope: string; evidence_id: string };
  paid_not_verified: { sessions: number; rate: number | null; evidence_id: string };
  latency: { p50_ms?: number | null; p90_ms?: number | null; p95_ms?: number | null; definition: string; evidence_id: string; [key: string]: unknown };
  psp_codes: Array<{ psp_code: string; response_code: string; attempts: number; associated_verified_attempts?: number; evidence_id?: string; share?: number }>;
  psp_code_coverage: {
    eligible_psp_attempts: number;
    coded_attempts: number;
    missing_code_attempts: number;
    coverage_rate: number | null;
    evidence_id: string;
  };
  peer: { eligible?: boolean; peer_count?: number; peer_median_rate?: number | null; merchant_rate?: number | null; gap_percentage_points?: number | null; p25_rate?: number | null; p75_rate?: number | null; [key: string]: unknown };
  opportunity: { value: number | null; unit: string; is_forecast: false; formula: string; evidence_id: string };
  insights: Insight[];
  metric_registry: Array<{ metric_id: string; label?: string; formula?: string; grain?: string; caveats?: string[]; [key: string]: unknown }>;
  adjusted_fee_notice: string;
};

export type EvidenceRecord = {
  session_key?: string;
  attempt_key?: string;
  created_at?: string;
  try_created_at?: string | null;
  session_status?: string;
  try_status?: string;
  switch_response_code?: string | number | null;
  amount?: number;
  attempt_count?: number;
  try_seq?: number;
  final_try_status?: string | null;
  psp_path?: string | null;
  psp_code?: string | null;
  payer_card_key?: string | null;
  init_time_ms?: number | null;
  verify_time_ms?: number | null;
  [key: string]: unknown;
};
