# F00 — Design System & App Foundation

> **Status:** ✅ Verified (2026-06-20)

The visual + structural foundation every frontend phase builds on. Recovered from the repo's original
UI commit and rebuilt on Tailwind v4 + Hugeicons.

## Deliverables

- **Tailwind v4** (`@tailwindcss/postcss`) + `postcss.config.mjs`.
- **`src/app/globals.css`** — design tokens: fire-red palette (`--color-fire-*`), ink scale
  (`--color-ink-*`), fonts (Plus Jakarta Sans / Outfit / JetBrains Mono), `.glass-panel`, `.bg-grid`,
  glow + terminal + scrollbar utilities, fade/pulse animations.
- **Hugeicons** as the single icon system (`@hugeicons/react` + `@hugeicons/core-free-icons`). Every
  icon is chosen for meaning; no hand-rolled SVGs, no decorative filler.
- **Root `layout.tsx`** — global `<html>/<body>`, fonts, metadata, `Providers` (AuthProvider).
- **`@fidscript/ui`** workspace kit (Button, Input, Card, Badge, Modal, Toast, Spinner, EmptyState).
- **Dashboard Dockerfile** builds via `turbo build --filter` so workspace packages compile first.

## Conventions

- App Router, `src/app/`. Public routes at root (`/`, `/docs/*`); app routes under `/dashboard/*`
  (guarded). Login is a separate URL, **not** linked from the public site.
- Server components by default; `'use client'` only for interactivity (forms, copy, drawers).
- 150-line file limit.

## Verification

`pnpm --filter @fidscript/dashboard build` clean; landing + docs render at
`https://deploy.fidscript.com` over HTTPS.
