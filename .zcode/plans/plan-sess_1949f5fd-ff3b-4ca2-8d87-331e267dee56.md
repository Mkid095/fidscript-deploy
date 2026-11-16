## Context

You pointed me at the `deployui` guide repo as the visual spec for the whole console, with deployment as the flagship. The guide ships a complete design system: near-black layered surfaces, a signature `#FF6A1A` orange accent, Plus Jakarta Sans + JetBrains Mono, lucide icons, a sectioned sidebar with left-orange active bars + a project switcher + a bottom CTA/footer, a sticky topbar (breadcrumbs + live-subdomain chip + orange "New deployment" button), and a deployment wizard with a terminal `runner.stdout` log box, phase cards, a signature deploy button, and a "live" ready panel.

The current console is **token-driven** (all components use `bg-surface`/`border-rail`/`text-text`/`bg-accent`, never raw hex — verified). That's a gift: retuning the token file shifts the entire app at once. Deployment already works (real detection, real polling, real logs, subdomain checks, overrides) — this pass keeps that behavior and only lifts the guide's *visual language* onto it.

**Defaults I'm proceeding on** (your earlier forks went unanswered — say the word to change any):
- **Fonts → the guide's** (Plus Jakarta Sans + JetBrains Mono).
- **Icons → add `lucide-react`** (small, tree-shaken) and use it in the flagship surfaces.
- **Theme → keep dual** (no regression to light users): retune **both** — dark to the guide palette, light to a clean matching analog.
- **Scope → flagship-first**: Foundation (whole app) + sidebar + topbar + the full deployment surface, then **deploy & show**. The sweep of the remaining project pages is queued for the next round after you've seen this.

**Hard rules I will hold:** no fake data, no placeholder statistics, no fake "TLS 1.3 active / Anycast" claims — the ready panel shows only what is true (URL, framework, branch, elapsed, open/copy). The deployment log box streams **real** runner lines only. No copying the guide's mock REPOS/metrics.

## Phase 1 — Foundation (whole app, one token file + fonts + icon dep)

**`apps/console/src/app/globals.css`** — retune the two themes and add two tokens:
- Dark: `--canvas #08090d`, `--surface #0E1118`, `--surface-2 #141824`, `--surface-3 #181E2E`, `--rail #1E2433`, `--rail-light #232838`, `--text #e2e8f0`, `--text-muted #94a3b8`, `--text-dim #64748b`, `--accent #FF6A1A`, `--accent-hover #FF782E`, `--success #34d399`, `--warning #fbbf24`, `--danger #f87171`, `--info #60a5fa`, new `--accent-soft #FF8D4D` (light orange for links/labels), new `--well #07080C` (deepest, for terminal log boxes).
- Light: clean analog — `--canvas #f4f5f7`, `--surface #ffffff`, `--surface-2 #f4f5f7`, `--surface-3 #eceef1`, `--rail #e4e7ec`, `--rail-light #cfd4dc`, `--accent #f2611d`, `--accent-hover #d94f12`, `--accent-soft #e0692f`, `--well #eef0f3`, semantic colors kept.
- Export the two new tokens in `@theme inline` (`--color-accent-soft`, `--color-well`) so `text-accent-soft` / `bg-well` utilities exist.
- `body` scrollbar thumb → `--rail-light`, `#232838`-family; keep the existing thin `.scroll-area`.

**`apps/console/src/app/layout.tsx`** — swap the two `next/font/google` objects to `Plus_Jakarta_Sans` and `JetBrains_Mono`, **keeping the same CSS variable names** (`--font-geist-sans`, `--font-geist-mono`) so nothing downstream breaks. `globals.css` `body` + `@theme inline` already reference those vars.

**`apps/console/package.json`** — add `lucide-react`.

## Phase 2 — Shell (sidebar + topbar)

