# Existing Skills to Install

The following skills already exist and complement the two custom ZarinPal skills. Install them at project scope for Codex, then commit only the files and licenses that their terms allow.

## Recommended core set

| Priority | Skill | Source | Direct skill file | Why it is needed |
|---:|---|---|---|---|
| 1 | Vercel React Best Practices | https://github.com/vercel-labs/agent-skills | https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md | Next.js/React performance, data fetching, bundle size, rendering, and waterfall prevention |
| 2 | Web Design Guidelines | https://github.com/vercel-labs/agent-skills | https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md | Accessibility, forms, navigation state, localization, touch behavior, and UX review |
| 3 | Frontend Design | https://github.com/anthropics/skills | https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md | Intentional visual direction and avoidance of generic dashboard design |
| 4 | Responsive Craft | https://github.com/kylezantos/responsive-craft | https://github.com/kylezantos/responsive-craft/blob/main/SKILL.md | Mobile/desktop dashboard behavior, responsive tables, sticky regions, and breakpoint preview |
| 5 | Data Visualization | https://github.com/NTCoding/claude-skillz | https://github.com/NTCoding/claude-skillz/blob/main/data-visualization/SKILL.md | Chart selection, perceptual accuracy, accessibility, Recharts/D3 guidance, and rendering scale |
| 6 | Data Analyst | https://github.com/borghei/Claude-Skills | https://github.com/borghei/Claude-Skills/blob/main/data-analytics/data-analyst/SKILL.md | EDA, cohort/funnel analysis, statistical testing, and actionable business recommendations |
| 7 | Data Scientist | https://github.com/borghei/Claude-Skills | https://github.com/borghei/Claude-Skills/blob/main/data-analytics/data-scientist/SKILL.md | Segmentation, hypothesis testing, predictive modeling, evaluation, and confounder-aware analysis |
| 8 | Business Intelligence | https://github.com/borghei/Claude-Skills | https://github.com/borghei/Claude-Skills/blob/main/data-analytics/business-intelligence/SKILL.md | KPI registry, dashboard information architecture, reporting, and decision-oriented narratives |
| 9 | Playwright Skill | https://github.com/testdino-hq/playwright-skill | https://github.com/testdino-hq/playwright-skill/blob/main/SKILL.md | E2E, responsive, visual, accessibility, API, trace, and CI testing |

## Installation commands

```bash
npx skills add vercel-labs/agent-skills \
  --skill vercel-react-best-practices \
  --skill web-design-guidelines \
  -a codex --copy -y

npx skills add anthropics/skills \
  --skill frontend-design \
  -a codex --copy -y

npx skills add kylezantos/responsive-craft \
  -a codex --copy -y

npx skills add NTCoding/claude-skillz \
  --skill data-visualization \
  -a codex --copy -y

npx skills add borghei/Claude-Skills \
  --skill data-analyst \
  --skill data-scientist \
  --skill business-intelligence \
  -a codex --copy -y

npx skills add testdino-hq/playwright-skill \
  -a codex --copy -y
```

## Licensing and security notes

- Review each repository's license before redistribution or modification.
- Inspect every installed `SKILL.md`, script, hook, and network-fetch instruction before use.
- Prefer project-scoped installation so the competition repository captures the exact configuration.
- Pin repository revisions for a reproducible final submission.
- Do not allow a third-party skill to upload the challenge dataset or expose raw peer-merchant records.
- `web-design-guidelines` may retrieve current guideline content from an external source during use; pin or vendor a reviewed revision if deterministic behavior is required.

## Deliberately excluded

- Generic SaaS dashboard generators: too broad and likely to create decorative rather than analytically valid output.
- Additional web-app testing skills: Playwright already covers the required testing surface and avoids duplicate routing.
- MLOps skills: unnecessary unless a production model-training and monitoring pipeline is actually implemented.
- Generic chatbot skills: use only after deterministic metrics and evidence objects exist.
