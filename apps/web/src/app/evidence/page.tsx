import { Analyst } from "@/components/dashboard/analyst";
import { DataStateNotice } from "@/components/dashboard/data-state-notice";
import { EvidenceSheet } from "@/components/dashboard/evidence-sheet";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard-filters";
import { getDashboard } from "@/lib/server-api";

type EvidencePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EvidencePage({ searchParams }: EvidencePageProps) {
  const data = await getDashboard(
    dashboardFiltersFromSearchParams(await searchParams),
  );

  return (
    <div className="page-stack">
      <PageHeading
        description="تعریف هر شاخص، فرمول، دامنه، محدودیت و ردیف‌های مجاز همان پذیرنده را ببینید؛ سپس از تحلیل‌گر منبع‌دار بپرسید."
        eyebrow="ردیابی از ادعا تا ردیف"
        title="شواهد و تحلیل‌گر"
        context={`${data.meta.merchant_key} · ${data.meta.date_from} تا ${data.meta.date_to}`}
      />

      <DataStateNotice meta={data.meta} />

      <Alert>
        <AlertTitle>هزینه تعدیل‌شده تعرفه واقعی نیست</AlertTitle>
        <AlertDescription>
          adjusted_fee یک مقدار تحلیلی با ضریب یکنواخت است و تعرفه واقعی زرین‌پال را نشان نمی‌دهد؛ فقط مقایسه نسبی آن معتبر است.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">نسخه محاسبه {data.meta.calculation_version}</p>
              <CardTitle className="mt-1">فرهنگ شاخص‌ها</CardTitle>
            </div>
            <Badge variant="outline">{data.metric_registry.length} تعریف فعال</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div aria-label="فرهنگ شاخص‌ها" className="metric-registry-table" role="region" tabIndex={0}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شناسه</TableHead>
                  <TableHead>تعریف</TableHead>
                  <TableHead>دانه‌بندی</TableHead>
                  <TableHead><span className="sr-only">جزئیات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.metric_registry.map((metric) => (
                  <TableRow id={metric.metric_id} key={metric.metric_id}>
                    <TableCell><code dir="ltr">{metric.metric_id}</code></TableCell>
                    <TableCell>{metric.formula ?? metric.label}</TableCell>
                    <TableCell><Badge variant="secondary">{metric.grain ?? "session"}</Badge></TableCell>
                    <TableCell>
                      <EvidenceSheet
                        insightId={`merchant-${data.meta.merchant_key}--${metric.metric_id}--${data.meta.date_from}--${data.meta.date_to}`}
                        metricId={metric.metric_id}
                        value={String(metric.label ?? metric.metric_id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Analyst
        key={`${data.meta.merchant_key}--${data.meta.date_from}--${data.meta.date_to}`}
      />
    </div>
  );
}
