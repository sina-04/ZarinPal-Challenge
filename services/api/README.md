# Zarin Pulse — Analytical API

FastAPI + DuckDB service for deterministic, traceable merchant analytics. Source rows are payment attempts; money, final status, and conversion are calculated only after consistency validation at canonical session grain.

## Local setup

Build the complete analytical artifact from a checksum-verified copy of the official source:

```powershell
$officialUrl = "https://startech.s3.ir-thr-at1.arvanstorage.ir/other%2Fchallenge_data.csv.gz?versionId="
$officialSha = "84ac8a28df48ca7baeaf0b1cec563a3f0a3516039f5f62e9bfd11124ca35b461"
Invoke-WebRequest -Uri $officialUrl -OutFile challenge_data.csv.gz
if ((Get-FileHash .\challenge_data.csv.gz -Algorithm SHA256).Hash.ToLowerInvariant() -ne $officialSha) { throw "Dataset checksum mismatch" }
cd services/api
python -m pip install -r requirements-dev.txt
$env:DATASET_SHA256 = $officialSha
python -m app.bootstrap --source ../../challenge_data.csv.gz --database data/analytics.duckdb --json-output artifacts/official-source-manifest.json
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The pinned official CSV.GZ is 61,282,974 bytes with SHA-256 `84ac8a28df48ca7baeaf0b1cec563a3f0a3516039f5f62e9bfd11124ca35b461`. Its verified artifact contains 2,213,289 attempts, 2,062,839 sessions, 396,374 customer-within-merchant keys, and 343 merchants from 2026-01-01 through 2026-06-30. Dataset validation reported zero errors and zero session conflicts, and the artifact records `partial_data=false`.

For an explicitly partial local alternative, replace the source and checksum together:

```powershell
$env:DATASET_SHA256 = "34b265c9d9c9fd865a838ed017fd7d62625f6d41ae23bfe7cca59e6a36d82693"
python -m app.bootstrap --source ../../challenge_data_cleaned.xlsx --database data/analytics.duckdb --json-output artifacts/local-xlsx-manifest.json
```

The workbook alternative is streamed to a temporary UTF-8 CSV and bulk-scanned by DuckDB; it does **not** execute one million row-wise inserts. The staging handle is closed before DuckDB opens it and the file is deleted in `finally`, including on Windows.

The repaired local workbook is pinned at 119,901,253 bytes and SHA-256 `34b265c9d9c9fd865a838ed017fd7d62625f6d41ae23bfe7cca59e6a36d82693`. It contains exactly 1,048,575 attempt rows—the Excel ceiling after one header row—so local XLSX/Markdown builds are deliberately marked `partial_data=true`. Their retained rows and M43 aggregates are validated, but only the pinned official CSV.GZ establishes challenge-wide completeness.

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
| `DATASET_PATH` | Explicit CSV, CSV.GZ, XLSX, or cleaned-Markdown source; nonblank values take precedence over the official URL |
| `DATASET_URL` | Official compressed dataset URL; used by the full build when `DATASET_PATH` is blank and no local fallback is selected |
| `DATASET_SHA256` | Expected source hash; the sample, Compose, Render, and CI pin the verified official digest |
| `INTERNAL_API_KEY` | Enables shared-secret protection |
| `ALLOW_DEMO_FALLBACK` | Defaults to `false`; when explicitly true, permits creation or authorization of the calibrated embedded demo if the full source cannot be used. Docker demo builds map this opt-in to immediate demo materialization. |
| `USE_DEMO_DATA` | Explicitly materializes the calibrated partial demo and bypasses local/full sources |

The health and dashboard metadata disclose `source_kind`, checksum state, and `partial_data`.

## Container builds

The multi-stage image materializes DuckDB before the runtime image is assembled. The runtime artifact is root-owned and read-only. Do not mount a volume over `/app/data`.

Production and CI use the same pinned full-data build:

```powershell
docker build -f services/api/Dockerfile services/api --build-arg ALLOW_DEMO_FALLBACK=false --build-arg DATASET_SHA256=84ac8a28df48ca7baeaf0b1cec563a3f0a3516039f5f62e9bfd11124ca35b461
```

Explicit local demo:

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
