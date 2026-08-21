"use client";

import { useEffect, useMemo, useState } from "react";
import { CalculatorIcon, DatabaseIcon, ExternalLinkIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { EvidenceRecord } from "@/lib/dashboard-types";
import { formatInteger, formatIrr } from "@/lib/format";
import { MOCK_EVIDENCE_RECORDS } from "@/lib/mock-dashboard";
import { useHydrated } from "@/hooks/use-hydrated";

type Evidence = {
  title?: string;
  value?: number | string | null;
  formula?: string;
  sample_size?: number | null;
  grain?: string;
  timezone?: string;
  calculation_version?: string;
  filters?: {
    merchant_key?: string;
    created_at_from?: string;
    created_at_to?: string;
    metric_rules?: string[];
  };
  calculation_inputs?: {
    numerator_definition?: string | null;
    numerator_value?: number | null;
    denominator_definition?: string | null;
    denominator_value?: number | null;
  };
  reproduction?: { reference?: string };
  limitations?: string[];
};

type EvidenceMode = "api" | "offline" | "empty" | "partial" | "unavailable";
type LoadedEvidence = {
  insightId: string;
  evidence: Evidence;
  records: EvidenceRecord[];
  mode: EvidenceMode;
  evidenceFromApi: boolean;
  recordsFromApi: boolean;
  page: number;
  pageSize: number;
  total: number;
};

const formulas: Record<string, string> = {
  verified_revenue: "SUM(amount) once per final Verified session",
  verified_sessions: "COUNT(session_key WHERE final status = Verified)",
  verified_session_rate: "Verified sessions ÷ eligible sessions",
  eligible_sessions: "COUNT(DISTINCT session_key)",
  retry_session_rate: "sessions with attempt_count > 1 ÷ eligible sessions",
  rescued_sessions: "retry sessions whose final status is Verified",
  paid_not_verified_rate: "Paid-not-Verified sessions ÷ eligible sessions",
  observed_repeat_card_rate:
    "cards with ≥2 Verified sessions ÷ cards with ≥1 Verified session, within merchant",
  init_latency_p95_ms: "PERCENTILE_CONT(0.95) of eligible gateway init latency",
  payment_lifecycle_counts: "COUNT(DISTINCT session_key) at each observed lifecycle stage",
  psp_code_frequency: "COUNT(attempts) grouped by (psp_code, switch_response_code)",
  psp_code_coverage: "coded eligible PSP attempts ÷ eligible PSP attempts",
  amount_band_performance: "Verified sessions ÷ sessions within each fixed IRR amount band",
  opportunity_scenario_irr:
    "max(0, peer median conversion − merchant conversion) × eligible sessions × merchant AOV",
};

const sampleSizes: Record<string, number> = {
  verified_revenue: 20_340,
  verified_sessions: 20_340,
  verified_session_rate: 29_483,
  eligible_sessions: 29_483,
  retry_session_rate: 29_483,
  rescued_sessions: 7_922,
  paid_not_verified_rate: 29_483,
  observed_repeat_card_rate: 9_745,
  init_latency_p95_ms: 26_739,
  payment_lifecycle_counts: 29_483,
  psp_code_frequency: 533,
  psp_code_coverage: 34_406,
  amount_band_performance: 29_483,
  opportunity_scenario_irr: 29_483,
};

const metricGrains: Record<string, string> = {
  init_latency_p95_ms: "attempt",
  observed_repeat_card_rate: "customer_within_merchant",
  opportunity_scenario_irr: "merchant",
  psp_code_coverage: "attempt",
  psp_code_frequency: "attempt",
  verify_latency_p95_ms: "attempt",
};

const parseInsightContext = (insightId: string) => {
  const match = /^merchant-(.+?)--[^-].*--(\d{4}-\d{2}-\d{2})--(\d{4}-\d{2}-\d{2})$/.exec(
    insightId,
  );
  const merchantKey = match?.[1] ?? "نامشخص";
  const from = match?.[2] ?? "نامشخص";
  const to = match?.[3] ?? "نامشخص";
  return {
    merchantKey,
    from,
    to,
    isM43Snapshot:
      merchantKey === "M43" && from === "2026-01-01" && to === "2026-02-28",
  };
};

const recordsForMetric = (
  metricId: string,
  isM43Snapshot: boolean,
): EvidenceRecord[] => {
  if (!isM43Snapshot) return [];
  if (metricId === "verified_revenue" || metricId === "verified_sessions") {
    return MOCK_EVIDENCE_RECORDS.filter((record) => record.session_status === "Verified");
  }
  if (
    metricId === "verified_session_rate" ||
    metricId === "eligible_sessions" ||
    metricId === "payment_lifecycle_counts"
  ) {
    return MOCK_EVIDENCE_RECORDS;
  }
  if (metricId === "observed_repeat_card_rate") {
    return MOCK_EVIDENCE_RECORDS.filter(
      (record) => record.session_status === "Verified" && record.payer_card_key,
    );
  }
  return [];
};

const offlineEvidence = (metricId: string, insightId: string): Evidence => {
  const context = parseInsightContext(insightId);
  return {
  formula: formulas[metricId],
  sample_size: context.isM43Snapshot ? sampleSizes[metricId] : undefined,
  grain: metricGrains[metricId] ?? "session",
  timezone: "Asia/Tehran",
  calculation_version: "offline-snapshot@1",
  filters: {
    merchant_key: context.merchantKey,
    created_at_from: context.from,
    created_at_to: context.to,
  },
  reproduction: {
    reference: context.isM43Snapshot
      ? `deterministic_offline_snapshot → metric-registry.json → ${metricId}`
      : `metric-registry.json → ${metricId}`,
  },
  limitations: [
    "حالت آفلاین فقط از تجمیع‌های معتبر و ردیف‌های نمونه واقعی منبع تعمیرشده استفاده می‌کند.",
    "روابط مشاهده‌ای علّی نیستند و سناریوی حسابی پیش‌بینی محسوب نمی‌شود.",
  ],
  };
};

export function EvidenceSheet({
  insightId,
  metricId,
  value,
}: {
  insightId: string;
  metricId: string;
  value: string;
}) {
  const context = useMemo(() => parseInsightContext(insightId), [insightId]);
  const hydrated = useHydrated();
  const initialEvidence = useMemo(
    () => offlineEvidence(metricId, insightId),
    [insightId, metricId],
  );
  const initialRecords = useMemo(
    () => recordsForMetric(metricId, context.isM43Snapshot),
    [context.isM43Snapshot, metricId],
  );
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<LoadedEvidence | null>(null);
  const [pageState, setPageState] = useState({ insightId, page: 1 });
  const recordPage = pageState.insightId === insightId ? pageState.page : 1;
  const isCurrent = loaded?.insightId === insightId;
  const evidence = isCurrent ? loaded.evidence : initialEvidence;
  const records = isCurrent ? loaded.records : initialRecords;
  const mode = isCurrent
    ? loaded.mode
    : context.isM43Snapshot
      ? "offline"
      : "unavailable";
  const evidenceFromApi = isCurrent ? loaded.evidenceFromApi : false;
  const recordsFromApi = isCurrent ? loaded.recordsFromApi : false;
  const pagePending = Boolean(isCurrent && loaded.page !== recordPage);
  const totalPages = isCurrent
    ? Math.max(1, Math.ceil(loaded.total / loaded.pageSize))
    : 1;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const encoded = encodeURIComponent(insightId);
        const [evidenceResponse, recordsResponse] = await Promise.all([
          fetch(`/api/v1/insights/${encoded}/evidence`, { signal: controller.signal }),
          fetch(`/api/v1/insights/${encoded}/records?page=${recordPage}&page_size=10`, {
            signal: controller.signal,
          }),
        ]);

        let nextEvidence = initialEvidence;
        let nextRecords = initialRecords;
        let nextMode: EvidenceMode = context.isM43Snapshot
          ? "offline"
          : "unavailable";
        let nextEvidenceFromApi = false;
        let nextRecordsFromApi = false;
        let nextPage = recordPage;
        let nextPageSize = 10;
        let nextTotal = initialRecords.length;
        if (evidenceResponse.ok) {
          const evidenceBody = (await evidenceResponse.json()) as { evidence?: Evidence };
          if (evidenceBody.evidence) {
            nextEvidence = evidenceBody.evidence;
            nextEvidenceFromApi = true;
          }
        }
        if (recordsResponse.ok) {
          const recordsBody = (await recordsResponse.json()) as {
            items?: EvidenceRecord[];
            page?: number;
            page_size?: number;
            total?: number;
          };
          if (Array.isArray(recordsBody.items)) {
            nextRecords = recordsBody.items;
            nextRecordsFromApi = true;
            nextPage = typeof recordsBody.page === "number" ? recordsBody.page : recordPage;
            nextPageSize = typeof recordsBody.page_size === "number" ? recordsBody.page_size : 10;
            nextTotal = typeof recordsBody.total === "number" ? recordsBody.total : nextRecords.length;
          }
        } else if (!context.isM43Snapshot) {
          nextRecords = [];
        }
        if (nextEvidenceFromApi && nextRecordsFromApi) {
          nextMode = nextRecords.length > 0 ? "api" : "empty";
        } else if (nextEvidenceFromApi || nextRecordsFromApi) {
          nextMode = "partial";
        }
        setLoaded({
          insightId,
          evidence: nextEvidence,
          records: nextRecords,
          mode: nextMode,
          evidenceFromApi: nextEvidenceFromApi,
          recordsFromApi: nextRecordsFromApi,
          page: nextPage,
          pageSize: nextPageSize,
          total: nextTotal,
        });
      } catch {
        // The clearly labelled deterministic snapshot remains available offline.
      }
    };
    void load();
    return () => controller.abort();
  }, [
    context.isM43Snapshot,
    initialEvidence,
    initialRecords,
    insightId,
    open,
    recordPage,
  ]);

  const inputs = evidence.calculation_inputs;
  const hasNumerator = typeof inputs?.numerator_value === "number";
  const hasDenominator = typeof inputs?.denominator_value === "number";

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button data-hydrated={hydrated} size="sm" variant="ghost">
          <CalculatorIcon data-icon="inline-start" />
          چگونه محاسبه شد؟
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl" data-testid="evidence-sheet" side="right">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{metricId}</Badge>
            <Badge variant="outline">{evidence.calculation_version ?? "نسخه نامشخص"}</Badge>
          </div>
          <SheetTitle>شواهد و مسیر محاسبه</SheetTitle>
          <SheetDescription>
            مقدار نمایش‌داده‌شده: <strong className="text-foreground">{value}</strong>
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 px-4 pb-8">
          <div className="flex flex-col gap-6">
            {mode === "offline" ? (
              <Alert>
                <AlertTitle>نمایش محدود آفلاین</AlertTitle>
                <AlertDescription>
                  تجمیع ثبت‌شده معتبر است. کارت‌های زیر، در صورت وجود، نمونه‌های واقعی از منبع
                  تعمیرشده‌اند و به‌تنهایی اثبات کل شاخص نیستند.
                </AlertDescription>
              </Alert>
            ) : null}
            {mode === "unavailable" ? (
              <Alert variant="destructive">
                <AlertTitle>API شواهد در دسترس نیست</AlertTitle>
                <AlertDescription>
                  برای فیلتر انتخاب‌شده هیچ عدد یا ردیف M43 جایگزین نشده است. دوباره تلاش کنید.
                </AlertDescription>
              </Alert>
            ) : null}
            {mode === "partial" ? (
              <Alert>
                <AlertTitle>پاسخ شواهد ناقص است</AlertTitle>
                <AlertDescription>
                  تعریف شاخص {evidenceFromApi ? "از API" : "از ثبت آفلاین"} و ردیف‌ها{
                    " "
                  }{recordsFromApi ? "از API" : "از نمونه آفلاین یا ناموجود"} هستند. این دو
                  بخش به‌عنوان یک پاسخ کامل API معرفی نمی‌شوند.
                </AlertDescription>
              </Alert>
            ) : null}
            <section aria-labelledby="formula-heading" className="evidence-block">
              <h3 id="formula-heading">فرمول ثبت‌شده</h3>
              <code dir="ltr">{evidence.formula ?? "فرمول این شاخص در حالت آفلاین موجود نیست."}</code>
              <dl className="evidence-definition-list">
                <div>
                  <dt>حجم نمونه</dt>
                  <dd>
                    {typeof evidence.sample_size === "number"
                      ? formatInteger(evidence.sample_size)
                      : "در دسترس نیست"}
                  </dd>
                </div>
                <div>
                  <dt>دانه‌بندی</dt>
                  <dd>{evidence.grain ?? "در دسترس نیست"}</dd>
                </div>
                <div>
                  <dt>منطقه زمانی</dt>
                  <dd>{evidence.timezone ?? "Asia/Tehran"}</dd>
                </div>
                <div>
                  <dt>فیلتر</dt>
                  <dd dir="ltr">
                    {evidence.filters?.merchant_key ?? context.merchantKey} ·{" "}
                    {evidence.filters?.created_at_from ?? context.from} →{" "}
                    {evidence.filters?.created_at_to ?? context.to}
                  </dd>
                </div>
                {hasNumerator ? (
                  <div>
                    <dt>{inputs?.numerator_definition ?? "صورت"}</dt>
                    <dd>{formatInteger(Number(inputs?.numerator_value))}</dd>
                  </div>
                ) : null}
                {hasDenominator ? (
                  <div>
                    <dt>{inputs?.denominator_definition ?? "مخرج"}</dt>
                    <dd>{formatInteger(Number(inputs?.denominator_value))}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
            <Separator />
            <section aria-labelledby="records-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading font-semibold" id="records-heading">
                    ردیف‌های منبع
                  </h3>
                  <p className="text-xs text-muted-foreground">فقط داده مستعار پذیرنده {context.merchantKey}</p>
                </div>
                <DatabaseIcon aria-hidden="true" className="text-muted-foreground" />
              </div>
              {records.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {records.map((record, index) => {
                    const recordKey = String(
                      record.session_key ?? record.attempt_key ?? `record-${index}`,
                    );
                    const status = String(
                      record.session_status ??
                        record.try_status ??
                        record.switch_response_code ??
                        "ثبت‌نشده",
                    );
                    const psp = String(record.psp_path ?? record.psp_code ?? "ثبت نشده");
                    const observedAt = record.created_at ?? record.try_created_at;
                    return (
                      <article
                        className="evidence-record"
                        data-testid="evidence-record-card"
                        key={`${recordKey}-${index}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong dir="ltr">{recordKey}</strong>
                          <Badge variant={status === "Verified" ? "default" : "secondary"}>
                            {status}
                          </Badge>
                        </div>
                        <dl>
                          <div>
                            <dt>مبلغ</dt>
                            <dd>
                              {typeof record.amount === "number"
                                ? formatIrr(record.amount)
                                : "نامرتبط"}
                            </dd>
                          </div>
                          <div>
                            <dt>تلاش</dt>
                            <dd>
                              {formatInteger(Number(record.attempt_count ?? record.try_seq ?? 0))}
                            </dd>
                          </div>
                          <div>
                            <dt>مسیر PSP</dt>
                            <dd>{psp}</dd>
                          </div>
                          {observedAt ? (
                            <div>
                              <dt>زمان مشاهده</dt>
                              <dd dir="ltr">{String(observedAt)}</dd>
                            </div>
                          ) : null}
                          {metricId === "observed_repeat_card_rate" && record.payer_card_key ? (
                            <div>
                              <dt>کلید کارت درون پذیرنده</dt>
                              <dd dir="ltr">{record.payer_card_key}</dd>
                            </div>
                          ) : null}
                          {metricId === "psp_code_frequency" ? (
                            <div>
                              <dt>کد پاسخ سوئیچ</dt>
                              <dd dir="ltr">{String(record.switch_response_code ?? "ثبت‌نشده")}</dd>
                            </div>
                          ) : null}
                          {metricId === "init_latency_p95_ms" ? (
                            <div>
                              <dt>زمان init</dt>
                              <dd>{typeof record.init_time_ms === "number" ? `${formatInteger(record.init_time_ms)} ms` : "ناموجود"}</dd>
                            </div>
                          ) : null}
                          {metricId === "verify_latency_p95_ms" ? (
                            <div>
                              <dt>زمان verify</dt>
                              <dd>{typeof record.verify_time_ms === "number" ? `${formatInteger(record.verify_time_ms)} ms` : "ناموجود"}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Alert>
                  <AlertTitle>ردیف واجد شرایط در دسترس نیست</AlertTitle>
                  <AlertDescription>
                    برای این شاخص، در حالت فعلی ردیف نمونه سازگار با تعریف متریک نمایش داده
                    نمی‌شود.
                  </AlertDescription>
                </Alert>
              )}
              {recordsFromApi && isCurrent && loaded.total > loaded.pageSize ? (
                <Pagination aria-label="صفحه‌بندی ردیف‌های منبع" className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        aria-label="صفحه قبلی ردیف‌ها"
                        disabled={pagePending || loaded.page <= 1}
                        onClick={() =>
                          setPageState({ insightId, page: Math.max(1, loaded.page - 1) })
                        }
                        size="sm"
                        variant="outline"
                      >
                        قبلی
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <span aria-live="polite" className="px-3 text-sm text-muted-foreground">
                        صفحه {formatInteger(loaded.page)} از {formatInteger(totalPages)} · {formatInteger(loaded.total)} ردیف
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        aria-label="صفحه بعدی ردیف‌ها"
                        disabled={pagePending || loaded.page >= totalPages}
                        onClick={() =>
                          setPageState({ insightId, page: Math.min(totalPages, loaded.page + 1) })
                        }
                        size="sm"
                        variant="outline"
                      >
                        بعدی
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </section>
            <Alert>
              <ExternalLinkIcon aria-hidden="true" />
              <AlertTitle>مرجع بازتولید</AlertTitle>
              <AlertDescription>
                {evidence.reproduction?.reference ?? `metric-registry.json → ${metricId}`}
              </AlertDescription>
            </Alert>
            <section aria-labelledby="limitations-heading">
              <h3 className="font-heading font-semibold" id="limitations-heading">
                محدودیت‌ها
              </h3>
              <ul className="mt-2 list-disc pe-5 text-sm leading-7 text-muted-foreground">
                {(evidence.limitations ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
