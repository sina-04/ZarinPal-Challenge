import { ArrowLeftIcon, CheckCircle2Icon, CircleDotDashedIcon } from "lucide-react";

import { EvidenceSheet } from "@/components/dashboard/evidence-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { LifecycleStage } from "@/lib/dashboard-types";
import { formatInteger, formatPercent } from "@/lib/format";

const stageLabels: Record<LifecycleStage["stage"], string> = {
  Created: "ساخته‌شده",
  Attempted: "تلاش‌شده",
  InBank: "ورود به بانک",
  Paid: "پرداخت‌شده",
  Verified: "تأییدشده",
};

export function LifecyclePulse({
  stages,
  evidenceId,
}: {
  stages: LifecycleStage[];
  evidenceId: string;
}) {
  const finalStage = stages.at(-1);
  const largestDrop = stages
    .slice(1)
    .map((stage, index) => ({
      stage,
      previous: stages[index],
      rate: stage.dropoff_from_previous ?? 0,
    }))
    .sort((left, right) => right.rate - left.rate)[0];

  return (
    <Card className="lifecycle-card" data-testid="lifecycle-pulse">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-kicker">امضای محصول · مسیر واقعی پرداخت</p>
            <CardTitle className="mt-1">نبض چرخه پرداخت</CardTitle>
          </div>
          <Badge variant="outline">دانه‌بندی: نشست</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ol aria-label="مراحل چرخه پرداخت" className="lifecycle-ribbon">
          {stages.map((stage, index) => (
            <li className="lifecycle-stage" key={stage.stage}>
              <span className="stage-node">
                {stage.stage === "Verified" ? <CheckCircle2Icon aria-hidden="true" /> : <CircleDotDashedIcon aria-hidden="true" />}
              </span>
              <div className="stage-copy">
                <span>{stageLabels[stage.stage]}</span>
                <strong>{formatInteger(stage.count)}</strong>
              </div>
              {index < stages.length - 1 ? (
                <div className="stage-connector" aria-label={`ریزش ${formatPercent(stages[index + 1].dropoff_from_previous ?? 0)}`}>
                  <ArrowLeftIcon aria-hidden="true" />
                  <span>{formatPercent(stages[index + 1].dropoff_from_previous ?? 0)} ریزش</span>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          {largestDrop ? (
            <>
              بزرگ‌ترین افت مشاهده‌شده از {stageLabels[largestDrop.previous.stage]} به{" "}
              {stageLabels[largestDrop.stage.stage]} و برابر {formatPercent(largestDrop.rate)} است.{" "}
            </>
          ) : null}
          این مسیر وضعیت نهایی هر نشست را نشان می‌دهد، نه تعداد خام تلاش‌ها.
        </p>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="text-sm font-medium">{formatInteger(finalStage?.count ?? 0)} نشست به Verified رسیده‌اند.</span>
        <EvidenceSheet insightId={evidenceId} metricId="payment_lifecycle_counts" value={formatPercent((finalStage?.count ?? 0) / (stages[0]?.count ?? 1))} />
      </CardFooter>
    </Card>
  );
}
