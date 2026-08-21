# Insight Evidence Contract

## Design objective

The evidence contract is the boundary between analytical computation, UI presentation, and AI explanation. All three layers must use the same metric and evidence identifiers.

## Recommended data flow

```text
Validated attempt/session layers
        ↓
Versioned metric computation
        ↓
Metric value + evidence object
        ↓
API response
        ↓
Dashboard headline / chart / evidence drawer
        ↓
Optional LLM explanation grounded only in evidence objects
```

## Metric registry

Create one version-controlled record per metric. Use `assets/metric-registry.template.json` as the starting point.

Required registry properties:

- Stable `metric_id`
- Human-readable name and description
- Business question and decision
- Grain
- Formula
- Numerator and denominator
- Source columns
- Filters and exclusions
- Null policy
- Unit and currency
- Weighting
- Minimum sample rule
- Owner
- Version
- Test references

## Evidence object lifecycle

1. The analytical layer calculates a value.
2. The same function or query emits the parameters used.
3. A deterministic builder creates the evidence object.
4. Validation rejects missing or contradictory metadata.
5. The evidence object is stored or returned with a stable `insight_id`.
6. The frontend displays the headline and exposes the details.
7. Tests compare displayed values with evidence values.

## Reproduction strategies

Choose one primary strategy:

### Query registry

Store versioned SQL or transformation definitions. Evidence contains a stable query ID and parameter values.

### Materialized aggregate

Persist a small aggregate table or JSON/Parquet artifact with a version/hash. Evidence points to the artifact and row key.

### Analytical function registry

Use versioned Python/TypeScript functions. Evidence contains function/module path, git revision, and input parameter hash.

A notebook alone is not sufficient unless it is deterministic, committed, executable, and connected to the production calculation.

## Evidence exposure and privacy

The merchant should be able to inspect the calculation without seeing other merchants' raw records.

Preferred evidence exposure:

- Aggregated numerator and denominator
- Peer distribution percentiles
- Merchant's own authorized records
- Sanitized example calculations
- Query/formula metadata

Avoid:

- Other merchants' row-level data
- Reversible pseudonym mappings
- Unbounded client-side downloads
- Cross-merchant customer identifiers

## Recommendation strength labels

Use explicit qualitative labels based on a documented rubric, for example:

- `exploratory`: weak or early pattern; do not automate action
- `supported`: stable descriptive or inferential evidence; suitable for testing an action
- `strong`: repeated, robust, adequately powered evidence with relevant controls

Do not convert these labels into fake numerical probabilities.

## AI grounding

An LLM explanation must receive:

- Validated evidence objects
- Allowed wording for limitations
- Metric glossary
- User's authorized filter state

It must not receive unrestricted peer raw data or invent missing causal explanations.

Every AI answer should return the `insight_id` or `metric_id` for each factual claim.
