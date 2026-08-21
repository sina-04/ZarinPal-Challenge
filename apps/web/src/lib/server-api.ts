import "server-only";

import type { components } from "@/lib/api.generated";
import type { DashboardData } from "@/lib/dashboard-types";
import {
  areDefaultFilters,
  DEFAULT_DASHBOARD_FILTERS,
  type DashboardFilters,
} from "@/lib/dashboard-filters";
import { MOCK_DASHBOARD } from "@/lib/mock-dashboard";

export const getApiBaseUrl = () =>
  process.env.API_BASE_URL ??
  (process.env.API_HOSTPORT
    ? `http://${process.env.API_HOSTPORT}`
    : "http://127.0.0.1:8000");

export const internalHeaders = () => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.INTERNAL_API_KEY) {
    headers["X-Internal-API-Key"] = process.env.INTERNAL_API_KEY;
  }
  return headers;
};

type JsonRecord = Record<string, unknown>;
type ApiDashboardResponse = components["schemas"]["DashboardResponse"];

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? (value as JsonRecord) : {};

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asNullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function normalizeDashboard(raw: unknown): DashboardData {
  const source = asRecord(raw);
  const kpis = Array.isArray(source.kpis)
    ? source.kpis.map((item) => {
        const kpi = asRecord(item);
        const comparison = asRecord(kpi.comparison);
        const absoluteDifference = asNullableNumber(comparison.absolute_difference);
        return {
          ...kpi,
          value: asNullableNumber(kpi.value),
          comparison:
            Object.keys(comparison).length === 0
              ? undefined
              : {
                  type: String(comparison.type ?? "none"),
                  absolute_change: absoluteDifference,
                  relative_change: asNullableNumber(comparison.relative_difference),
                  percentage_point_change:
                    absoluteDifference == null ? null : absoluteDifference * 100,
                  definition:
                    typeof comparison.definition === "string"
                      ? comparison.definition
                      : null,
                },
        };
      })
    : [];

  const latency = asRecord(source.latency);
  const peer = asRecord(source.peer);
  const lifecycle = asRecord(source.lifecycle);
  const coverage = asRecord(source.psp_code_coverage);
  const pspCodes = Array.isArray(source.psp_codes)
    ? source.psp_codes.map((item) => {
        const row = asRecord(item);
        return {
          psp_code: String(row.psp_code ?? "نامشخص"),
          response_code: String(
            row.response_code ?? row.switch_response_code ?? "ثبت‌نشده",
          ),
          attempts: asNumber(row.attempts ?? row.attempt_count),
          associated_verified_attempts: asNumber(row.associated_verified_attempts),
          evidence_id:
            typeof row.evidence_id === "string" ? row.evidence_id : undefined,
        };
      })
    : [];

  const insights = Array.isArray(source.insights)
    ? source.insights.map((item) => {
        const row = asRecord(item);
        const recommendation = asRecord(row.recommendation);
        return {
          insight_id: String(row.insight_id ?? ""),
          metric_id: String(row.metric_id ?? ""),
          title: String(row.title ?? "بینش تحلیلی"),
          statement: String(row.statement ?? ""),
          recommendation:
            typeof row.recommendation === "string"
              ? row.recommendation
              : typeof recommendation.action === "string"
                ? recommendation.action
                : null,
          trigger:
            typeof recommendation.trigger === "string"
              ? recommendation.trigger
              : null,
          expected_mechanism:
            typeof recommendation.expected_mechanism === "string"
              ? recommendation.expected_mechanism
              : null,
          measurement_plan:
            typeof recommendation.measurement_plan === "string"
              ? recommendation.measurement_plan
              : null,
          confidence:
            typeof recommendation.confidence === "string"
              ? recommendation.confidence
              : null,
          priority:
            typeof recommendation.priority === "string"
              ? recommendation.priority
              : null,
        };
      })
    : [];

  const trend = Array.isArray(source.trend)
    ? source.trend.map((item) => {
        const row = asRecord(item);
        const sessions = asNumber(row.sessions);
        const verified = asNumber(row.verified_sessions);
        return {
          date: String(row.date ?? ""),
          sessions,
          verified_sessions: verified,
          verified_revenue: asNumber(row.verified_revenue),
          conversion_rate: sessions > 0 ? verified / sessions : 0,
        };
      })
    : [];

  const amountBands = Array.isArray(source.amount_bands)
    ? source.amount_bands.map((item) => {
        const row = asRecord(item);
        return {
          band_id: String(row.band_id ?? ""),
          label_fa: String(row.label_fa ?? "بازه مبلغ"),
          min_irr: asNumber(row.min_irr),
          max_exclusive_irr: asNullableNumber(row.max_exclusive_irr),
          sessions: asNumber(row.sessions),
          verified_sessions: asNumber(row.verified_sessions),
          conversion_rate: asNullableNumber(row.conversion_rate),
          verified_revenue: asNumber(row.verified_revenue),
          evidence_id: String(row.evidence_id ?? ""),
        };
      })
    : [];

  return {
    ...(source as unknown as DashboardData),
    amount_bands: amountBands,
    insights,
    kpis: kpis as DashboardData["kpis"],
    lifecycle: {
      ...(lifecycle as unknown as DashboardData["lifecycle"]),
      evidence_id: String(lifecycle.evidence_id ?? ""),
    },
    latency: {
      ...latency,
      p50_ms: asNullableNumber(latency.p50_ms ?? latency.init_median_ms),
      p90_ms: asNullableNumber(latency.p90_ms ?? latency.init_p90_ms),
      p95_ms: asNullableNumber(latency.p95_ms ?? latency.init_p95_ms),
      definition: String(
        latency.definition ?? "مدت فراخوانی API درگاه؛ نه زمان تعامل کاربر",
      ),
      evidence_id: String(latency.evidence_id ?? ""),
    },
    peer: {
      ...peer,
      eligible: Boolean(peer.eligible),
      peer_count: asNumber(peer.peer_count),
      peer_median_rate: asNullableNumber(
        peer.peer_median_rate ?? peer.median_rate,
      ),
      merchant_rate: asNullableNumber(peer.merchant_rate),
      gap_percentage_points: asNullableNumber(peer.gap_percentage_points),
      p25_rate: asNullableNumber(peer.p25_rate),
      p75_rate: asNullableNumber(peer.p75_rate),
    },
    psp_codes: pspCodes,
    psp_code_coverage: {
      eligible_psp_attempts: asNumber(coverage.eligible_psp_attempts),
      coded_attempts: asNumber(coverage.coded_attempts),
      missing_code_attempts: asNumber(coverage.missing_code_attempts),
      coverage_rate: asNullableNumber(coverage.coverage_rate),
      evidence_id: String(coverage.evidence_id ?? ""),
    },
    trend,
  };
}

export async function getDashboard(
  filters: DashboardFilters = DEFAULT_DASHBOARD_FILTERS,
): Promise<DashboardData> {
  try {
    const query = new URLSearchParams(filters);
    const response = await fetch(`${getApiBaseUrl()}/api/v1/dashboard?${query}`, {
      cache: "no-store",
      headers: internalHeaders(),
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = (await response.json()) as ApiDashboardResponse;
    return normalizeDashboard(payload);
  } catch (error) {
    if (areDefaultFilters(filters)) return MOCK_DASHBOARD;
    throw new Error("Analytical API is unavailable for the selected filters.", {
      cause: error,
    });
  }
}
