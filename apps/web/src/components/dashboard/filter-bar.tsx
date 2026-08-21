"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { components } from "@/lib/api.generated";
import { DEFAULT_DASHBOARD_FILTERS } from "@/lib/dashboard-filters";
import { serializeFilters } from "@/lib/format";

type Merchant = Pick<
  components["schemas"]["MerchantItem"],
  "merchant_key" | "category_title" | "data_start" | "data_end" | "is_featured_demo"
>;

type Period = "full" | "30d" | "90d" | "custom";

const fallbackMerchant: Merchant = {
  merchant_key: "M43",
  category_title: "کیف و کفش فروشی",
  data_start: DEFAULT_DASHBOARD_FILTERS.from,
  data_end: DEFAULT_DASHBOARD_FILTERS.to,
  is_featured_demo: true,
};

function inclusiveStart(endIso: string, days: number) {
  const end = new Date(`${endIso}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - (days - 1));
  return end.toISOString().slice(0, 10);
}

function periodDates(merchant: Merchant, period: Period) {
  if (period === "full") {
    return { from: merchant.data_start, to: merchant.data_end };
  }
  const candidate = inclusiveStart(merchant.data_end, period === "30d" ? 30 : 90);
  return {
    from: candidate < merchant.data_start ? merchant.data_start : candidate,
    to: merchant.data_end,
  };
}

function inferPeriod(merchant: Merchant, from: string, to: string): Period {
  if (from === merchant.data_start && to === merchant.data_end) return "full";
  if (from === inclusiveStart(merchant.data_end, 30) && to === merchant.data_end) {
    return "30d";
  }
  if (from === inclusiveStart(merchant.data_end, 90) && to === merchant.data_end) {
    return "90d";
  }
  return "custom";
}

function FilterControls({
  compact = false,
  merchants,
  merchantKey,
  period,
  loading,
  pending,
  onMerchantChange,
  onPeriodChange,
  onApply,
}: {
  compact?: boolean;
  merchants: Merchant[];
  merchantKey: string;
  period: Period;
  loading: boolean;
  pending: boolean;
  onMerchantChange: (value: string) => void;
  onPeriodChange: (value: Period) => void;
  onApply: () => void;
}) {
  return (
    <div className={compact ? "filter-controls-mobile" : "filter-controls"}>
      <div className="filter-field">
        <Label htmlFor={compact ? "merchant-mobile" : "merchant-desktop"}>پذیرنده</Label>
        <Select
          dir="rtl"
          disabled={loading || pending}
          onValueChange={onMerchantChange}
          value={merchantKey}
        >
          <SelectTrigger id={compact ? "merchant-mobile" : "merchant-desktop"}>
            <SelectValue placeholder="انتخاب پذیرنده" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {merchants.map((merchant) => (
                <SelectItem key={merchant.merchant_key} value={merchant.merchant_key}>
                  {merchant.merchant_key} · {merchant.category_title}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="filter-field">
        <Label htmlFor={compact ? "period-mobile" : "period-desktop"}>بازه تحلیل</Label>
        <Select
          dir="rtl"
          disabled={loading || pending}
          onValueChange={(value) => onPeriodChange(value as Period)}
          value={period}
        >
          <SelectTrigger id={compact ? "period-mobile" : "period-desktop"}>
            <SelectValue placeholder="انتخاب بازه" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="full">کل بازه معتبر پذیرنده</SelectItem>
              <SelectItem value="30d">۳۰ روز پایانی</SelectItem>
              <SelectItem value="90d">۹۰ روز پایانی</SelectItem>
              {period === "custom" ? (
                <SelectItem value="custom">بازه سفارشی URL</SelectItem>
              ) : null}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button disabled={loading || pending} onClick={onApply}>
        {pending ? "در حال اعمال…" : "اعمال فیلترها"}
      </Button>
    </div>
  );
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryMerchant =
    searchParams.get("merchant_key") ?? DEFAULT_DASHBOARD_FILTERS.merchant_key;
  const queryFrom = searchParams.get("from") ?? DEFAULT_DASHBOARD_FILTERS.from;
  const queryTo = searchParams.get("to") ?? DEFAULT_DASHBOARD_FILTERS.to;
  const [merchants, setMerchants] = useState<Merchant[]>([fallbackMerchant]);
  const [merchantKey, setMerchantKey] = useState(queryMerchant);
  const [period, setPeriod] = useState<Period>("full");
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/v1/merchants", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { items?: Merchant[] };
        if (Array.isArray(body.items) && body.items.length > 0) {
          setMerchants(body.items);
          const selected = body.items.find(
            (merchant) => merchant.merchant_key === queryMerchant,
          );
          if (selected) {
            setMerchantKey(selected.merchant_key);
            setPeriod(inferPeriod(selected, queryFrom, queryTo));
          }
        }
      } catch {
        // The featured M43 option remains available when the API is offline.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [queryFrom, queryMerchant, queryTo]);

  const selectedMerchant = useMemo(
    () =>
      merchants.find((merchant) => merchant.merchant_key === merchantKey) ??
      fallbackMerchant,
    [merchantKey, merchants],
  );
  const activeDates =
    period === "custom"
      ? { from: queryFrom, to: queryTo }
      : periodDates(selectedMerchant, period);

  const apply = () => {
    const query = serializeFilters(
      selectedMerchant.merchant_key,
      activeDates.from,
      activeDates.to,
    );
    startTransition(() => {
      router.replace(`${pathname}?${query}`, { scroll: false });
      setSheetOpen(false);
    });
  };

  const chooseMerchant = (nextMerchantKey: string) => {
    setMerchantKey(nextMerchantKey);
    setPeriod("full");
  };

  const controls = {
    merchants,
    merchantKey,
    period,
    loading,
    pending,
    onMerchantChange: chooseMerchant,
    onPeriodChange: setPeriod,
    onApply: apply,
  };

  return (
    <div className="filter-bar" data-testid="filter-bar">
      <div className="hidden min-w-0 items-end gap-4 lg:flex">
        <FilterControls {...controls} />
        <Badge className="mb-1.5" variant="outline">
          {activeDates.from} — {activeDates.to} · Asia/Tehran
        </Badge>
      </div>
      <div className="flex w-full items-center justify-between gap-3 lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {selectedMerchant.merchant_key} · {selectedMerchant.category_title}
          </p>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {activeDates.from} — {activeDates.to}
          </p>
        </div>
        <Sheet onOpenChange={setSheetOpen} open={sheetOpen}>
          <SheetTrigger asChild>
            <Button aria-label="فیلترها" variant="outline">
              <SlidersHorizontalIcon data-icon="inline-start" />
              فیلترها
              <Badge variant="secondary">۲</Badge>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md" side="bottom">
            <SheetHeader>
              <SheetTitle>فیلترها</SheetTitle>
              <SheetDescription>
                پذیرنده و بازه تحلیل را انتخاب کنید؛ همه عددها و شواهد با همین پارامترها
                بازتولید می‌شوند.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <FilterControls {...controls} compact />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
