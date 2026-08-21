---
name: modern-ai-ui-builder
description: Design, implement, and review modern React or Next.js product interfaces using shadcn/ui, Vercel AI SDK, AI Elements, and established design-system patterns. Use for dashboards, admin panels, data-heavy applications, chatbots, AI assistants, component selection, theming, responsive layouts, accessibility, and UI consistency. Do not use for backend-only or non-UI tasks.
---

# Modern AI Product UI Builder

## Objective

Build polished product interfaces quickly by combining:

1. **shadcn/ui** as the default source of editable UI building blocks.
2. **Vercel AI SDK and AI Elements** when the product genuinely contains AI or LLM interactions.
3. **Established design systems** as references for visual hierarchy, interaction patterns, accessibility, and data-heavy workflows.

Do not design every primitive from scratch. Reuse, compose, and customize existing components while preserving a coherent product-specific design language.

## Required supporting skills

When available, use these official skills for library-specific implementation details:

```bash
pnpm dlx skills add shadcn/ui
npx skills add vercel/ai-elements
```

This skill coordinates product decisions. The official shadcn/ui and AI Elements skills remain the authoritative source for their current component APIs and CLI behavior.

## Non-negotiable rules

1. Inspect the existing project before proposing or installing anything.
2. Match the project's framework, package manager, Tailwind version, aliases, icon library, and component conventions.
3. Read `components.json` when present.
4. Prefer existing project components before adding new ones.
5. Prefer shadcn/ui components before creating new low-level primitives.
6. Add only the components required by the current feature.
7. Treat Material Design, Ant Design, Carbon, Fluent 2, and Bootstrap as design references unless the user explicitly requests one of those libraries as the implementation library.
8. Select one primary design-system direction. Do not combine several visual languages indiscriminately.
9. Do not install Ant Design, Material UI, Carbon React, Fluent UI, or Bootstrap merely to copy a visual pattern into a shadcn/ui project.
10. Use AI Elements only when the application contains a meaningful AI workflow.
11. Do not add a chatbot merely because the AI SDK is available.
12. Preserve accessibility, responsive behavior, loading states, error states, empty states, and keyboard operation.
13. Never claim that a component or package is installed until the repository confirms it.
14. Do not invent component names or APIs. Search the installed registry or official documentation first.
15. Keep third-party dependencies minimal.
16. Match the existing code style and architecture.

## Workflow

### Step 1: Inspect the UI stack

Read, when available:

- `package.json`
- Package-manager lockfile
- `components.json`
- Tailwind configuration
- Global CSS and theme variables
- Existing `components/` and `components/ui/`
- Application routes and layouts
- Existing charting and form libraries
- Existing AI SDK or model-provider packages

You may run:

```bash
node .agents/skills/modern-ai-ui-builder/scripts/inspect-ui-stack.mjs
```

Record:

- Framework and version
- React version
- Package manager
- Tailwind version
- Whether shadcn/ui is configured
- Base primitive library
- Aliases
- Icon library
- Installed UI components
- AI SDK and AI Elements dependencies
- Existing theme and dark-mode approach

### Step 2: Classify the product task

Choose the closest primary category:

| Category | Typical needs |
|---|---|
| Analytical dashboard | KPI cards, filters, charts, tables, drill-down, traceability |
| Admin or enterprise panel | Dense forms, tables, workflows, permissions, status handling |
| AI assistant or chatbot | Conversation, messages, prompt input, streaming, sources, tools |
| General product application | Navigation, forms, content, dialogs, responsive layouts |
| Hybrid analytical AI product | Dashboard plus evidence-grounded conversational analysis |

Do not start implementation until the primary user task and information hierarchy are clear.

### Step 3: Choose a design-system reference

Use `references/design-system-selection.md`.

Select one primary reference:

- **Material Design:** consumer-facing or mobile-first products, clear elevation, motion, and broad accessibility guidance.
- **Ant Design:** enterprise applications, admin panels, complex forms, tables, and dense data workflows.
- **IBM Carbon:** enterprise analytics, accessibility, grids, design tokens, and data visualization.
- **Microsoft Fluent 2:** productivity applications, Microsoft-like interaction patterns, icons, motion, and integrated workspaces.
- **Bootstrap 5 Design System:** rapid conventional layouts, familiar patterns, or Figma prototyping.

State the selected reference and why it fits. Translate its principles into the project's own shadcn/ui theme rather than copying its branding.

### Step 4: Write a compact interface brief

Before coding, define:

- Primary user
- Main user goal
- Top three tasks
- Most important information at first glance
- Desktop layout
- Mobile layout
- Navigation model
- Required states: loading, empty, partial, error, success, disabled
- Accessibility constraints
- AI-specific states, when applicable

Keep this brief implementation-oriented.

### Step 5: Map requirements to components

Use `references/component-decision-matrix.md`.

Examples:

