# Definition of Done

> **Purpose.** A feature (or phase, or PR) is **not done** unless *every* item below is true.
> This is the merge gate. Rule 16 of `CLAUDE.md` makes the documentation the contract; this
> checklist is how a contribution proves it honored the contract.
>
> **Use it on every PR.** If even one box is unchecked, the work is incomplete — do not merge,
> do not flip the status in `AGENT_STATUS.md`, do not move to the next phase.

---

## The checklist

A feature is **Done** only when **all ten** are satisfied:

- [ ] **Backend implementation is complete** — the endpoints/services do the real work
      (verified on the VPS, not just "compiles"). No stubs, no `TODO`, no dead code left
      behind. (Rule 1, `docs/AUDIT.md`.)
- [ ] **Frontend implementation is complete** — every screen renders the real Prisma entity
      with real fields, every action calls the real inventory endpoint, every per-role
      render rule is honored. No mock data, no fake state. (Rule 15, operating-system framing.)
- [ ] **Tests pass** — `pnpm typecheck && pnpm build` clean across the workspace; any
      feature-specific prove-it test (the phase spec's §Verification) passes on the VPS.
      (Rule 1.)
- [ ] **Documentation has been updated** — the phase spec's *Current State* reflects what
      shipped; if behavior changed, the spec changed in the same commit. (Rules 13, 16.)
- [ ] **`docs/backend-prerequisites.md` is updated** — every `PREREQ-*` the feature depended
      on is flipped to ✅ (or, if a new gap surfaced, a new `PREREQ-*` is added). (D0.3.)
- [ ] **`docs/VALIDATION.md` still passes** — re-run the cross-reference check: zero broken
      references. (D0.1. Command: see "How to re-validate" below.)
- [ ] **No endpoint IDs have become orphaned without intent** — if an inventory endpoint is
      now unused, either wire a screen to it or document *why* it's intentionally unreferenced
      (the `APPAUTH-*` pattern). Orphans are flagged, not silently accrued.
- [ ] **No new undocumented APIs introduced** — every endpoint the feature calls exists in
      `docs/phases/frontend/backend/` with an inventory ID. A new endpoint gets an ID + an
      inventory row *before* the code that calls it. (Rule 14, D0.1.)
- [ ] **The phase spec's acceptance criteria are fully satisfied** — every item in the
      relevant `fNN-*.md` §16 passes, and the verification checklist in
      `docs/IMPLEMENTATION_ROADMAP.md` passes. (Rule 1.)
- [ ] **`AGENT_STATUS.md` reflects the new state** — the phase/feature is flipped to
      `Verified` (or its honest status); the progress log notes what shipped. (Rule 13.)

---

## How to re-validate `VALIDATION.md` (the cross-reference check)

Run this before claiming "VALIDATION still passes":

```bash
# Every inventory ID, vs every ID referenced by specs. Empty MISSING = pass.
grep -hoE "(AUTH|PROJ|DEPL|DOM|STOR|DB|MAIL|FN|QUEUE|CRON|RT|MON|LOG|TMPL|AI|MKT|SVC|MCP|APPAUTH)-[0-9]+" \
  docs/phases/frontend/backend/*.md | sort -u > /tmp/inv.txt
grep -rhoE "(AUTH|PROJ|DEPL|DOM|STOR|DB|MAIL|FN|QUEUE|CRON|RT|MON|LOG|TMPL|AI|MKT|SVC|MCP|APPAUTH)-[0-9]+" \
  docs/phases/frontend/*.md docs/product/screens/*.md docs/product/services/*.md docs/product/components/*.md \
  | sort -u > /tmp/use.txt
comm -13 /tmp/inv.txt /tmp/use.txt   # MISSING (referenced, not in inventory) — must be empty
```

If the MISSING set is non-empty, either add the endpoint to the inventory (with an ID) or
convert the reference to a `PREREQ-*` in `docs/backend-prerequisites.md`. Then re-run.

---

## When something can't be fully satisfied

Be honest (Rule 1, the whole point of the hardening reset):

- **A backend gap is genuinely out of scope for this PR** (e.g. the Functions sandboxing
  security debt) → the feature is Done *for its scope*, and the gap is recorded as a
  `PREREQ-*` with status 🟧/🟨 in `docs/backend-prerequisites.md`, referenced from the spec.
  The PR does not pretend the gap doesn't exist.
- **A test can't run on the VPS yet** (e.g. external delivery deferred by no-egress) →
  state that explicitly in `AGENT_STATUS.md`; mark the criterion "deferred, tracked" rather
  than "pass." Never mark a deferred item as passing.

A feature marked Done that later turns out to have skipped a box is the exact failure mode
the hardening reset was meant to end (`docs/AUDIT.md` headline: *"roughly three-quarters of
what is marked COMPLETE is scaffolding"*). The checklist exists so that cannot happen again.

---

## Change log
- 2026-06-20 — Initial Definition of Done. Ten merge-gate criteria + the re-validate command.
