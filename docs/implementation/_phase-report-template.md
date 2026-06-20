# Phase Report — `<PHASE>`

> Copy this template to `docs/implementation/<PHASE>/report.md` at sign-off. Fill every
> section. A phase is not signed off until this report is filed AND `docs/DEFINITION_OF_DONE.md`
> passes AND `docs/implementation/<PHASE>/acceptance.md` has every live-verification item green
> or deferred-with-reason.

**Phase:** <e.g. Phase A / F02>
**Spec:** `docs/phases/frontend/fNN-*.md` + `docs/backend-prerequisites.md` → <IDs>
**Dates:** <start → end>
**Status:** ✅ Signed off / 🟧 Deferred items / 🟥 Blocked

## What was built
- <concrete deliverables>

## What changed
- <files/modules touched, at a summary level>

## Endpoints changed
- <inventory ID> — <what changed>. (IDs are immutable — descriptions update, IDs never rename/recycle.)

## Database migrations
- `<migration name>` — <what it adds/changes>. Reversibility: <up/down>.

## Documentation changed
- <spec file> — <Current State / what drifted and was corrected>
- `docs/backend-prerequisites.md` — <PREREQ-* flipped to ✅>
- `docs/technical-debt.md` — <new debt entries, if any>

## Live verification (summary — full checklist in `acceptance.md`)
- ✓ <item> · ✓ <item> · 🟧 <item — deferred, reason>

## Known issues remaining
- <link to `KNOWN_ISSUES.md` entries or `docs/technical-debt.md`>

## Phase now unblocked
- <next phase(s) this gates, per `docs/IMPLEMENTATION_ROADMAP.md`>

## Sign-off
- [ ] `docs/DEFINITION_OF_DONE.md` — all 10 criteria pass
- [ ] `acceptance.md` filed (live-verification green/deferred)
- [ ] `AGENT_STATUS.md` updated
- [ ] Committed (code + docs in the same commit)
