import { ArrowLeftIcon, FlaskConicalIcon, GaugeIcon, WrenchIcon } from "lucide-react";

import { EvidenceSheet } from "@/components/dashboard/evidence-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Insight } from "@/lib/dashboard-types";

export function ActionCard({ insight, rank }: { insight: Insight; rank: number }) {
  const confidenceLabel =
    insight.confidence === "strong"
      ? "قوی"
      : insight.confidence === "supported"
        ? "پشتیبانی‌شده"
        : "اکتشافی";
  const priorityLabel =
    insight.priority === "high"
      ? "اولویت بالا"
      : insight.priority === "low"
        ? "اولویت پایین"
        : "اولویت متوسط";

  return (
    <Card className="action-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="action-rank" aria-label={`اولویت ${rank}`}>{new Intl.NumberFormat("fa-IR").format(rank)}</div>
          <Badge variant={insight.confidence === "exploratory" ? "outline" : "default"}>
            شواهد {confidenceLabel}
          </Badge>
        </div>
        <CardTitle>{insight.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-7 text-muted-foreground">{insight.statement}</p>
        <dl className="action-details">
          {insight.trigger ? (
            <div>
              <dt><GaugeIcon aria-hidden="true" /> محرک عددی</dt>
              <dd>{insight.trigger}</dd>
            </div>
          ) : null}
          <div>
            <dt><WrenchIcon aria-hidden="true" /> اقدام</dt>
            <dd>{insight.recommendation ?? "برای این بینش اقدام ثبت‌شده‌ای در API وجود ندارد."}</dd>
          </div>
          <div>
            <dt><ArrowLeftIcon aria-hidden="true" /> سازوکار</dt>
            <dd>{insight.expected_mechanism ?? "سازوکار در شواهد این بینش ثبت نشده است."}</dd>
          </div>
          <div>
            <dt><FlaskConicalIcon aria-hidden="true" /> برنامه سنجش</dt>
            <dd>{insight.measurement_plan ?? "برنامه سنجش در شواهد این بینش ثبت نشده است."}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><GaugeIcon aria-hidden="true" /> {priorityLabel}</span>
        <EvidenceSheet insightId={insight.insight_id} metricId={insight.metric_id} value={insight.statement} />
      </CardFooter>
    </Card>
  );
}
