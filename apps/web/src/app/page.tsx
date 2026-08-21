import { ActionCard } from "@/components/dashboard/action-card";
import { ChartPanel } from "@/components/dashboard/chart-panel";
import { DataStateNotice } from "@/components/dashboard/data-state-notice";
import { LifecyclePulse } from "@/components/dashboard/lifecycle-pulse";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeading } from "@/components/dashboard/page-heading";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard-filters";
import { getDashboard } from "@/lib/server-api";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const data = await getDashboard(
    dashboardFiltersFromSearchParams(await searchParams),
  );
  const revenueKpi = data.kpis.find((kpi) => kpi.metric_id === "verified_revenue");

  return (
    <div className="page-stack">
      <PageHeading
        description={"سه اقدام عددی که بیشترین اثر عملی را برای پذیرنده " + data.meta.merchant_key + " دارند؛ هر نتیجه تا ردیف منبع قابل پیگیری است."}
        eyebrow="تصمیم امروز"
        title="مرکز اقدام"
        context={`${data.meta.merchant_key} · داده تا ${data.meta.date_to}`}
      />

      <DataStateNotice meta={data.meta} />

      <section aria-label="شاخص‌های اصلی" className="kpi-grid">
        {data.kpis.slice(0, 3).map((kpi) => <MetricCard key={kpi.metric_id} kpi={kpi} />)}
      </section>

      <LifecyclePulse evidenceId={data.lifecycle.evidence_id} stages={data.lifecycle.stages} />

      <section aria-labelledby="actions-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">اکنون چه کار کنم؟</p>
            <h2 id="actions-heading">اقدام‌های اولویت‌دار</h2>
          </div>
          <p>اولویت بر پایه اندازه فرصت، قابلیت اجرا و قدرت شواهد تعیین شده است.</p>
        </div>
        <div className="action-grid">
          {data.insights.slice(0, 3).map((item, index) => (
            <ActionCard insight={item} key={item.insight_id} rank={index + 1} />
          ))}
        </div>
      </section>

      <ChartPanel
        description="درآمد تأییدشده در بازه فعال نمایش داده شده است؛ تغییر زمانی به‌تنهایی علت را اثبات نمی‌کند."
        evidence={revenueKpi ? {
          insightId: revenueKpi.evidence_id,
          metricId: revenueKpi.metric_id,
          value: String(revenueKpi.value ?? "ناموجود"),
        } : undefined}
        kind="line"
        rows={data.trend.map((row) => ({ label: row.date, revenue: row.verified_revenue }))}
        series={[{ key: "revenue", label: "درآمد تأییدشده" }]}
        title="روند درآمد تأییدشده"
        valueFormat="irr-compact"
      />
    </div>
  );
}
