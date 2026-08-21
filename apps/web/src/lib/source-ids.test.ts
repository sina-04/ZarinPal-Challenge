import { describe, expect, it } from "vitest";

import { extractSourceIds } from "./source-ids";

describe("AI evidence source extraction", () => {
  it("extracts metric identifiers", () => {
    expect(extractSourceIds("نرخ تکمیل [verified_session_rate]")).toEqual([
      "verified_session_rate",
    ]);
  });

  it("extracts full insight identifiers with merchant and date hyphens", () => {
    expect(
      extractSourceIds(
        "ادعا [merchant-M43--verified_session_rate--2026-01-01--2026-02-28]",
      ),
    ).toEqual([
      "merchant-M43--verified_session_rate--2026-01-01--2026-02-28",
    ]);
  });
});
