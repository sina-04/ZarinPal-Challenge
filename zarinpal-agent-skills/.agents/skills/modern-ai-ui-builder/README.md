# Modern AI UI Builder Skill

A repo-scoped Codex and agent-compatible skill that combines:

- shadcn/ui component selection, composition, and customization
- Vercel AI SDK and AI Elements interface patterns
- Material Design, Ant Design, IBM Carbon, Fluent 2, and Bootstrap reference guidance

## Install in a repository

Copy the skill folder to:

```text
<repository>/.agents/skills/modern-ai-ui-builder/
```

The downloadable archive already contains that directory structure. Extract it into the repository root.

Codex scans `.agents/skills` automatically. Restart Codex only if the skill does not appear.

## Invoke

In Codex, select or mention:

```text
$modern-ai-ui-builder
```

Example:

```text
$modern-ai-ui-builder Design and implement a responsive analytical dashboard
with a sidebar, KPI cards, date and category filters, a transaction table,
dark mode, and an evidence-grounded AI assistant.
```

## Optional official companion skills

```bash
pnpm dlx skills add shadcn/ui
npx skills add vercel/ai-elements
```

The official skills provide current library-specific API guidance. This custom skill coordinates product design and implementation decisions across those technologies.

## Inspect a project

```bash
node .agents/skills/modern-ai-ui-builder/scripts/inspect-ui-stack.mjs
```

## Contents

```text
.agents/skills/modern-ai-ui-builder/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   └── ui-review-checklist.md
├── references/
│   ├── component-decision-matrix.md
│   ├── design-system-selection.md
│   ├── shadcn-ui.md
│   └── vercel-ai-sdk-and-elements.md
└── scripts/
    └── inspect-ui-stack.mjs
```
