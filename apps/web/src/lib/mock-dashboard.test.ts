import { describe, expect, it } from "vitest";

import { MOCK_DASHBOARD, MOCK_EVIDENCE_RECORDS } from "./mock-dashboard";

describe("deterministic offline evidence snapshot", () => {
  it("reconciles lifecycle and revenue totals", () => {
    expect(MOCK_DASHBOARD.lifecycle.stages[0].count).toBe(29_483);
    expect(MOCK_DASHBOARD.lifecycle.stages.at(-1)?.count).toBe(20_340);
    expect(
      MOCK_DASHBOARD.trend.reduce(
        (total, point) => total + point.verified_revenue,
        0,
      ),
    ).toBe(23_448_530_700);
  });

  it("uses the validated peer result without fabricating upside", () => {
    expect(MOCK_DASHBOARD.peer.peer_count).toBe(21);
    expect(MOCK_DASHBOARD.peer.peer_median_rate).toBeCloseTo(0.6147798742);
    expect(MOCK_DASHBOARD.opportunity.value).toBe(0);
  });

  it("keeps only supplied repaired-source trace rows", () => {
    expect(MOCK_EVIDENCE_RECORDS.map((record) => record.session_key)).toEqual([
      "1223158",
      "1266911",
      "1913990",
    ]);
  });
});
