# Frontend Phase Spec — `<Phase ID>` `<Title>`

> **Status:** Draft · **Connects to backend:** `<Phase NN — Service>` · **Last updated:** `<date>`
>
> **Rule:** Documentation → Review → Approval → Implementation. No code is written for this phase
> until this spec is complete and approved. Every section below is mandatory. "N/A" is acceptable
> only with a one-line justification — blanks are not.

---

## 1. Purpose
*Why this phase exists. What user problem it solves. Where it sits in the complete platform.*

## 2. Business Goal
*Why this feature matters. Which competitor experience it must match or beat (Supabase / Convex /
InstantDB / Firebase / Railway / Vercel / Cloudflare). The specific UX we are trying to outperform.*

## 3. User Personas
*Who uses this (e.g. installer, solo dev, startup founder, backend engineer, platform admin). For
each: goals, expectations, common frustrations, desired workflow.*

## 4. Complete User Journey
*Every screen, click, decision, branch, error, and success state — as a flow. Cover the happy path
**and** every alternate/error path. Nothing skipped.*

## 5. Information Architecture
*Navigation, sidebar entries, header, breadcrumbs, context menus, dialogs, modals, action buttons,
quick actions, search, command palette, settings, notifications — where this phase's surfaces live
in the global IA.*

## 6. Screen Specifications
*For every page in this phase: purpose, layout, sections, components, forms/tables/dialogs, loading,
empty, skeleton, error, success, validation, permissions, responsive behavior, accessibility,
keyboard shortcuts.*

## 7. Component Specifications
*Every reusable component this phase introduces (e.g. ProjectCard, EnvVarEditor). For each: purpose,
props, states, variants, behavior, loading/error, accessibility, animations, interactions.*

## 8. API Mapping
*For every screen/action: backend service, endpoint (method + full `/api/v1/...` path), request
payload, response, loading behavior, caching, pagination/filter/sort, realtime updates, retry,
permission check, rate-limit handling, offline behavior. Cross-reference `backend-inventory.md` IDs
(e.g. `[AUTH-04]`).*

## 9. Backend Integration Map
*How the frontend feature wires through the stack — e.g. Screen → SDK method → Controller → Service →
Repository/Provider → DB/infra → Events emitted → Audit log. Include the event types this feature
listens to (realtime) and emits.*

## 10. User Experience Specification
*Interaction-level detail — not "click create," but the full sequence: modal opens, focus → Name,
slug auto-generates, async duplicate check, button disabled until valid, Enter submits, optimistic
UI, toast, sidebar updates, audit log, realtime broadcast. Describe every meaningful interaction.*

## 11. Design Philosophy
*Why the UI is this way. Why one interaction was chosen over another, why settings are hidden, why
defaults exist, why advanced options are collapsed, why beginners are prioritized.*

## 12. Configuration Philosophy
*Reduce configuration. Which settings the user never sees, which are auto-generated, inferred, or
synchronized. Which single setting fans out to configure multiple services (the "configure once"
principle). State explicitly for this phase.*

## 13. Automation Rules
*Every automation this phase relies on or introduces (auto-SSL, auto-DNS-verify, auto-health-check,
auto-service-discovery, auto-backup, auto-rollback, etc.). Nothing is "magic" — document the trigger,
the action, and the observable result.*

## 14. Endpoint Documentation
*For each endpoint this phase consumes (mirror from `backend-inventory.md`): purpose, auth, permissions,
input, output, errors, UI consumers, related services/screens/components, related realtime events &
notifications.*

## 15. Feature Dependency Graph
*What this phase depends on (must be Verified first) and what depends on it. Fit it into the global
F00→F11 sequence. Note hard vs. soft dependencies.*

## 16. Acceptance Criteria
*The phase is complete only when: every screen exists, every component exists, every endpoint
integrated, no mock data, responsive, accessible, tests pass, backend connected, **and this spec is
updated to match the shipped implementation**. List the concrete prove-it checks.*

---

## Change log
*Append-only. Every revision: date, author/agent, what changed, why.*
