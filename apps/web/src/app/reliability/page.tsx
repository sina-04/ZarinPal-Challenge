import { ChartPanel } from "@/components/dashboard/chart-panel";
import { DataStateNotice } from "@/components/dashboard/data-state-notice";
import { EvidenceSheet } from "@/components/dashboard/evidence-sheet";
import { LifecyclePulse } from "@/components/dashboard/lifecycle-pulse";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInteger, formatPercent } from "@/lib/format";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard-filters";
import { getDashboard } from "@/lib/server-api";

function ReliabilityMetric({ title, value, note, metricId, insightId }: { title: string; value: string; note: string; metricId: string; insightId: string }) {
  return (
    <Card className="metric-card">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="metric-value">{value}</p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{note}</p>
      </CardContent>
      <CardFooter><EvidenceSheet insightId={insightId} metricId={metricId} value={value} /></CardFooter>
    </Card>
  );
}

type ReliabilityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReliabilityPage({ searchParams }: ReliabilityPageProps) {
  const data = await getDashboard(
    dashboardFiltersFromSearchParams(await searchParams),
  );
  const latencyRows = [
    { label: "میانه", ms: data.latency.p50_ms },
    { label: "صدک ۹۰", ms: data.latency.p90_ms },
    { label: "صدک ۹۵", ms: data.latency.p95_ms },
  ].filter((row): row is { label: string; ms: number } =>
    typeof row.ms === "number" && Number.isFinite(row.ms),
  );
  const latencyP95Available = typeof data.latency.p95_ms === "number";
  const shownPspAttempts = data.psp_codes.reduce(
    (total, row) => total + row.attempts,
    0,
  );
  const omittedPspAttempts = Math.max(
    0,
    data.psp_code_coverage.coded_attempts - shownPspAttempts,
  );

  return (
    <div className="page-stack">
      <PageHeading
        description="محل ریزش، بازیابی تلاش‌ها و کیفیت فنی مسیر پرداخت را بدون نام‌گذاری حدسی خطاهای PSP بررسی کنید."
        eyebrow="سلامت مسیر پرداخت"
        title="پایداری پرداخت"
        context={`${data.meta.merchant_key} · ${data.meta.date_from} تا ${data.meta.date_to}`}
      />

      <DataStateNotice meta={data.meta} />

      <section aria-label="خلاصه پایداری" className="kpi-grid">
        <ReliabilityMetric
          insightId={data.paid_not_verified.evidence_id}
          metricId="paid_not_verified_rate"
          note="نشست‌هایی که کارت کسر شده اما تأیید پذیرنده ثبت نشده است."
          title="Paid بدون Verified"
          value={formatInteger(data.paid_not_verified.sessions)}
        />
        <ReliabilityMetric
          insightId={data.retry.evidence_id}
          metricId="retry_session_rate"
          note={`${formatInteger(data.retry.rescued_sessions)} نشست چندتلاشی در نهایت Verified شده‌اند.`}
          title="نرخ تلاش مجدد"
          value={data.retry.retry_rate == null ? "ناموجود" : formatPercent(data.retry.retry_rate)}
        />
        <ReliabilityMetric
          insightId={String(data.latency.evidence_id)}
          metricId="init_latency_p95_ms"
          note="زمان API درگاه است؛ زمان فکر یا تعامل خریدار نیست."
          title="تأخیر صدک ۹۵"
          value={latencyP95Available ? `${formatInteger(data.latency.p95_ms as number)} میلی‌ثانیه` : "نمونه ناکافی"}
        />
        <ReliabilityMetric
          insightId={data.psp_code_coverage.evidence_id}
          metricId="psp_code_coverage"
          note={`${formatInteger(data.psp_code_coverage.coded_attempts)} تلاش کددار از ${formatInteger(data.psp_code_coverage.eligible_psp_attempts)} تلاش واجد شرایط.`}
          title="پوشش کد پاسخ PSP"
          value={data.psp_code_coverage.coverage_rate == null ? "ناموجود" : formatPercent(data.psp_code_coverage.coverage_rate)}
        />
      </section>

      <LifecyclePulse evidenceId={data.lifecycle.evidence_id} stages={data.lifecycle.stages} />

      <div className="analytics-grid">
        {latencyRows.length > 0 ? (
          <ChartPanel
            description="فقط صدک‌های دارای نمونه نمایش داده می‌شوند؛ میانه به‌تنهایی کندی انتهای توزیع را پنهان می‌کند."
            evidence={{
              insightId: String(data.latency.evidence_id),
              metricId: "init_latency_p95_ms",
              value: String(data.latency.p95_ms ?? "نمونه ناکافی"),
            }}
            rows={latencyRows}
            series={[{ key: "ms", label: "میلی‌ثانیه" }]}
            title="توزیع خلاصه تأخیر API"
          />
        ) : (
          <Alert>
            <AlertTitle>نمونه تأخیر کافی نیست</AlertTitle>
            <AlertDescription>برای فیلتر فعال هیچ صدک قابل‌اندازه‌گیری به API نرسیده است.</AlertDescription>
          </Alert>
        )}
        <ChartPanel
          description={`${formatInteger(data.psp_codes.length)} گروه پرتکرار، ${formatInteger(shownPspAttempts)} تلاش از ${formatInteger(data.psp_code_coverage.coded_attempts)} تلاش کددار را پوشش می‌دهند؛ ${formatInteger(omittedPspAttempts)} تلاش در گروه‌های نمایش‌داده‌نشده است. بدون codebook رسمی هیچ معنای بانکی به کدها نسبت داده نمی‌شود.`}
          evidence={data.psp_codes[0]?.evidence_id ? {
            insightId: data.psp_codes[0].evidence_id,
            metricId: "psp_code_frequency",
            value: `${formatInteger(shownPspAttempts)} از ${formatInteger(data.psp_code_coverage.coded_attempts)} تلاش کددار`,
          } : undefined}
          rows={data.psp_codes.map((row) => ({ label: `${row.psp_code} · ${row.response_code}`, attempts: row.attempts }))}
          series={[{ key: "attempts", label: "تلاش" }]}
          title="گروه‌های پرتکرار کد پاسخ به تفکیک PSP"
        />
      </div>

      <Alert>
        <AlertTitle>مرز تفسیر</AlertTitle>
        <AlertDescription>
          try_seq = 0 در مخرج نشست‌ها باقی می‌ماند اما وارد تحلیل پاسخ PSP یا تأخیر نمی‌شود. کد پاسخ نیز بدون واژه‌هایی مانند «موجودی ناکافی» نمایش داده می‌شود.
        </AlertDescription>
      </Alert>
    </div>
  );
}
