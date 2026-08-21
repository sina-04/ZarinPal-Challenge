---
name: zarinpal-data-contract
description: Enforce the ZarinPal challenge dataset grain, payment lifecycle, metric aggregation rules, identifier scope, missing-value semantics, and adjusted_fee confidentiality. Use whenever loading, profiling, transforming, querying, modeling, or validating the challenge transaction dataset. Do not use it as a substitute for general statistical or frontend guidance.
---

# ZarinPal Data Contract

## Purpose

Prevent analytically plausible but invalid results caused by confusing payment attempts with payment sessions, misreading lifecycle states, overextending pseudonymous identifiers, or exposing `adjusted_fee` as a real tariff.

Read `references/data-guide-en.md` before writing transformations or metrics. Use `references/metric-grain-guide.md` when choosing an aggregation grain.

## Mandatory invariants

### 1. Source-row grain

A source row is one **payment attempt**. A `session_key` may occur in multiple rows. Session-level fields can therefore be repeated.

Never compute session revenue, verified payment count, adjusted fee totals, merchant GMV, or average session amount by directly aggregating all source rows.

### 2. Safe session table

Before producing one record per `session_key`:

1. Validate that the required session-level columns are consistent inside each session.
2. Report conflicts rather than silently choosing a row.
3. After consistency is established, retain one canonical row per session.
4. Preserve attempt-derived features separately, such as attempt count, final attempt sequence, PSP path, and attempt-status sequence.

At minimum, validate consistency for:

- `terminal_key`
- `merchant_key`
- `category_id`
- `category_title`
- `amount`
- `adjusted_fee`
- `session_status`
- `verify_type`
- `created_at`
- `verified_at`
- `settled_at`
- `expire_in`

### 3. Payment lifecycle

Use these meanings exactly:

- `Verified`: payment completed and merchant verification completed; final successful state.
- `Paid`: buyer card was debited, but merchant verification was not completed.
- `InBank`: user reached the bank gateway, but no result returned.
- `Failed`: unsuccessful attempt/session.
- `Reversed`: funds were reversed.
- `NoAttempt`: valid only for `try_status` when no payment attempt was recorded.

Name metrics precisely. For example:

- `verified_session_rate`: verified sessions divided by eligible sessions.
- `attempt_success_rate`: successful attempts divided by eligible attempts, only if a defensible attempt-level success definition is specified.
- `paid_not_verified_rate`: sessions ending in `Paid` divided by eligible sessions.

Do not label every non-`Verified` session a bank failure.

### 4. `try_seq`

- Positive values number attempts within a session, starting from 1.
- `try_seq = 0` indicates a session with no payment attempt.
- A no-attempt row should not be used in attempt-level PSP, switch-response, bank, or latency denominators.

### 5. Monetary values

- `amount` and `adjusted_fee` are in Iranian rials.
- `adjusted_fee` is uniformly transformed by a confidential fixed multiplier.
- Never state or imply that `adjusted_fee` is ZarinPal's actual fee.
- Relative comparisons, ranks, trends, and ratios using the transformed values remain meaningful within the dataset, provided the limitation is visible.
- Do not convert rials to tomans unless the transformation is explicit, tested, and labeled.

Required wording when displaying `adjusted_fee`:

> Adjusted fee is a uniformly transformed analytical value and does not represent ZarinPal's actual tariff.

### 6. Customer and identifier scope

- All identifiers are pseudonymous.
- `payer_card_key` is unique only **within a merchant**.
- Use `(merchant_key, payer_card_key)` as the customer-within-merchant key.
- Never deduplicate or track the same card across merchants.
- Do not infer real people, companies, banks, or terminals from pseudonymous keys.

### 7. PSP and response codes

- Interpret `switch_response_code` only together with `psp_code` or with the PSP prefix already embedded in the code.
- The mapping from codes to meanings is unavailable.
- It is acceptable to compare frequency, recurrence, concentration, and outcome association by PSP-scoped code.
- Do not assign semantic labels such as “insufficient funds” without an authoritative mapping.

### 8. Missingness

Treat missing values as potentially structural:

- `issuer_bank_code` and `payer_card_key` can be absent because card details never returned from the bank flow.
- `psp_code` and `try_created_at` can be absent when no attempt exists.
- `verified_at` is absent when verification did not occur.
- `settled_at` is absent when settlement did not occur.
- API timing fields can be absent when their stage was not reached.

Profile missingness by lifecycle state before imputing, excluding, or calling it a quality defect.

### 9. Timing fields

- `init_time_ms` and `verify_time_ms` are gateway API durations.
- They are not customer thinking time, checkout duration, or page-interaction time.
- Use robust summaries such as median, p90, and p95 because latency is usually skewed.

## Required workflow

1. **Read the schema reference.** Confirm required fields and timestamp format.
2. **Run the validator.** Use `scripts/validate_dataset.py` and retain its JSON report.
3. **Declare grains.** For every planned metric, state its grain and denominator.
4. **Build canonical layers.** Keep attempt-level and validated session-level tables separate.
5. **Profile concentration.** Quantify merchant/category dominance before global averages.
6. **Profile missingness by state.** Do not rely only on whole-column null percentages.
7. **Test metric reconciliation.** Filtered totals must reconcile across cards, charts, and evidence views.
8. **Document limitations.** Include adjusted-fee wording and unavailable response-code semantics.

## Required outputs from an analysis task

Return or create:

- A grain declaration for each table.
- A data-quality report.
- A session-consistency report.
- Metric definitions with numerator, denominator, exclusions, and units.
- Tests that fail on row duplication, grain mismatch, and invalid status assumptions.
- A list of unresolved data limitations.

## Stop conditions

Stop and report rather than silently continuing when:

- Required columns are absent.
- Session-level fields conflict inside the same `session_key`.
- A requested customer analysis assumes cross-merchant card identity.
- A request requires semantic interpretation of switch codes without a codebook.
- A request asks for ZarinPal's real fee from `adjusted_fee`.
- A proposed metric does not specify whether its denominator is attempts or sessions.

## Validation command

```bash
python scripts/validate_dataset.py path/to/challenge_data.csv.gz \
  --json-output artifacts/data-validation.json \
  --fail-on-errors
```
