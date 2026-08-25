# Zarin Pulse — Web Application

The Persian RTL merchant-analytics interface is built with the Next.js App
Router, shadcn/ui, ECharts, and AI SDK. Deterministic calculations come from
FastAPI; the analyst explains only validated evidence.

From the repository root, install dependencies and start both services:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

The web application uses port 3000 and the API uses port 8000.

In normal API-connected operation, the pinned official dataset through
`2026-06-30` reports `checksum_status=verified` and
`partial_data=false`. Without the API, only the visibly labeled partial M43
snapshot is available as `deterministic_offline_snapshot`. Without
`OPENAI_API_KEY`, the deterministic local response replaces model-generated
explanation.

Regenerate web API types after changing the FastAPI contract:

```powershell
pnpm --dir apps/web api:schema
```

Build and run the standalone production output:

```powershell
pnpm build
pnpm --dir apps/web prepare:standalone
pnpm --dir apps/web start:standalone
```

`/api/health` returns HTTP 200 only when FastAPI is reachable and DuckDB is
ready. An unavailable upstream or database returns 503. A partial sample can
still be service-ready with `status=degraded`, so confirm complete data by
checking `status`, `source_kind`, and `checksum_status` in the API's
`/healthz` response.
