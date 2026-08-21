# ZarinPal Challenge Project Instructions

## Non-negotiable data rules

- Treat each source row as a **payment attempt**, not automatically as a unique payment session or successful transaction.
- Validate that session-level columns are constant within `session_key` before deduplicating.
- Calculate session-level money metrics from one validated record per session, not by summing attempt rows.
- Treat `session_status = Verified` as the final completed-payment state unless a metric explicitly studies another lifecycle stage.
- Never describe `adjusted_fee` as ZarinPal's actual fee. It is uniformly transformed by an undisclosed fixed multiplier.
- Treat `payer_card_key` as unique only inside a merchant. Customer identity is scoped by `(merchant_key, payer_card_key)`.
- Analyze `switch_response_code` only together with its PSP context. The code dictionary is unavailable.
- Do not call structurally missing card/bank fields random data-quality defects without testing the payment-lifecycle explanation.
- `init_time_ms` and `verify_time_ms` measure API response duration, not user interaction time.

## Analytical quality

- Define the business decision before selecting a chart or model.
- Separate descriptive facts, statistical inferences, predictions, and recommendations.
- State the unit of analysis for every calculation: attempt, session, merchant, category, customer-within-merchant, or time period.
- Use merchant/category comparisons only with adequate sample sizes and robust summaries; report concentration and skew.
- Control or stratify for merchant size, category, seasonality, amount distribution, and observation-window differences when they can confound a comparison.
- Do not present correlation as causation.

## Traceability

- Every user-visible KPI, insight, alert, benchmark, and AI-generated claim must have an evidence record.
- Evidence records must include formula, grain, source columns, filters, exclusions, date range, sample size, null policy, comparison basis, limitations, and a reproducible query or artifact reference.
- The interface must expose a visible “How was this calculated?” or equivalent control.
- Recommendations must include a numerical trigger, a proposed action, and the evidence supporting both.

## Product requirements

- Optimize for non-technical merchants: state the conclusion first, then the supporting chart and calculation.
- Support both desktop and mobile layouts.
- Use Iranian rials for monetary labels unless an explicitly documented display conversion is applied.
- Preserve privacy: all identifiers are pseudonymous and must not be presented as real identities.
- The repository must include setup instructions and a deterministic demo path.

## Verification

Before declaring a feature complete:

1. Run the dataset validator.
2. Validate evidence records.
3. Run unit tests for metric definitions.
4. Run Playwright tests at mobile and desktop breakpoints.
5. Confirm that totals reconcile after filters and drill-downs.
