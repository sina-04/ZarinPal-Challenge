import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری تحلیل" className="page-stack">
      <div className="page-heading">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-12 w-full max-w-lg" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>
      <section aria-label="در حال بارگذاری شاخص‌ها" className="kpi-grid">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
