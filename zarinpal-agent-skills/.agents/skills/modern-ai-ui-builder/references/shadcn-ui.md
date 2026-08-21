# shadcn/ui Reference

## Purpose

shadcn/ui provides ready-made, customizable components for modern product interfaces. Its components are added directly to the project's codebase instead of remaining inaccessible inside a closed package.

This makes shadcn/ui suitable for:

- Dashboards
- Application interfaces
- Forms
- Tables
- Sidebars
- Dialogs
- Navigation
- Themeable design systems
- AI applications built with compatible components

## Typical components

- Button
- Input
- Card
- Dialog
- Dropdown
- Table
- Sidebar
- Tabs
- Form
- Calendar

## Why use it

- Speeds up development.
- Reduces repeated low-level component work.
- Produces a more consistent interface.
- Supports significant customization.
- Works well with Tailwind CSS.
- Supports theme and dark-mode customization.
- Lets developers edit the component source directly.

## Basic setup

Next.js or an existing compatible project:

```bash
pnpm dlx shadcn@latest init
```

or:

```bash
npx shadcn@latest init
```

Vite template:

```bash
pnpm dlx shadcn@latest init -t vite
```

or:

```bash
npx shadcn@latest init -t vite
```

Add components:

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add button card dialog
```

## Customization areas

- Colors
- Border radius
- Typography
- Spacing
- Dark mode
- Component variants
- Theme

Use components as building blocks. Do not leave the product looking identical to default examples.

## Official agent skill

```bash
pnpm dlx skills add shadcn/ui
```

The official skill helps coding agents inspect `components.json`, identify framework and Tailwind configuration, understand aliases and installed components, and use appropriate component patterns.

## Official resources

- Documentation: https://ui.shadcn.com/
- Installation: https://ui.shadcn.com/docs/installation
- Components: https://ui.shadcn.com/docs/components
- CLI: https://ui.shadcn.com/docs/cli
- Theming: https://ui.shadcn.com/docs/theming
- Skills: https://ui.shadcn.com/docs/skills