| Requirement | Preferred building blocks |
|---|---|
| Primary action | `Button` |
| Text or numeric input | `Input`, `Textarea`, `Label` |
| KPI or summary | `Card`, `Badge`, `Tooltip`, `Skeleton` |
| Desktop navigation | `Sidebar`, `Navigation Menu` |
| Mobile navigation | `Sheet`, `Drawer`, compact navigation |
| Filters | `Select`, `Popover`, `Command`, `Calendar`, `Tabs` |
| Data exploration | `Table` or Data Table pattern, pagination, dropdown actions |
| Confirmation | `Alert Dialog` |
| Secondary detail | `Dialog`, `Sheet`, `Collapsible` |
| Status and feedback | `Alert`, `Progress`, `Skeleton`, toast |
| Theme switching | Theme variables plus a `Switch` or menu action |
| AI conversation | AI Elements conversation and message components |
| AI prompt | AI Elements prompt-input component |
| AI evidence | AI Elements source or citation presentation |
| AI tools | AI Elements tool-call presentation |

Search the current registry before assuming the exact API.

### Step 6: Install only what is needed

Use the repository's existing package manager.

Initialize shadcn/ui only when it is not configured and the user has approved or requested its use:

```bash
pnpm dlx shadcn@latest init
# or
npx shadcn@latest init
```

Add only the selected components:

```bash
pnpm dlx shadcn@latest add button card dialog
# or
npx shadcn@latest add button card dialog
```

For AI Elements:

```bash
npx ai-elements@latest add message
npx ai-elements@latest add conversation
npx ai-elements@latest add prompt-input
npx ai-elements@latest add sources
```

Do not run installation commands blindly. First inspect the project and confirm that the component is required.

### Step 7: Establish the product design language

Customize the selected building blocks through:

- Color tokens
- Typography
- Spacing scale
- Border radius
- Elevation and borders
- Component variants
- Dark mode
- Motion
- Data-visualization conventions
- Focus and interaction states

Rules:

- Use semantic tokens rather than scattered hard-coded colors.
- Maintain sufficient contrast.
- Do not rely on color alone to convey status.
- Use consistent spacing and radius values.
- Use tabular numerals for financial or analytical values.
- Preserve the project's existing theme unless redesign is explicitly requested.
- Do not make the product look like an untouched component-library demo.

### Step 8: Implement responsive composition

Design desktop and mobile intentionally.

For dashboards:

- Keep the main insight visible without horizontal scrolling.
- Convert dense sidebars into a mobile sheet or drawer.
- Stack KPI cards logically.
- Use horizontal scrolling, priority columns, cards, or drill-down for wide tables.
- Keep filters reachable and understandable.
- Avoid shrinking desktop layouts until they become unreadable.

For chat or AI interfaces:

- Keep prompt input reachable on small screens.
- Prevent messages, citations, attachments, and tool outputs from overflowing.
- Handle the software keyboard and viewport height.
- Preserve stop, retry, and error controls.

### Step 9: Apply AI UI only when relevant

Use Vercel AI SDK to simplify model integration, streaming responses, chat state, and tool calling.

Use AI Elements to avoid rebuilding common AI-interface patterns, including:

- Conversations
- User and assistant messages
- Prompt input
- Streaming responses
- Sources and citations
- Tool calls
- Reasoning presentation
- Attachments
- Model selection
- Voice input
- Suggestions

Required AI-product behavior:

1. Clearly distinguish user, model, tool, and system-generated content.
2. Show streaming, waiting, success, stopped, and error states.
3. Present sources or citations when the product makes evidence-based claims.
4. Make tool execution visible when it affects the result.
5. Keep AI explanations secondary to verified product data when building an analytical dashboard.
6. Do not expose secret keys in client-side code.
7. Do not display fabricated source material.
8. Let users retry or recover from failed interactions.

### Step 10: Review quality

Run the checklist in `assets/ui-review-checklist.md`.

At minimum, verify:

- The UI has a clear first-glance hierarchy.
- Existing components were reused where possible.
- New components follow project conventions.
- All controls are keyboard accessible.
- Focus states are visible.
- Mobile and desktop layouts both work.
- Loading, empty, partial, error, and success states exist.
- Tables and charts remain understandable.
- Financial and analytical values are formatted consistently.
- AI streaming and tool states are handled.
- Sources are readable when present.
- No unnecessary library was added.
- No component was recreated without a documented reason.

### Step 11: Report the implementation

At completion, report:

1. Chosen design-system reference and rationale.
2. Existing components reused.
3. New components installed.
4. Custom components created and why they were necessary.
5. Theme or token changes.
6. AI SDK or AI Elements features used.
7. Responsive behavior implemented.
8. Accessibility checks completed.
9. Files changed.
10. Commands required to run and test the result.

## Boundaries

Do not use this skill for:

- Backend-only APIs
- Data modelling without a UI
- Infrastructure-only tasks
- Native mobile applications that do not use the relevant web stack
- Graphic design tasks with no application interface
- Adding an AI chat feature without a user or product need

## Reference files

- `references/shadcn-ui.md`
- `references/vercel-ai-sdk-and-elements.md`
- `references/design-system-selection.md`
- `references/component-decision-matrix.md`
