# Landing Components

Static presentational pieces for the public landing page (`/`).

## Files

| File | Purpose |
|------|---------|
| `landing-nav.tsx` | Sticky top nav: logo + Features / Docs / Open Source links + GitHub CTA. |
| `landing-hero.tsx` | Hero — headline, sub-headline, install command, CTA buttons, 4 stat tiles. |
| `copy-command.tsx` | Install-command pill with copy button (`curl … install.sh | bash`). |
| `landing-features.tsx` | 12-card grid of services (each one tied to a real backend service). |
| `landing-opensource.tsx` | "Open source" pillars (Open source / Your data / No lock-in). |
| `landing-footer.tsx` | Footer with link columns + brand + GitHub. |

## Conventions
- Pure presentational. No hooks for SDK calls.
- All copy is part of the brand voice from `docs/product/platform-philosophy.md` — every feature card describes a real backend service (no aspirational mock).