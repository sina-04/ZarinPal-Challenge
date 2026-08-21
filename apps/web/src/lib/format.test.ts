import { describe, expect, it } from "vitest";

import {
  formatInteger,
  formatKpi,
  formatPercent,
  serializeFilters,
} from "./format";

describe("Persian analytical formatting", () => {
  it("formats ratios as Persian percentages", () => {
    expect(formatPercent(0.6898890886)).toBe("۶۹٫۰٪");
  });

  it("formats integers with Persian grouping", () => {
    expect(formatInteger(29_483)).toBe("۲۹٬۴۸۳");
  });

  it("renders a missing KPI honestly", () => {
    expect(formatKpi(null, "IRR")).toBe("ناموجود");
  });

  it("serializes the traceable filter contract", () => {
    expect(serializeFilters("M43", "2026-01-01", "2026-02-28")).toBe(
      "merchant_key=M43&from=2026-01-01&to=2026-02-28",
    );
  });
});
