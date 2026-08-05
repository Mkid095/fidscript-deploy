# Theme Components

Theme switcher and FOUC-prevention script.

## Files

| File | Purpose |
|------|---------|
| `theme-init-script.tsx` | Inline `<script>` injected into `<head>` to set `data-theme` before paint (avoids flash of incorrect theme). |
| `theme-toggle.tsx` | Pill button that cycles through `system → light → dark → system`. |

## Usage
```tsx
// app/layout.tsx
<ThemeInitScript />
...
<body>
  <ThemeToggle />
</body>
```

## Conventions
- Theme tokens live as CSS variables in `@fidscript/ui` (`--surface-*`, `--text-*`, `--accent`, `--danger`, `--success`, `--warning`, `--rail*`).
- `ThemeInitScript` reads `localStorage.theme` and `prefers-color-scheme`.