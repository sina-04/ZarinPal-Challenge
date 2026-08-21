# ZarinPal Challenge Agent Skills Pack

This package contains three project-specific Agent Skills for the ZarinPal analytical-dashboard challenge, plus an installation manifest for the external skills that should be used with them.

## Included custom skills

1. `zarinpal-data-contract`
   - Enforces the dataset grain and payment lifecycle.
   - Prevents double counting of session-level amounts across payment-attempt rows.
   - Validates status semantics, scoped customer identifiers, missing-value mechanisms, and the confidentiality rule for `adjusted_fee`.
   - Includes a streaming Python dataset validator.

2. `zarinpal-insight-traceability`
   - Defines the evidence contract for every KPI, chart, comparison, recommendation, and AI-generated statement.
   - Requires formulas, filters, grains, source columns, sample sizes, limitations, and reproducible evidence references.
   - Includes JSON templates, a schema, an example, and a Python validator.

3. `modern-ai-ui-builder`
   - Coordinates the Next.js, shadcn/ui, AI Elements, responsive, and accessibility decisions for the merchant dashboard.
   - Includes a stack inspector, component/design-system references, and a UI review checklist.

## Recommended repository layout

Extract or copy this package into the root of your application repository:

```text
<project-root>/
├── .agents/
│   └── skills/
│       ├── zarinpal-data-contract/
│       ├── zarinpal-insight-traceability/
│       └── modern-ai-ui-builder/
├── AGENTS.md
├── install-existing-skills.ps1
├── install-existing-skills.sh
└── external-skills/
    └── EXISTING_SKILLS.md
```

Codex loads project skills from `.agents/skills/`. Other compatible agents can also use the same Agent Skills format, although their preferred local directory may differ.

## Installation

### 1. Install the custom skills

No command is required when the package is extracted at the project root. Confirm that all three files exist:

```text
.agents/skills/zarinpal-data-contract/SKILL.md
.agents/skills/zarinpal-insight-traceability/SKILL.md
.agents/skills/modern-ai-ui-builder/SKILL.md
```

### 2. Install the external skills

Windows PowerShell:

```powershell
./install-existing-skills.ps1
```

Linux, macOS, or Git Bash:

```bash
chmod +x install-existing-skills.sh
./install-existing-skills.sh
```

The scripts install project-scoped copies for Codex by using the open `skills` CLI.

## First commands to run

Validate the dataset:

```bash
python .agents/skills/zarinpal-data-contract/scripts/validate_dataset.py \
  path/to/challenge_data.csv.gz \
  --json-output artifacts/data-validation.json \
  --fail-on-errors
```

Validate an insight evidence file:

```bash
python .agents/skills/zarinpal-insight-traceability/scripts/validate_evidence.py \
  path/to/insight-evidence.json \
  --fail-on-errors
```

## Suggested Codex prompts

```text
Use $zarinpal-data-contract to profile the challenge dataset and define a safe session-level analytical table. Do not calculate revenue directly from attempt rows.
```

```text
Use $zarinpal-insight-traceability to design an evidence drawer for every KPI and actionable recommendation. Validate the generated evidence JSON before implementing the UI.
```

## Scope

These skills define correctness and traceability requirements. They do not replace statistical review, UI testing, or security review. Use the external skills listed in `external-skills/EXISTING_SKILLS.md` for those concerns.
