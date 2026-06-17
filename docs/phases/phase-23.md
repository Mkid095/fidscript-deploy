# Phase 23: Marketplace

> **Status:** Planned  |  **Track:** Ecosystem  |  **Depends on:** Phase 03, Phase 20, Phase 21

## Objective

A working marketplace for templates (21), skills (20), and integrations: browse, submit, review, publish, install — with **real admin gating** on moderation actions and **reviews that actually display**. Today admin actions (approve/reject/verify/feature) have **no role guard** — any authenticated user can approve their own item — and the module won't compile.

## Current State

**PARTIAL / broken — and a privilege-escalation hole.** See `docs/AUDIT.md` §C (Marketplace). Specific defects:

- Rating aggregation genuinely works.
- The module **won't compile** (AUDIT blocker #1 `EventsService` import; fixed in Phase 00, verified here).
- **Admin actions have no role guard** — `approve`/`reject`/`verify`/`feature` are callable by **any authenticated user**, so a submitter can approve their own item. **Privilege escalation.**
- Reviews never display (`isVerified:false` forever — the verification gating is broken).

## Dependencies

- **Phase 00** (module compiles).
- **Phase 03** (`PlatformAdminGuard` + roles — the fix for the privilege-escalation hole).
- **Phase 20 + 21** (skills + templates are the catalog item types; install handoff).
- **Phase 02** (lifecycle events).

## Deliverables

- [ ] **Module compiles and runs** (Phase 00 import fix verified here).
- [ ] **Privilege-escalation fix.** All moderation actions — `approve`, `reject`, `verify`, `feature`, `unpublish`, `remove` — are guarded by `PlatformAdminGuard` (Phase 03). A non-admin gets `403`; a submitter cannot self-approve. This closes the security hole.
- [ ] **Submission lifecycle.** `submit` (draft) → `pending` → admin `approved`/`rejected` → `published`; versioning; owner can edit their own (non-moderation) fields. Status transitions are explicit and guarded.
- [ ] **Reviews display.** Fix the `isVerified` gating so approved/legitimate reviews render. Reviews from real usage (verified install/usage) surface; moderation can hide abuse.
- [ ] **Item types.** Templates (21), skills (20), integrations (provider listings). Each carries type-specific metadata.
- [ ] **Ratings & reviews.** Star ratings with real aggregation (works today); per-review text; moderation; one-review-per-user-per-item; verified-usage badge.
- [ ] **Discovery.** Search, filter (type/category), sort (rating/installs/newest), featured items (admin-set).
- [ ] **Install handoff.** "Install" on a template/skill triggers the real generate (21) or skill-install (20) flow — the marketplace isn't just a catalog row, it produces an outcome.

## Technical Design

- **Statuses:** `draft | pending | approved | rejected | published | removed`. Only `published` is browseable. Transitions out of `pending` require an admin (enforced by the guard, not trusted client input).
- **Guard:** `@UseGuards(JwtAuthGuard, PlatformAdminGuard)` on every moderation route; a re-check in the service that the actor's `platformRole` is admin (defense in depth).
- **Reviews:** `isVerified` set true after a verified install/usage event (event from 20/21) — not a static field. Broken gating fixed so approved reviews render in listings and detail.
- **Install:** routes to the relevant phase (template → 21 generate; skill → 20 install; integration → config), recording an `installed` event + incrementing an installs counter.

## Integration Points

- **Events emitted:** `marketplace.item.submitted/approved/rejected/published/installed/featured`. Consumed by audit (02) — the approval events are themselves audited.
- **Service registry:** registers `marketplace`.
- **SDK (16):** `marketplace.browse/submit/review/install`.
- **CLI (18):** `fidscript marketplace search/install`.
- **Dashboard (19):** public marketplace + an admin moderation queue (admin-gated).
- **Consumes:** Skills (20), Templates (21) as item types.

## Verification (VPS)

```bash
# 1) Privilege escalation CLOSED — a regular user CANNOT self-approve:
USER_TOKEN=<non-admin>
curl -s -o /dev/null -w "%{http_code}" -X POST .../marketplace/items/<my-item>/approve -H "Authorization: Bearer $USER_TOKEN"  # 403

# 2) An admin CAN:
ADMIN_TOKEN=<admin>
curl -fsS -X POST .../marketplace/items/<id>/approve -H "Authorization: Bearer $ADMIN_TOKEN"  # 200 → published

# 3) Reviews render after approval/verification:
curl -fsS .../marketplace/items/<id> | jq '.reviews'        # reviews present (not hidden forever)

# 4) Install actually works (handoff to the real phase):
fidscript marketplace install <template-id>   # generates + (optionally) deploys a real project
```

**Exit criterion:** non-admins get `403` on every moderation action; admins can approve/publish/feature; reviews render after verification; install routes to a real generate/skill flow; the module compiles. The privilege-escalation hole is closed and the dead-review bug is fixed.

## Out of Scope / Future

- Payments / paid listings — future.
- Signed/verified publisher identities + SBOM — future (security hardening).
- Multi-tenant marketplace tenancy / revenue share — future.

## Risks

- **Privilege escalation is the headline risk** — verify *every* moderation route through the guard + a service-level role check; an integration test asserts a non-admin cannot approve.
- Spam/abuse moderation → admin queue + report/flag + hide-abusive-review capability.
- Review bombing → per-user-one-review + verified-usage gating + moderation.

## Files you'll touch (precision map)

- `apps/api/src/modules/marketplace/marketplace.service.ts` (rating aggregation genuinely works — but **`approveItem`/`rejectItem`/`markFeatured`/`verifyItem` have no role guard** → privilege escalation; reviews never display, `isVerified:false` forever) + the controller.
- Prisma: `MarketplaceItem`, `MarketplaceReview`.
- Add: `PlatformAdminGuard` (Phase 03) on every moderation route (plus a service-level role recheck); fix review verification so approved reviews render; an install handoff to Skills (20) / Templates (21).

## Next Phase

**Roadmap complete.** With all 23 phases verified, the platform builds, installs on a fresh VPS, and delivers all three surfaces (Dashboard, MCP+Skills, CLI) backed by a real backend. Further work is hardening, performance, and ecosystem growth — tracked as follow-on ADRs, not new "phases."

---

*Phase docs v2 complete: 2026-06-16. Every phase above is grounded in `docs/AUDIT.md` and follows the template in `docs/phases/README.md`. Implementation resumes at Phase 00.*
