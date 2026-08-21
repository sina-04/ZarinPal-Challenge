---
name: zarinpal-insight-traceability
description: Make every ZarinPal dashboard KPI, chart, benchmark, recommendation, alert, model output, and LLM-generated claim reproducible and inspectable. Use when defining metrics, building evidence APIs or UI drawers, generating insights, reviewing analytical claims, or preparing the demo. Do not use for raw dataset-grain validation; pair it with zarinpal-data-contract.
---

# ZarinPal Insight Traceability

## Purpose

Turn analytical outputs into auditable product features. A merchant or judge must be able to inspect how a result was calculated without reading source code or manually interpreting raw data.

Read:

- `references/evidence-contract.md`
- `assets/insight-evidence.schema.json`
- `assets/example-insight-evidence.json`

Use `scripts/validate_evidence.py` before considering an insight complete.

## Core rule

No user-visible analytical claim exists without an evidence record.

This includes:

- KPI cards
- Chart annotations and summaries
- Trend statements
- Peer benchmarks
- Segment labels
- Alerts and anomaly statements
- Forecasts and model scores
- Recommendations
- AI or LLM responses

## Evidence layers

### Layer 1: Headline

Communicate the result for a non-technical merchant:

- Specific number
- Direction and magnitude
- Relevant comparison
- Time period
- Concise business meaning

Bad:

> Sales changed this month.

Better:

> Verified revenue fell 12.4% versus the previous 30 days, mainly because repeat-customer revenue declined by 18.1%.

### Layer 2: Action

A recommendation must specify:

- `action`: what the merchant can do
- `trigger`: the numerical condition supporting the action
- `expected_mechanism`: why the action is relevant
- `priority`: impact/urgency classification
- `confidence`: evidence-strength label, not invented probability
- `measurement_plan`: how to know whether the action worked

Do not claim a guaranteed causal effect from observational data.

### Layer 3: Calculation

Expose in the UI:

- Metric definition
- Formula
- Unit of analysis
- Numerator and denominator
- Filters and exclusions
- Null handling
- Date range and timezone
- Comparison basis
- Sample size
- Weighting method
- Source columns
- Data freshness

### Layer 4: Reproduction

Provide at least one reproducible reference:

- Stable query ID plus parameter values
- Versioned SQL or transformation file
- Materialized aggregate artifact
- API endpoint returning the evidence rows or aggregates
- Notebook/script path plus committed revision

Do not embed full sensitive datasets in client-side evidence payloads.

### Layer 5: Limitations

State relevant limitations, including:

- Attempt-versus-session grain
- Missingness mechanisms
- Small sample size
- Merchant/category concentration
- Skew and outliers
- Comparison-group definition
- Confounding variables
- Forecast uncertainty
- `adjusted_fee` confidentiality
- Unavailable switch-code semantics

## Required evidence fields

Every evidence object must include:

- `schema_version`
- `insight_id`
- `metric_id`
- `title`
- `statement`
- `insight_type`
- `value`
- `unit`
- `grain`
- `population`
- `formula`
- `source_columns`
- `filters`
- `exclusions`
- `null_policy`
- `date_range`
- `timezone`
- `sample_size`
- `comparison`
- `weighting`
- `minimum_sample_rule`
- `calculation_version`
- `reproduction`
- `limitations`
- `generated_at`

Actionable recommendations must additionally include `recommendation`.

Model-based outputs must additionally include `model_evidence`.

## Grain requirements

Use only one declared primary grain per metric:

- `attempt`
- `session`
- `customer_within_merchant`
- `terminal`
- `merchant`
- `category`
- `time_period`

If a calculation crosses grains, document each transformation explicitly. For example, first aggregate sessions into merchant-month metrics, then compare merchants using merchant-weighted medians.

## Comparison requirements

A comparison object must declare:

- Type: previous period, previous year, peer group, target, baseline, or none
- Comparison value
- Absolute difference
- Relative difference when mathematically valid
- Peer/group definition
- Weighting method
- Eligibility criteria

Never show percent change when the baseline is zero. Use an absolute change or a clearly defined alternative.

## Statistical and model claims

For hypothesis tests, include:

- Null and alternative hypotheses
- Test name
- Effect size
- Confidence interval
- P-value, when used
- Multiple-testing adjustment, when relevant
- Assumption checks

For predictions, include:

- Target and horizon
- Training window
- Validation design
- Baseline model
- Error metric
- Prediction interval or uncertainty representation
- Model version
- Feature availability at prediction time

Do not let an LLM calculate authoritative metrics from raw rows. The LLM may explain deterministic, versioned analytical outputs.

## UI contract

Every insight component should provide a visible control such as:

```text
How was this calculated?
```

The detail view should include tabs or sections for:

1. Definition
2. Calculation
3. Data scope
4. Comparison
5. Evidence
6. Limitations

Recommended API shape:

```text
GET /api/insights/{insight_id}/evidence
```

The API should return the validated evidence object and authorized aggregate evidence, not unrestricted raw data.

## Workflow

1. Define the business decision.
2. Register the metric before implementing the card or chart.
3. Calculate the metric in a deterministic analytical layer.
4. Generate the evidence object from the same calculation.
5. Validate it with `validate_evidence.py`.
6. Render the headline and action from validated fields.
7. Link the UI detail view to the reproduction reference.
8. Add reconciliation and filter-state tests.
9. For AI explanations, restrict context to validated evidence objects.

## Definition of done

An insight is complete only when:

- Its number reconciles with its evidence.
- Its grain and denominator are explicit.
- Its formula can be reproduced.
- Its limitations are visible.
- Its action is numerically triggered and measurable.
- Its mobile and desktop evidence views are usable.
- The validator passes.

## Validation command

```bash
python scripts/validate_evidence.py path/to/insight-evidence.json --fail-on-errors
```
