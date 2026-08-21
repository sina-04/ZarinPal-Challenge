"use client";

import { AlertTriangleIcon, RefreshCcwIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <Alert variant="destructive">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>تحلیل این فیلتر بارگذاری نشد</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            API تحلیلی پاسخ نداد و برای جلوگیری از نمایش عدد پذیرنده دیگر، داده جایگزین
            نشد.
          </p>
          <Button onClick={reset} variant="outline">
            <RefreshCcwIcon data-icon="inline-start" />
            تلاش دوباره
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
