# نبض زرین — analytical API

FastAPI + DuckDB service for deterministic, traceable merchant analytics. Source rows are payment attempts; money, final status, and conversion are calculated only after consistency validation at canonical session grain.

## Local setup

```powershell
cd services/api
python -m pip install -r requirements-dev.txt
python -m app.bootstrap --source ../../challenge_data_cleaned.xlsx --database data/analytics.duckdb --json-output artifacts/local-xlsx-manifest.json
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The workbook fallback is streamed to a temporary UTF-8 CSV and bulk-scanned by DuckDB; it does **not** execute one million row-wise inserts. The staging handle is closed before DuckDB opens it and the file is deleted in `finally`, including on Windows.

The repaired local workbook is pinned at 119,901,253 bytes and SHA-256 `34b265c9d9c9fd865a838ed017fd7d62625f6d41ae23bfe7cca59e6a36d82693`. It contains exactly 1,048,575 attempt rows—the Excel ceiling after one header row—so local XLSX/Markdown builds are deliberately marked `partial_data=true`. Their retained rows and M43 aggregates are validated, but only the pinned official CSV.GZ can establish challenge-wide completeness. The official compressed-source hash remains intentionally unset until that currently unreachable object can be downloaded successfully; production URL acquisition refuses a blank `DATASET_SHA256`.

## Validation and tests

From the repository root:

```powershell
python services/api/scripts/validate_dataset.py challenge_data_cleaned.xlsx --json-output services/api/artifacts/data-validation.json --fail-on-errors
python -m pytest services/api/tests
python services/api/scripts/export_openapi.py services/api/artifacts/openapi.json
```

Evidence JSON can be checked with:

```powershell
python services/api/scripts/validate_evidence.py path/to/evidence.json --fail-on-errors
```

## Runtime contract

- `GET /healthz` is always public.
- `GET /api/v1/merchants`
- `GET /api/v1/dashboard?merchant_key=M43&from=2026-01-01&to=2026-02-28`
- `GET /api/v1/insights/{insight_id}/evidence`
- `GET /api/v1/insights/{insight_id}/records?page=1&page_size=25`

When `INTERNAL_API_KEY` is set, every route except `/healthz` requires `X-Internal-API-Key`. Evidence records are restricted to the merchant encoded by the validated insight ID. PSP response codes remain PSP-scoped and receive no invented meaning.

Important environment variables:

| Variable | Behavior |
|---|---|
| `DATABASE_PATH` | DuckDB artifact path; defaults to `services/api/data/analytics.duckdb` |
| `DATASET_PATH` | Explicit CSV, CSV.GZ, XLSX, or cleaned-Markdown source |
| `DATASET_URL` | Official compressed dataset URL |
| `DATASET_SHA256` | Required expected hash for non-demo URL acquisition |
| `INTERNAL_API_KEY` | Enables shared-secret protection |
| `ALLOW_DEMO_FALLBACK` | Defaults to `false`; when explicitly true, permits creation or authorization of the calibrated embedded demo if the full source cannot be used. Docker demo builds map this opt-in to immediate demo materialization. |
| `USE_DEMO_DATA` | Explicitly materializes the calibrated partial demo and bypasses local/full sources |

The health and dashboard metadata disclose `source_kind`, checksum state, and `partial_data`.

## Container builds

The multi-stage image materializes DuckDB before the runtime image is assembled. The runtime artifact is root-owned and read-only. Do not mount a volume over `/app/data`.

Production (requires the real official checksum):

```powershell
docker build -f services/api/Dockerfile services/api --build-arg DATASET_SHA256=<official-sha256>
```

Explicit local/CI demo:

```powershell
docker build -f services/api/Dockerfile services/api --build-arg ALLOW_DEMO_FALLBACK=true
```

Demo data is calibrated to the real published M43/M31/M156 headline aggregates but its row-level paths are synthetic, health is `degraded`, and `partial_data=true`. It cannot be silently reused by a production configuration: startup checks source kind, checksum, and manifest authorization.

## Analytical limitations

- All times use `created_at` interpreted in `Asia/Tehran` for main KPIs.
- `payer_card_key` is scoped to `(merchant_key, payer_card_key)` and never linked across merchants.
- No-attempt rows (`try_seq=0`) are excluded from attempt, PSP, switch-code, and latency denominators.
- API timings are gateway call durations, not customer interaction time.
- Opportunity values are arithmetic scenarios, not forecasts or causal estimates.
- **Adjusted fee is a uniformly transformed analytical value and does not represent ZarinPal's actual tariff.**
