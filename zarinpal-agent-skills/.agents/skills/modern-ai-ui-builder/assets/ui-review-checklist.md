# UI Review Checklist

## Product hierarchy

- [ ] The primary user goal is obvious.
- [ ] The most important information is visible first.
- [ ] Primary and secondary actions are clearly distinguished.
- [ ] The selected design-system reference is used consistently.

## Component discipline

- [ ] Existing project components were checked first.
- [ ] shadcn/ui components were checked before new primitives were created.
- [ ] AI Elements was used only for genuine AI interactions.
- [ ] No unnecessary UI library was added.
- [ ] Custom components have a documented reason.

## Responsive design

- [ ] Desktop layout works at common widths.
- [ ] Mobile layout is intentionally composed rather than merely shrunk.
- [ ] Navigation remains usable on small screens.
- [ ] Tables, charts, dialogs, and chat content do not overflow.
- [ ] Touch targets are usable.

## Accessibility

- [ ] Semantic elements are used.
- [ ] All controls are keyboard accessible.
- [ ] Focus states are visible.
- [ ] Labels and accessible names are present.
- [ ] Contrast is sufficient.
- [ ] Status is not communicated by color alone.
- [ ] Reduced-motion preferences are respected where relevant.

## States

- [ ] Loading state exists.
- [ ] Empty state exists.
- [ ] Partial-data state exists where relevant.
- [ ] Error state includes a recovery path.
- [ ] Success feedback is clear.
- [ ] Disabled states are understandable.

## Data-heavy interfaces

- [ ] KPIs include context.
- [ ] Financial values use consistent formatting.
- [ ] Tables support the actual user task.
- [ ] Filters clearly show their active state.
- [ ] Charts are understandable without specialist knowledge.

## AI interfaces

- [ ] User, assistant, and tool content are distinct.
- [ ] Streaming state is visible.
- [ ] Users can stop or retry when appropriate.
- [ ] Tool-call states are visible.
- [ ] Sources or citations are presented when claims require evidence.
- [ ] Attachments and model selection appear only when needed.
- [ ] Failures do not leave the interface stuck.
