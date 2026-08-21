import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server-api", () => ({
  getApiBaseUrl: () => "http://api.internal:8000",
}));

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/health", () => {
  it("returns 200 when FastAPI reports a ready database", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          status: "ok",
          database_ready: true,
          source_kind: "cleaned_xlsx",
        }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      database_ready: true,
      upstream_available: true,
    });
  });

  it("returns 200 for an explicit partial-data service with a ready database", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          status: "degraded",
          database_ready: true,
          partial_data: true,
        }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "degraded",
      database_ready: true,
      upstream_available: true,
      partial_data: true,
    });
  });

  it("returns 503 when FastAPI has no ready database", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          status: "degraded",
          database_ready: false,
        }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: "degraded",
      database_ready: false,
      upstream_available: true,
    });
  });

  it("returns 503 with diagnostic JSON when FastAPI is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "degraded",
      database_ready: false,
      upstream_available: false,
      detail: "FastAPI health endpoint is unreachable.",
    });
  });

  it("returns 503 when the upstream health endpoint responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ detail: "Service unavailable" }, { status: 503 }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: "degraded",
      database_ready: false,
      upstream_available: false,
      upstream_status: 503,
    });
  });
});
