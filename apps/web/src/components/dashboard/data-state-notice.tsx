import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DashboardData } from "@/lib/dashboard-types";

export function DataStateNotice({ meta }: { meta: DashboardData["meta"] }) {
  if (!meta.partial_data) return null;

  return (
    <Alert>
      <AlertTitle>حالت داده محدود است</AlertTitle>
      <AlertDescription>
        منبع فعلی «{meta.source_kind}» است؛ نتایج فقط برای بازه {meta.date_from} تا{
          " "
        }{meta.date_to} معتبرند و به کل داده چالش تعمیم داده نمی‌شوند.
      </AlertDescription>
    </Alert>
  );
}
