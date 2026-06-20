# F00 — Design System & App Foundation (full spec)

> **Status:** ✅ Verified (2026-06-20) · spec upgraded to 16 sections.
> **Connects to:** every other frontend phase (foundation). No backend modules.
> **No implementation changes** in this spec — it's the design + structural ground every other phase
> builds on.

## 1. Purpose
The visual + structural foundation every authenticated screen and every public screen renders
against. Without it the rest of the blueprint has no canvas. It's the difference between a
hand-stitched demo and an operating system.

## 2. Business Goal
Match the visual polish of Vercel / Linear / Supabase for a *self-hosted* audience — and out-simplify
on configuration: the user configures **nothing** about the design. Tokens are platform-defined
and locked. The UI is a constant; what changes is the data it renders.

## 3. Personas
Every persona sees this. The installer lands on the public site (landing → docs) in this design
the moment they open the URL. The solo dev, the admin, the backend dev — all of them work inside
this design for every minute after.

## 4. Complete User Journey
```
Install completes.
  → open the URL → /onboarding (F03, in this design) → 100% ready → /login (F02) → /dashboard.
The user never edits the design. They may switch theme (light/dark/system) under account
preferences — but the tokens themselves are immutable.
```

## 5. Information Architecture
- **Route groups.** `app/(marketing)/*` = public (landing, docs). `app/(app)/*` = authenticated
  dashboard. The root `app/layout.tsx` is the global chrome (html, body, providers, theme) shared
  by both. A group-specific layout adds the per-area shell (marketing = top nav + footer;
  app = sidebar + header + command palette).
- **Header** (authenticated): logo · project switcher · global search (⌘K) · notifications ·
  account menu.
- **Sidebar** (authenticated, per-project): the 14 items in `docs/product/navigation.md` §"Project
  dashboard sidebar."
- **Footer** (public only): brand · platform links · resource links · project links ·
  NextMavens attribution.
- **Breadcrumbs**: `Dashboard › Projects › <project> › <Section> › <Resource>` (per UX §4).

## 6. Screen Specifications
F00 itself renders **no service screens**. The screens it *governs* are: every public landing/docs
screen, every authenticated screen, every onboarding screen, and the empty/loading/error shells
that wrap them all.

- **Public chrome** (landing + docs) — the `<LandingNav>`, `<LandingHero>`, `<LandingFooter>` and
  the docs `<DocsSidebar>` + `<CopyPage>`. Verified live at `https://deploy.fidscript.com`.
- **Authenticated chrome** (every screen under `/dashboard`) — `<AppHeader>`, `<Sidebar>`,
  `<ProjectSwitcher>`, `<CommandPalette>`, `<NotificationBell>`, `<AccountMenu>`. Sped in F05
  (project dashboard shell).
- **Global error + loading shells** — `<ErrorState>`, `<Skeleton>` (per UX spec §10). These wrap
  every list and detail so the design is consistent across failures.

## 7. Component Specifications
- **`@fidscript/ui` (workspace kit)** — Button (`button.md` ✅), Input, Card, Badge, Modal, Toast
  (`toast.md` ✅), Spinner, EmptyState, ConfirmDialog. Cross-screen reusable; per-component specs
  in `docs/product/components/<name>.md`.
- **App-specific components** (in `apps/dashboard/src/components/`): `<LandingNav>`, `<LandingHero>`,
  `<LandingFeatures>`, `<LandingOpenSource>`, `<LandingFooter>`, `<CopyCommand>`, `<DocsSidebar>`,
  `<CopyPage>`, `<AppHeader>`, `<Sidebar>`, `<ProjectSwitcher>`, `<CommandPalette>`,
  `<NotificationBell>`, `<AccountMenu>`, `<MobileTabBar>`, `<HealthBadge>`, `<StateMachineTimeline>`,
  `<EntityCard>`, `<KeyValueTable>`, `<CodeBlock>`, `<Drawer>`, `<FilterBar>`, `<EventRow>`,
  `<ErrorState>`, `<Skeleton>`, `<LockedPanel>`.

## 8. API Mapping
F00 has **no direct backend endpoints** of its own. It defines the *rendering* of endpoints consumed
by every other phase. The full inventory is in `docs/phases/frontend/backend/`; every screen's
`API Mapping` section (F02 onward) cross-references it.

The foundation's only live network dependency is the **SDK** (`@fidscript/sdk`, Phase 16) which
provides the typed client every other phase uses. F00 does not import the SDK directly; it
provides the *visual* primitives the screens that *do* use the SDK render through.