**`apps/console/src/components/project/project-sidebar.tsx`** — lift the guide's sidebar: keep the derived-menu structure (`groupMenuItems`, `menu.ts` unchanged), restyle to `bg-surface` with `--rail` divider; group labels → `text-[10px] font-mono uppercase tracking-wider text-text-dim`; items → mono-less `text-xs`, active = `bg-surface-3 text-text` + **left `border-l-2` orange bar** (replace the current 0.5px absolute mark with the guide's bolder bar) + optional lucide per-item icon; hover `bg-surface-2`. Add a **project switcher dropdown** (a small menu of the user's other projects — data already available to the layout via the API; a minimal, honest list) and a **bottom block**: a signature orange **"New deployment"** button (`bg-accent hover:bg-accent-hover`) linking to `deployments/new` (only when the deployment switch is on) + an `owner · *.apps.{PLATFORM_DOMAIN}` mono footer line. The head ("← All projects" + name + status) restyles to the guide's status chip (pulsing emerald dot + `active` mono label when live).

**`apps/console/src/app/(project)/projects/[projectId]/layout.tsx`** — add a **guide-style sticky topbar** above the page: left = breadcrumb `Projects / {name} / {section}` (section from `usePathname`, matching the active menu label), right = a **live-subdomain chip** (the project's current deployment URL when one is up, else a quiet "no deployment yet") + a copy affordance + the **orange "New deployment" CTA**. Uses `getProjectResources` (already fetched in this layout) for the live URL. On small screens the chip collapses (the sidebar already provides nav).

Mirror the sidebar restyle + topbar onto the **platform shell** (`platform-sidebar.tsx` + `platform/layout.tsx`) so the two consoles read as one. Remove the orphaned `platform/top-bar.tsx` (unreferenced, confirmed by the inventory).

## Phase 3 — Deployment flagship (real behavior, guide's look)

All in `apps/console/src/components/project/` + `deployments/` pages. Keep every server action, poll, and validation exactly as-is; change presentation only.

- **`deployment-source-step.tsx`** — the guide's source card: mono URL field + signature orange **Import** button; "or choose from {owner}" divider; the repo list as rows with a hover **Import** button (a click imports — keep the `onPick` behaviour already shipped); search input with a `/` kbd + focus-shortcut; a **Start-from-a-template** grid (real templates, not the guide's mocks).
- **`deployment-wizard.tsx`** (`DetectChecklist`) — the guide's bordered step cards: done = emerald ✓ tint, active = orange spinner + `bg-surface-3` + orange border, upcoming = dim; `rounded-xl` card.
- **`deployment-configure-step.tsx`** — `rounded-xl border bg-surface shadow` panels; subdomain field with the inline check + `https://{name}.apps.{PLATFORM_DOMAIN}` preview in accent-soft; override accordion with the guide's **switch** (reuse `ui/switch.tsx`, drop the local duplicate `Switch`); env rows restyled; `.env.example` "Add them" banner; the **signature full-width Deploy button** (`bg-accent hover:bg-accent-hover shadow` + `Ctrl ↵` kbd) with the amber issue counter.
- **`deployment-progress-step.tsx`** — the guide's **terminal `runner.stdout` log box** (a `bg-well` panel: `#0C0E14`-style header with a copy button, then the real `BuildLogViewer` lines color-coded success/warn/err); the **phase cards** (Queued/Building/Deploying/Ready as small `rounded-lg` tiles, done ✓ / active spinner / ✕ on failure); progress bar `bg-accent`→`bg-success`; **ready panel** = a browser-chrome frame around the real URL + a facts row (framework · branch · elapsed · var count, all real) + Visit/Copy + remaining-monorepo-apps buttons; a small **dependency-free confetti burst** on reaching `SUCCESS` (harmless success flourish, no fake data).
- **`deployments/page.tsx`** (history) + **`[deploymentId]/page.tsx`** — apply the new `Card`/`Badge`/row styling, orange "live" accent bar on the current deployment, and `View logs / Preview / Rollback` action buttons in the guide's style (only real actions).

**Card/Page primitives** (`ui/card.tsx`, `ui/page.tsx`) — bump the default card to `rounded-xl` + a soft shadow and align `PageHeader` to the new type scale so the whole app picks up the guide's card language from these two files.

## Verification

1. `cd apps/console && pnpm test` (36 + deployment tests green), `npx tsc --noEmit`, `NODE_OPTIONS=--max-old-space-size=2048 pnpm build` (fonts self-host at build; watch the Google-font download step).
2. Build the console image and deploy: `cd /opt/fidscript-deploy/installer/docker && sudo docker compose build dashboard && up -d dashboard`; confirm `fidscript_dashboard` healthy. (Console builds from the **HOME repo** — sync any `/opt`-only drift out of this change first; this pass is console-only, so no API sync needed.)
3. Live, with the operator session: dark theme shifts to the near-black + orange look; light theme stays coherent. Check the project **sidebar** (switcher, left-orange active bar, CTA), the **topbar** (breadcrumb + live chip + CTA), and run the **deployment wizard** end-to-end against a real repo: source → animated detect (real) → configure (subdomain check, overrides, env rows, Ctrl+Enter) → progress (terminal log box streaming real lines, phase cards) → ready (URL + facts + visit/copy). Confirm no fake claims render and a failed build shows the real error + "Deploy again".
4. Screenshot the flagship surfaces for the visual-judge pass before I start the Phase-4 sweep.

## Queued for the next round (flagship-first)
The **sweep** of the remaining project pages onto the new foundation: overview, domains, email, packages, settings, monitoring, logs, databases, members, activity. I'll deploy Phases 1–3, show you the live result, and then roll the sweep based on your reaction.