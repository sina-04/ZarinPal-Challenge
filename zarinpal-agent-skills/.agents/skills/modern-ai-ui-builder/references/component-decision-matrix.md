# Component Decision Matrix

Use this matrix before creating a new component.

| Product need | Preferred approach | Notes |
|---|---|---|
| Main call to action | shadcn/ui `Button` | Add a custom variant only when existing variants do not fit |
| Text entry | `Input`, `Textarea`, `Label` | Keep labels visible and validation clear |
| KPI summary | `Card`, `Badge`, `Tooltip` | Pair the number with context and comparison |
| Loading KPI | `Skeleton` | Preserve the final card dimensions |
| Desktop navigation | `Sidebar` or navigation patterns | Keep current location visible |
| Mobile navigation | `Sheet` or drawer pattern | Maintain comfortable touch targets |
| Date filter | `Calendar`, `Popover`, `Select` | Show the active period clearly |
| Searchable selection | `Command` plus `Popover` | Use for long option lists |
| Simple option group | `Tabs`, `Toggle Group`, radio group | Select based on semantics |
| Data table | Table/Data Table pattern | Include sorting, filters, pagination only when needed |
| Row actions | Dropdown menu | Avoid hiding the primary action |
| Confirmation | `Alert Dialog` | Use for destructive or irreversible actions |
| Supplemental detail | `Dialog`, `Sheet`, `Collapsible` | Choose based on information depth |
| Status | `Badge`, `Alert`, icon plus text | Do not rely on color alone |
| Form feedback | Inline validation and alert patterns | Keep messages near the field |
| Empty state | Purpose-built composition | Explain what happened and what to do next |
| Error state | Alert plus recovery action | Avoid dead-end messages |
| Theme selection | Theme tokens plus switch/menu | Respect system preference where appropriate |
| Conversation container | AI Elements conversation pattern | Support scroll and streaming behavior |
| Message presentation | AI Elements message pattern | Distinguish role and status |
| Prompt entry | AI Elements prompt-input pattern | Handle send, stop, disabled, and attachment states |
| Sources | AI Elements sources/citations pattern | Keep evidence connected to the claim |
| Tool execution | AI Elements tool-call pattern | Show running, success, and failure |
| Attachment | AI Elements attachment pattern | Validate type, size, and removal behavior |
| Model selection | AI Elements model-selector pattern | Add only when users genuinely need model choice |

## Creation rule

Create a new custom component only when:

1. No suitable project component exists.
2. No suitable shadcn/ui or AI Elements component exists.
3. Composition cannot meet the requirement cleanly.
4. The component represents a reusable product-specific pattern.

Document why a new component was necessary.
