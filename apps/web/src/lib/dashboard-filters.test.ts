import { describe, expect, it } from "vitest";

import {
  dashboardFiltersFromSearchParams,
  DEFAULT_DASHBOARD_FILTERS,
} from "./dashboard-filters";

describe("dashboard filter reconciliation", () => {
  it("accepts an authorized merchant/date selection", () => {
    expect(
      dashboardFiltersFromSearchParams({
        merchant_key: "M77",
        from: "2026-01-15",
        to: "2026-02-13",
      }),
    ).toEqual({
      merchant_key: "M77",
      from: "2026-01-15",
      to: "2026-02-13",
    });
  });

  it("rejects malformed input instead of leaking the default merchant", () => {
    expect(() =>
      dashboardFiltersFromSearchParams({
        merchant_key: "../M43",
        from: "2026-02-28",
        to: "2026-01-01",
      }),
    ).toThrow("Dashboard filters are invalid.");
  });

  it("uses the deterministic default only when filters are absent", () => {
    expect(dashboardFiltersFromSearchParams({})).toEqual(DEFAULT_DASHBOARD_FILTERS);
  });
});
