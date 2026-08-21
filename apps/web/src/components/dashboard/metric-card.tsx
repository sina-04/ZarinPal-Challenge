import { ArrowDownLeftIcon, ArrowUpLeftIcon, MinusIcon } from "lucide-react";

import { EvidenceSheet } from "@/components/dashboard/evidence-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardKpi } from "@/lib/dashboard-types";
import { formatKpi, formatSignedPercent } from "@/lib/format";

export function MetricCard({ kpi }: { kpi: DashboardKpi }) {
  const change = kpi.comparison?.relative_change;
  const TrendIcon = change == null ? MinusIcon : change >= 0 ? ArrowUpLeftIcon : ArrowDownLeftIcon;
  const formatted = formatKpi(kpi.value, kpi.unit);

  return (
    <Card className="metric-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{kpi.label}</CardTitle>
          <Badge variant={change != null && change < 0 ? "destructive" : "secondary"}>
            <TrendIcon aria-hidden="true" />
            {formatSignedPercent(change)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="metric-value" dir="rtl">{formatted}</p>
        {kpi.confidence_interval_95 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            بازه اطمینان ۹۵٪: {formatKpi(kpi.confidence_interval_95.low, "ratio")} تا {formatKpi(kpi.confidence_interval_95.high, "ratio")}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {kpi.comparison?.type && kpi.comparison.type !== "none"
              ? kpi.comparison.definition ?? "مقایسه ثبت‌شده در شواهد"
              : "بدون مقایسه ثبت‌شده"}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <EvidenceSheet insightId={kpi.evidence_id} metricId={kpi.metric_id} value={formatted} />
      </CardFooter>
    </Card>
  );
}
