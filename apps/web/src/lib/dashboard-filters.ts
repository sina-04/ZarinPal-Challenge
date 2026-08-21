export type DashboardFilters = {
  merchant_key: string;
  from: string;
  to: string;
};

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  merchant_key: "M43",
  from: "2026-01-01",
  to: "2026-02-28",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MERCHANT_KEY = /^[A-Za-z0-9_]{1,64}$/;

export class InvalidDashboardFiltersError extends Error {
  constructor() {
    super("Dashboard filters are invalid.");
    this.name = "InvalidDashboardFiltersError";
  }
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function dashboardFiltersFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): DashboardFilters {
  const merchant = first(searchParams.merchant_key);
  const from = first(searchParams.from);
  const to = first(searchParams.to);
  const candidate = {
    merchant_key: merchant ?? DEFAULT_DASHBOARD_FILTERS.merchant_key,
    from: from ?? DEFAULT_DASHBOARD_FILTERS.from,
    to: to ?? DEFAULT_DASHBOARD_FILTERS.to,
  };

  if (
    !MERCHANT_KEY.test(candidate.merchant_key) ||
    !ISO_DATE.test(candidate.from) ||
    !ISO_DATE.test(candidate.to) ||
    candidate.from > candidate.to
  ) {
    throw new InvalidDashboardFiltersError();
  }
  return candidate;
}

export function areDefaultFilters(filters: DashboardFilters) {
  return (
    filters.merchant_key === DEFAULT_DASHBOARD_FILTERS.merchant_key &&
    filters.from === DEFAULT_DASHBOARD_FILTERS.from &&
    filters.to === DEFAULT_DASHBOARD_FILTERS.to
  );
}
