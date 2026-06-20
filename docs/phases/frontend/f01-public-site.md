# F01 — Public Site (Landing + Docs)

> **Status:** ✅ Verified (2026-06-20)

The project's public face at `deploy.fidscript.com`. **Installed users get the dashboard, not this** —
the public site is purely informational (intro, docs, changelog). It carries **no auth links**; the
login/dashboard is a separate URL concern.

## Deliverables

### Landing (`/`)
- Hero with the **install command** (`curl -sSL https://deploy.fidscript.com/install.sh | bash`,
  copy-to-clipboard) + **Ubuntu 22.04/24.04** recommendation.
- Features grid (11 services, each with a meaningful Hugeicon).
- Open-source / sovereignty pitch.
- **NextMavens** attribution in the footer.
- Source link → `https://github.com/Mkid095/fidscript-deploy`.

### Docs (`/docs/*`)
- Sidebar layout grouped **Get Started / Build / Reference**, mobile drawer.
- **Content area scrolls independently** of the sidebar (root `h-screen` + per-region `overflow-y-auto`).
- Per-page **"Copy page"** button (copies the rendered doc text).
- Content hardcoded in `src/content/docs.tsx` (DB-backed later). **Content depth is intentionally
  light for now** — richer docs are a later pass; this phase delivered the UI.

## Files

- `src/components/landing/*` (nav, hero, features, opensource, footer, copy-command)
- `src/components/docs/*` (sidebar, copy-page)
- `src/content/docs.tsx`, `src/app/docs/{layout,page,[slug]/page}.tsx`

## Verification

`https://deploy.fidscript.com` serves the new landing; `/docs/getting-started` serves docs; both over
HTTPS (Let's Encrypt, auto-managed by Traefik ACME).
