import { ChartPanel } from "@/components/dashboard/chart-panel";
import { DataStateNotice } from "@/components/dashboard/data-state-notice";
import { EvidenceSheet } from "@/components/dashboard/evidence-sheet";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard-filters";
import { formatInteger, formatIrr, formatPercent } from "@/lib/format";
import { getDashboard } from "@/lib/server-api";

type GrowthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GrowthPage({ searchParams }: GrowthPageProps) {
  const data = await getDashboard(
    dashboardFiltersFromSearchParams(await searchParams),
  );
  const repeatKpi = data.kpis.find((kpi) => kpi.metric_id === "observed_repeat_card_rate");
  const peerMedian = Number(data.peer.peer_median_rate ?? 0);
  const merchantRate = Number(data.peer.merchant_rate ?? 0);
  const peerAvailable = Boolean(data.peer.eligible && data.peer.peer_median_rate != null);
  const opportunityAvailable = peerAvailable && data.opportunity.value != null;
  const sessionsEvidenceId =
    data.revenue_decomposition.evidence_ids?.sessions ??
    data.kpis.find((kpi) => kpi.metric_id === "eligible_sessions")?.evidence_id;
  const amountBandRows = data.amount_bands
    .filter((band) => band.conversion_rate != null)
    .map((band) => ({
      label: band.label_fa,
      conversion: band.conversion_rate as number,
    }));

  return (
    <div className="page-stack">
      <PageHeading
        description="رشد را به تعداد نشست، نرخ تکمیل و ارزش هر پرداخت تفکیک کنید؛ سپس فرصت‌های قابل‌آزمایش را بسنجید."
        eyebrow="رشد قابل توضیح"
        title="رشد و فرصت‌ها"
        context={`${data.meta.merchant_key} · ${data.meta.date_from} تا ${data.meta.date_to}`}
      />

      <DataStateNotice meta={data.meta} />

      <section aria-label="خلاصه رشد" className="kpi-grid kpi-grid-two">
        {repeatKpi ? <MetricCard kpi={repeatKpi} /> : (
          <Card><CardHeader><CardTitle>کارت تکراری مشاهده‌شده</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">این شاخص در پاسخ API این بازه موجود نیست.</p></CardContent></Card>
        )}
        <Card className="metric-card scenario-card">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>سناریوی حسابی فرصت</CardTitle>
              <Badge variant="outline">{opportunityAvailable ? "پیش‌بینی نیست" : "نمونه همتا ناکافی"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="metric-value">{opportunityAvailable ? formatIrr(data.opportunity.value as number, true) : "نمایش داده نمی‌شود"}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {opportunityAvailable
                ? data.opportunity.value === 0
                  ? `نرخ ${data.meta.merchant_key} بالاتر از میانه همتاست؛ بنابراین سناریوی محافظه‌کارانه فرصت، صفر است.`
                  : "اگر نرخ تکمیل با فرض ثبات مبلغ به میانه گروه همتا برسد."
                : "تا وقتی دست‌کم ۱۰ همتای واجد شرایط وجود نداشته باشد، سناریوی فرصت ساخته نمی‌شود."}
            </p>
          </CardContent>
          <CardFooter>
            <EvidenceSheet insightId={data.opportunity.evidence_id} metricId="opportunity_scenario_irr" value={opportunityAvailable ? formatIrr(data.opportunity.value as number) : "نمونه ناکافی"} />
          </CardFooter>
        </Card>
      </section>

      <div className="analytics-grid">
        <ChartPanel
          description={data.revenue_decomposition.note}
          rows={[
            { label: "بازه قبلی", sessions: data.revenue_decomposition.previous.sessions },
            { label: "بازه جاری", sessions: data.revenue_decomposition.current.sessions },
          ]}
          series={[{ key: "sessions", label: "نشست" }]}
          title="تجزیه رشد: حجم نشست"
          evidence={sessionsEvidenceId ? {
            insightId: sessionsEvidenceId,
            metricId: "eligible_sessions",
            value: formatInteger(data.revenue_decomposition.current.sessions),
          } : undefined}
        />

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
              <p className="section-kicker">گروه همتای هم‌دسته و هم‌حجم</p>
                <CardTitle className="mt-1">جایگاه در گروه همتا</CardTitle>
              </div>
              <Badge variant={peerAvailable && merchantRate >= peerMedian ? "default" : "secondary"}>
                {peerAvailable ? `${formatInteger(Number(data.peer.peer_count ?? 0))} همتا` : "نمونه ناکافی"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {peerAvailable ? (
              <>
                <div>
                  <div className="mb-2 flex justify-between gap-3 text-sm"><span>نرخ {data.meta.merchant_key}</span><span>{formatPercent(merchantRate)}</span></div>
                  <Progress value={merchantRate * 100} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between gap-3 text-sm"><span>میانه همتایان</span><span>{formatPercent(peerMedian)}</span></div>
                  <Progress value={peerMedian * 100} />
                </div>
                <p className="text-sm leading-7 text-muted-foreground">میانه با وزن یکسان برای هر پذیرنده محاسبه شده است.</p>
              </>
            ) : (
              <Alert>
                <AlertTitle>مقایسه همتا نمایش داده نمی‌شود</AlertTitle>
                <AlertDescription>کمتر از ۱۰ پذیرنده واجد شرایط با حداقل ۱۰۰ نشست در این گروه وجود دارد.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {amountBandRows.length > 0 ? (
        <ChartPanel
          description="بازه‌ها با مرز ثابت ریالی ساخته شده‌اند؛ بازه بدون مخرج از نمودار حذف می‌شود و صفر اندازه‌گیری‌شده تلقی نمی‌شود. نرخ بازه‌های کم‌نمونه باید همراه تعداد نشست خوانده شود."
          rows={amountBandRows}
          series={[{ key: "conversion", label: "نرخ تکمیل" }]}
          title="نرخ تکمیل به تفکیک مبلغ"
          valueFormat="percent"
          evidence={{
            insightId: data.amount_bands[0].evidence_id,
            metricId: "amount_band_performance",
            value: "پنج بازه ثابت ریالی",
          }}
        />
      ) : (
        <Alert>
          <AlertTitle>بازه مبلغ در دسترس نیست</AlertTitle>
          <AlertDescription>API برای بازه فعال، ردیف تجمیعی مبلغ برنگردانده است.</AlertDescription>
        </Alert>
      )}

      <ChartPanel
        description="کارت تکراری فقط در دامنه همین پذیرنده تعریف شده است؛ هیچ کارت یا فردی میان پذیرندگان پیوند نمی‌خورد."
        rows={[
          { label: "یک‌بار مشاهده‌شده", count: data.repeat.observed_cards - data.repeat.repeat_cards },
          { label: "تکراری مشاهده‌شده", count: data.repeat.repeat_cards },
        ]}
        series={[{ key: "count", label: "کارت مشاهده‌شده" }]}
        title="ترکیب کارت‌های مشاهده‌شده"
        evidence={{
          insightId: data.repeat.evidence_id,
          metricId: "observed_repeat_card_rate",
          value: data.repeat.observed_repeat_rate == null ? "نمونه ناکافی" : formatPercent(data.repeat.observed_repeat_rate),
        }}
      />

      <Alert>
        <AlertTitle>تعریف تکرار مشاهده‌شده</AlertTitle>
        <AlertDescription>
          {formatInteger(data.repeat.repeat_cards)} کارت از {formatInteger(data.repeat.observed_cards)} کارت در همین پذیرنده دست‌کم دو نشست تأییدشده دارند. کارت‌ها میان پذیرندگان به هم متصل نمی‌شوند.
        </AlertDescription>
      </Alert>
    </div>
  );
}
