"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TablePropertiesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EvidenceSheet } from "@/components/dashboard/evidence-sheet";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger, formatIrr, formatPercent } from "@/lib/format";
import { useHydrated } from "@/hooks/use-hydrated";

export type ChartRow = { label: string; [series: string]: string | number };

export function ChartPanel({
  title,
  description,
  rows,
  series,
  kind = "bar",
  valueFormat = "integer",
  evidence,
}: {
  title: string;
  description: string;
  rows: ChartRow[];
  series: Array<{ key: string; label: string }>;
  kind?: "bar" | "line";
  valueFormat?: "integer" | "irr-compact" | "percent";
  evidence?: { insightId: string; metricId: string; value: string };
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const descriptionId = useId();
  const [tableOpen, setTableOpen] = useState(false);
  const valueFormatter = useMemo(() => {
    if (valueFormat === "irr-compact") return (value: number) => formatIrr(value, true);
    if (valueFormat === "percent") return (value: number) => formatPercent(value);
    return formatInteger;
  }, [valueFormat]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let chart: { dispose: () => void; resize: () => void; setOption: (option: unknown) => void } | undefined;

    const render = async () => {
      const echarts = await import("echarts");
      if (disposed || !chartRef.current) return;
      chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
      const styles = getComputedStyle(document.documentElement);
      const palette = [
        styles.getPropertyValue("--chart-gold").trim() || "#a66b00",
        styles.getPropertyValue("--chart-teal").trim() || "#087a70",
        styles.getPropertyValue("--chart-coral").trim() || "#c4513c",
      ];
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      chart.setOption({
        animation: !reduceMotion,
        aria: { enabled: true, description },
        color: palette,
        grid: { left: 12, right: 12, top: 28, bottom: 20, containLabel: true },
        legend: { top: 0, textStyle: { fontFamily: "Vazirmatn" } },
        tooltip: { trigger: "axis", valueFormatter },
        xAxis: {
          type: "category",
          data: rows.map((row) => row.label),
          axisTick: { show: false },
          axisLabel: { fontFamily: "Vazirmatn", color: "#59616f" },
        },
        yAxis: {
          type: "value",
          min: 0,
          axisLabel: { formatter: (value: number) => valueFormatter(value), fontFamily: "Vazirmatn", color: "#59616f" },
          splitLine: { lineStyle: { color: "#e6e9ee" } },
        },
        series: series.map((item) => ({
          name: item.label,
          type: kind,
          data: rows.map((row) => Number(row[item.key])),
          smooth: kind === "line",
          symbolSize: 7,
          barMaxWidth: 34,
          lineStyle: { width: 3 },
          emphasis: { focus: "series" },
        })),
      });
      resizeObserver = new ResizeObserver(() => chart?.resize());
      resizeObserver.observe(chartRef.current);
    };
    void render();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.dispose();
    };
  }, [description, kind, rows, series, valueFormatter]);

  return (
    <Card className="chart-card" data-hydrated={hydrated} data-testid="chart-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm leading-7 text-muted-foreground" id={descriptionId}>{description}</p>
      </CardHeader>
      <CardContent>
        <div aria-describedby={descriptionId} aria-label={title} className="chart-canvas" ref={chartRef} role="img" />
        <Collapsible onOpenChange={setTableOpen} open={tableOpen}>
          <CollapsibleTrigger asChild>
            <Button className="mt-2" size="sm" variant="ghost">
              <TablePropertiesIcon data-icon="inline-start" />
              {tableOpen ? "پنهان‌کردن جدول داده‌ها" : "نمایش جدول داده‌ها"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent
            data-testid="chart-table-alternative"
            forceMount
            hidden={!tableOpen}
          >
            <div aria-label={`جدول داده‌های ${title}`} className="mt-3 overflow-x-auto" role="region" tabIndex={0}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>بازه</TableHead>
                    {series.map((item) => <TableHead key={item.key}>{item.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      {series.map((item) => <TableCell key={item.key}>{valueFormatter(Number(row[item.key]))}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <p className="text-xs text-muted-foreground">منبع: فیلتر فعال داشبورد · Asia/Tehran</p>
        {evidence ? (
          <EvidenceSheet
            insightId={evidence.insightId}
            metricId={evidence.metricId}
            value={evidence.value}
          />
        ) : null}
      </CardFooter>
    </Card>
  );
}
