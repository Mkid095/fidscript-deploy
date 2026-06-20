# F01 — Public Site (Landing + Docs) (full spec)

> **Status:** ✅ Verified (2026-06-20) · spec upgraded to 16 sections. Live at
> `https://deploy.fidscript.com` over HTTPS (Let's Encrypt cert, auto-managed by Traefik ACME).
> **Connects to:** no backend modules. Pure frontend, hardcoded content.
> **Critical constraint:** **no login links.** Login/dashboard is a separate URL concern (F02/F04).
> Installed users get the dashboard, not this site.

## 1. Purpose
The project's public face. Tells a curious visitor what FIDScript is, shows the install command,
links to docs. It does **not** onboard an existing user, does **not** show their data, and does
**not** link to login.

## 2. Business Goal
Beat the install simplicity of Coolify and CapRover: one `curl … | bash` and you have a
production-grade backend platform. Convert curious → install, in one screen.

## 3. Personas
- **Prospective self-hoster** (primary) — heard about FIDScript, evaluating whether to try it.
- **Contributor / evaluator** — developer reading the OSS story.
- **Returning visitor** — already installed, came back to re-read docs.

**Not a persona for this site:** logged-in users. They go directly to their dashboard URL.

## 4. Complete User Journey
```
Search → land on https://deploy.fidscript.com
  → read hero ("Self-Hosted Developer Operating System", install command)
  → copy install command → paste in VPS terminal → installer runs → ...
  → click "Read the docs" → /docs → read Getting Started + Installation
  → maybe click "View source" → github.com/Mkid095/fidscript-deploy
Error / alternate paths:
  → install fails → user reads /docs/getting-started + /docs/installation for troubleshooting.
  → user has no domain yet → /docs/getting-started shows IP-fallback URL path.
```

## 5. Information Architecture
- `/` → Landing (hero + features + opensource + footer).
- `/docs` → redirect to the first doc (Getting Started).
- `/docs/[slug]` → a doc page (sidebar + content + copy).
- **No** `/login`, `/register`, `/dashboard`, `/app`, `/account` from anywhere on this site.
- **No** nav links to the dashboard from the landing.
- The nav links to: Features (in-page anchor `#features`), Docs (`/docs`), Open Source
  (`#opensource` in-page), and the GitHub Source link.
- The footer links to: Platform / Resources / Project section labels (anchor to the
  landing sections + docs + source).

## 6. Screen Specifications
- **`/`** — Landing. Sections:
  - **Hero** (`<LandingHero>`): pill ("Transform any clean VPS into a private application cloud"),
    H1 ("Self-Hosted Developer / Operating System" with fire-red gradient on the second line),
    subhead, **install command with copy button**, Ubuntu recommendation, primary CTA "Read the docs"
    → `/docs`, secondary CTA "View source" → GitHub, 4-card metrics row
    (Services / Runtime cost / Vendor lock-in / License).
  - **Features grid** (`<LandingFeatures>`): 12 cards, one per service (Deployments, Databases,
    Functions, Realtime, Queues, Scheduler, Email, Storage, Auth, MCP & SDK, Domains & TLS,
    Monitoring). Each with a meaningful Hugeicon + 1-line description.
  - **Open source** (`<LandingOpenSource>`): 3 pillars (Open source, Your data your box, No lock-in)
    + final CTA "Read the installation guide" → `/docs/installation`.
  - **Footer** (`<LandingFooter>`): brand + 4 link columns (Platform / Resources / Project +
    GitHub) + "A NextMavens project" attribution + copyright.
  - States: idle (default), loading (skeleton of the hero), empty/404 — n/a (it's the homepage).
- **`/docs`** — Docs index. Redirects to `/docs/getting-started`.
- **`/docs/[slug]`** — Doc page (`<DocsLayout>` + content). Sidebar (grouped: Get Started / Build /
  Reference) + doc title + body + "Copy page" button (copies the rendered text of the content
  node `[data-doc-content]`).

## 7. Component Specifications
- `<LandingNav>`, `<LandingHero>`, `<LandingFeatures>`, `<LandingOpenSource>`, `<LandingFooter>`,
  `<CopyCommand>` — verified live.
- `<DocsSidebar>`, `<CopyPage>` — verified live.
- `<DataTable>` (`data-table.md` ✅) — not used on the public site, but available.
- `<Button>`, `<Toast>`, `<EmptyState>`, `<ErrorState>`, `<Skeleton>` — reusable from the kit.

## 8. API Mapping
**No backend endpoints.** The landing and docs are hardcoded JSX + the
`src/content/docs.tsx` module (6 hardcoded docs: Getting Started, Installation, Deploy an App,
Edge Functions, Services, Configuration). The install command is a string constant.

```
const COMMAND = 'curl -sSL https://deploy.fidscript.com/install.sh | bash';
```

The copy-button calls `navigator.clipboard.writeText(COMMAND)`.

## 9. Backend Integration Map
None. No SDK, no fetch, no realtime. The only network interaction is the copy-to-clipboard.

## 10. User Experience Specification
- **Hero copy is opinionated.** "Self-Hosted Developer Operating System" is the only headline. The
  install command is the most important thing on the page.
- **Install command** has a one-click copy (`<CopyCommand>`). After copy, the button briefly
  shows a check + "Copied", then reverts.
- **Ubuntu recommendation** sits below the command as a quiet helper line. Not a banner.
- **No modals on landing.** No "subscribe to newsletter." No "schedule a demo."
- **Docs sidebar** has its **own scroll region** (independent of the content area). The
  architecture goal: reading a long doc never moves the sidebar.
- **Per-page "Copy page" button** copies the rendered doc content as plain text (via
  `[data-doc-content].innerText`).
- **Accessibility**: focus order is logical; nav landmarks (`<nav>`, `<main>`, `<aside>`); reduced
  motion disables the gradient pulse on the logo.

## 11. Design Philosophy
- **Open source, sovereign.** NextMavens attribution is present. The GitHub link points to
  `https://github.com/Mkid095/fidscript-deploy`.
- **Configure once.** The install command IS the configuration. The site never asks for anything.
- **Privacy-first.** No analytics, no cookies, no tracking. The site is static.
- **Open source means what it says.** Every icon, every token, every copy decision is in the repo.
- **No emoji.** Hugeicons only. Every icon chosen for meaning.

## 12. Configuration Philosophy
The public site has **zero user configuration**. The only "configuration" is the **deploy-time**
URL the install command points to (`https://deploy.fidscript.com/install.sh`). That URL is a single
constant in the source.

## 13. Automation Rules
- **Static export.** The site is statically rendered. No server-side rendering per request.
- **HTTPS** is automated by Traefik ACME (DNS-01 via Cloudflare). Cert auto-renews.
- **Wildcard cert** for `*.apps.<domain>` is issued by the installer so user deployments get TLS too.
- **GitHub link** is a constant; verified manually at commit time.
- **Content** (the docs body) is hardcoded in `src/content/docs.tsx`. The docs are intentionally
  **light** for now (deeper docs are a later pass); the **UI** (sidebar, copy, scroll behavior) is
  the focus.

## 14. Endpoint Documentation
None. The site issues no requests to the backend. (The install script it links to **does** call
the backend at install time — that's Phase 01, not the public site.)

## 15. Feature Dependency Graph
- **Hard:** F00 (design system — tokens, fonts, icons, layout primitives).
- **Soft:** the docs content module (`src/content/docs.tsx`) — can be extended independently.
- **Gated by F01:** nothing — it's standalone.
- **No backend gaps.** The public site is fully self-contained.

## 16. Acceptance Criteria
1. Landing renders at `https://deploy.fidscript.com` over HTTPS (HTTP/2, valid cert).
2. Hero shows the install command; clicking "Copy" places `curl -sSL … | bash` on the clipboard;
   button shows "Copied" for ~2s.
3. "Read the docs" navigates to `/docs/getting-started` (the first doc).
4. Docs sidebar scrolls independently of the content; clicking a sidebar item navigates; the
   active item is highlighted.
5. "Copy page" on a doc copies the doc's rendered text.
6. **No link to `/login`, `/register`, `/dashboard`, `/account`** anywhere on the public site.
7. The GitHub link is `https://github.com/Mkid095/fidscript-deploy`.
8. Footer attributes FIDScript as "A NextMavens project".
9. Ubuntu 22.04 / 24.04 recommendation is visible under the install command.
10. `pnpm --filter @fidscript/dashboard build` clean; `next build` emits the routes; the served
    HTML contains the hero copy, the install command, the docs links.
11. Reduced-motion preference is respected.
12. No console errors, no 404s on internal links.

## Change log
- 2026-06-20 — Spec upgraded to the full 16-section template (was a light "what was built" note).
  Explicitly documents the **no-login-links** rule and the operator-system framing (real content,
  real install command, no mock or viz).