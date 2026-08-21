# Metric Grain Guide

## Grain hierarchy

| Grain | Primary key or grouping | Appropriate uses | Common error |
|---|---|---|---|
| Payment attempt | `(session_key, try_seq)` | Attempt count, retry path, PSP routing, attempt status, switch-code frequency | Treating attempts as independent sales |
| Payment session | `session_key` | Session amount, verified payment count, GMV, final status, verification/settlement timing | Summing repeated amounts across attempts |
| Customer within merchant | `(merchant_key, payer_card_key)` | Repeat purchase, frequency, recency, retention within one merchant | Joining the same card across merchants |
| Terminal | `terminal_key` | Performance of one merchant terminal | Assuming terminal equals merchant |
| Merchant | `merchant_key` | Merchant KPIs, segmentation, peer comparison | Weighting every merchant equally without stating it |
| Category | `category_id` | Peer benchmarks and category seasonality | Allowing dominant merchants to define the benchmark |
| Time period | Explicit period plus underlying grain | Trends, seasonality, period comparison | Counting attempts in one chart and sessions in another |

## Recommended canonical tables

### `attempt_fact`

One row per payment attempt or no-attempt record. Preserve original attempt fields and add validated parsing fields.

Recommended key:

```text
(session_key, try_seq)
```

Check whether the source actually guarantees uniqueness before enforcing it.

### `session_fact`

One row per `session_key`, created only after session-level consistency checks.

Recommended fields:

- Session-level source fields
- `attempt_count`
- `has_attempt`
- `max_try_seq`
- `distinct_psp_count`
- Attempt-status sequence or summarized path
- `is_verified`
- `is_paid_not_verified`
- `time_to_verify_ms`, when timestamps support it
- `time_to_settle_ms`, when timestamps support it

### `merchant_customer_fact`

One row per `(merchant_key, payer_card_key)` after excluding structurally unavailable card identifiers.

Never aggregate a `payer_card_key` across merchants.

## Metric definition template

```text
Metric ID:
Business question:
Grain:
Population:
Numerator:
Denominator:
Filters:
Exclusions:
Null policy:
Time basis:
Unit:
Weighting:
Minimum sample size:
Known limitations:
Reconciliation test:
```

## Benchmarking safeguards

A peer benchmark should state:

- Peer category definition
- Merchant eligibility rules
- Observation window
- Minimum merchant and session counts
- Whether the statistic is merchant-weighted or transaction-weighted
- Robust statistic used, such as median or percentile
- Whether dominant merchants were capped, winsorized, stratified, or separately reported

Do not use a simple category-wide transaction-weighted mean as the only peer benchmark when a small number of merchants dominate volume.
