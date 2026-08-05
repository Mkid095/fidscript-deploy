# Docs Components

Components used by the public `/docs` pages.

## Files

| File | Purpose |
|------|---------|
| `docs-sidebar.tsx` | Sidebar that groups `DOCS` (from `@/content/docs`) by category and highlights the active route via `usePathname()`. |
| `copy-page.tsx` | `CopyPage` — copies the rendered text of `[data-doc-content]` to the clipboard and shows a "Copied" confirmation. |

## Usage

```tsx
// app/docs/layout.tsx
<DocsSidebar onNavigate={() => setMobileOpen(false)} />

// app/docs/[slug]/page.tsx
<article data-doc-content>...</article>
<CopyPage />
```

## Notes
- `DOCS` (categories + slugs + icons) lives in `src/content/docs.ts` — the sidebar is purely a presentational renderer over that data.
- `CopyPage` looks for the single `[data-doc-content]` element on the page.