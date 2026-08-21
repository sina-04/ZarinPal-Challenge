export const formatInteger = (value: number) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);

export const formatPercent = (value: number, digits = 1) =>
  new Intl.NumberFormat("fa-IR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

export const formatIrr = (value: number, compact = false) =>
  `${new Intl.NumberFormat("fa-IR", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value)} ریال`;

export const formatKpi = (value: number | null, unit: string) => {
  if (value == null) return "ناموجود";
  if (unit === "IRR") return formatIrr(value, true);
  if (unit === "ratio") return formatPercent(value);
  return formatInteger(value);
};

export const formatSignedPercent = (value?: number | null) => {
  if (value == null) return "بدون مقایسه";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fa-IR", { style: "percent", maximumFractionDigits: 1 }).format(value)}`;
};

export const serializeFilters = (merchantKey: string, from: string, to: string) =>
  new URLSearchParams({ merchant_key: merchantKey, from, to }).toString();