## 9. Backend Integration Map
None. F00 is a frontend concern. The realtime event catalog (in `backend/index.md` → Realtime
event catalog) is consumed by the realtime list components specified in later phases.

## 10. User Experience Specification
- **Dark by default.** The platform's brand is "fire-red on near-black." Light theme is a
  preference, not the default. Both themes honor the same tokens (defined in `@theme`).
- **Reduced motion honored** (`prefers-reduced-motion`). Skeletons, pulse, and translate animations
  are disabled; the layout still updates.
- **Focus ring always visible** (a11y). `focus-visible:ring-2 ring-fire-500`. No relying on hover.
- **Color is never the only carrier of meaning.** A status badge always has a label + icon.
- **Sensible defaults.** Form fields default to safe, beginner-friendly values. The "Advanced"
  disclosure hides the rare 20%.
- **No emoji in UI** (rule 9). Hugeicons only. Every icon chosen for meaning, not decoration.
- **150-line file limit** (rule 7). Split components by concern.

## 11. Design Philosophy
- **Configure once.** Tokens are platform-defined. The user never edits CSS, never picks a color,
  never changes a font. The design is the constant.
- **Beginner first.** Defaults that work. Advanced behind a disclosure. No walls between the user
  and the 5 things they need.
- **Production-ready by default.** Dark theme, sensible focus, a11y, reduced-motion — not as
  options, as defaults.
- **Observable.** Every async state is visible. Spinners are reserved for *blocking* actions;
  content uses skeletons.
- **One dashboard.** The chrome is the same everywhere — every authenticated screen shares the
  header + sidebar + theme. The user never re-learns navigation.

## 12. Configuration Philosophy
- **Zero user-tunable tokens.** The palette, fonts, spacing, radii are locked. The user does not
  brand the platform; the platform brands itself.
- **Theme toggle** is the only user control: `light | dark | system` (default: `dark`). The tokens
  themselves are identical across themes; only the surface/background pair changes.
- **Density** is auto (comfortable by default; `compact` for logs/messages). No user control.
- **Language** is auto-detected (Accept-Language); only English ships in F00.

## 13. Automation Rules
- **Tailwind v4** auto-purges unused utilities at build time (`turbo build` in the dashboard
  Dockerfile). No runtime CSS bloat.
- **Hugeicons** is tree-shaken — only the icons the app imports ship.
- **`@fidscript/ui`** is built by `turbo build --filter=@fidscript/ui` (the dashboard Dockerfile
  runs `turbo build` which honors `dependsOn: ["^build"]`). The dashboard consumes the built
  `dist/`.
- **Theme** is persisted to `localStorage` under `fidscript.theme`; the root layout reads it on
  hydration (no FOUC).
- **Routing** uses Next.js App Router with `app/(marketing)/*` and `app/(app)/*` route groups;
  the group layouts provide the per-area shell without affecting the URL.

## 14. Endpoint Documentation
F00 has no endpoints. Every other phase's endpoint documentation lives in
`docs/phases/frontend/backend/`.

## 15. Feature Dependency Graph
- **Hard:** every other frontend phase (F01–F11). The design system must exist before any screen
  renders.
- **Soft:** the backend runtime (F00 is a frontend concern but is built into the dashboard image,
  which runs as a container alongside the API).
- **Gated by F00:** F01 (public site uses the tokens), F02 (auth uses the layout + providers),
  F03 (onboarding uses HealthBadge), F04–F11 (every service screen uses the chrome).
- **No backend gaps.** F00 has no backend dependencies.

## 16. Acceptance Criteria
- `pnpm --filter @fidscript/dashboard build` clean (types + lint).
- Landing renders at `https://deploy.fidscript.com` over HTTPS (Let's Encrypt, auto).
- Docs render at `/docs/[slug]` with sidebar + copy-this-page.
- All `bg-*`, `text-*`, `border-*` utilities resolve via `@theme` tokens (no raw hex outside
  `globals.css`).
- Every icon is a Hugeicons import; no hand-rolled SVGs, no emoji.
- 150-line file limit holds across the design-system files.
- Reduced-motion preference is respected (skeletons + pulse disabled).
- Focus ring visible on every focusable element.
- `localStorage` theme persists across reloads without FOUC.
- The `@fidscript/ui` kit is the source of truth for shared primitives; screens import it, not
  local re-implementations.

## Change log
- 2026-06-20 — Spec upgraded to the full 16-section template (was a light "what was built" note).
