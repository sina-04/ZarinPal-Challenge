$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required."
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "npx is required."
}

npx skills add shadcn/ui `
  --skill shadcn `
  -a codex --copy -y

npx skills add vercel/ai-elements `
  --skill ai-elements `
  -a codex --copy -y

npx skills add vercel-labs/agent-skills `
  --skill vercel-react-best-practices `
  --skill web-design-guidelines `
  -a codex --copy -y

npx skills add anthropics/skills `
  --skill frontend-design `
  -a codex --copy -y

npx skills add kylezantos/responsive-craft `
  -a codex --copy -y

npx skills add NTCoding/claude-skillz `
  --skill data-visualization `
  -a codex --copy -y

npx skills add borghei/Claude-Skills `
  --skill data-analyst `
  --skill data-scientist `
  --skill business-intelligence `
  -a codex --copy -y

npx skills add testdino-hq/playwright-skill `
  -a codex --copy -y

npx skills list
