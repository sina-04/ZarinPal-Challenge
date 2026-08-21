# Vercel AI SDK and AI Elements Reference

## Vercel AI SDK

Vercel AI SDK is a toolkit for building AI and LLM applications, especially with React and Next.js.

It simplifies:

- Frontend-to-model integration
- Streaming responses
- Chat state
- Tool calling
- Multiple model and provider integrations
- Agentic interaction patterns

Official documentation:

https://ai-sdk.dev/

## AI Elements

AI Elements provides ready-made UI building blocks for AI applications. It is based on shadcn/ui conventions and adds component source code to the project.

Useful patterns include:

- Chat and conversation
- User and AI messages
- Prompt input
- Streaming responses
- Sources and citations
- Tool calls
- Reasoning presentation
- Attachments
- Model selection
- Voice input
- Suggestions and prompts

## Why use it

- Reduces time spent building chat infrastructure.
- Provides a cleaner and more consistent AI interface.
- Supports streaming and status-aware UI patterns.
- Integrates with AI SDK and shadcn/ui.
- Keeps components customizable within the codebase.

## Adding components

```bash
npx ai-elements@latest add message
npx ai-elements@latest add conversation
npx ai-elements@latest add prompt-input
npx ai-elements@latest add sources
```

Search current documentation before assuming the exact component API.

## Official agent skill

```bash
npx skills add vercel/ai-elements
```

The official skill provides procedural guidance for:

- Installing and using AI Elements
- Composable component patterns
- AI SDK integration
- shadcn/ui theming
- Troubleshooting

## Official resources

- AI SDK: https://ai-sdk.dev/
- AI Elements: https://elements.ai-sdk.dev/docs
- Components: https://elements.ai-sdk.dev/components
- Skill: https://elements.ai-sdk.dev/docs/skill
