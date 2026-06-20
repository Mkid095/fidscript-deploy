# Execution Protocol

> **Purpose.** The lifecycle every implementation phase follows, so each is **traceable and
> reversible**. A phase is not complete until every step below is green AND the
> `docs/DEFINITION_OF_DONE.md` merge gate passes. This is *how* we build; the specs are *what*
> we build; `docs/IMPLEMENTATION_ROADMAP.md` is *when*.
>
> **Rule.** Build **one vertical slice at a time.** Never implement multiple phases in
> parallel. Complete a phase end-to-end (backend → DB → tests → frontend → UX → docs →
> verification) before starting the next. This keeps the platform deployable after every phase
> and isolates regressions.

---

## The phase lifecycle

Every phase — including backend-only "Stage 0" prerequisite work — moves through these steps
in order. Skip none. A backend-only phase (e.g. Phase A auth hardening) legitimately omits the
frontend steps, but every step it *does* touch must be green.

```
1. Specification            ← the frozen fNN-*.md + screen/component specs (the contract)
        ↓
2. Dependency Validation    ← every PREREQ-* the phase lists is Closed; inventory refs resolve
        ↓
3. Backend Implementation   ← real work, no stubs; migrations as needed
        ↓
4. Backend Tests            ← typecheck + build + the phase's prove-it tests on the VPS
        ↓
5. Frontend Implementation  ← (omit for backend-only phases) real entities, real endpoints
        ↓
6. Frontend Tests           ← (omit for backend-only phases) build clean + a11y + per-role
        ↓
7. Integration Tests        ← the live-verification checklist (below) against the running app
        ↓
8. Documentation Update     ← spec Current State, prereq statuses, AGENT_STATUS, journal
        ↓
9. Phase Sign-off           ← Definition of Done passes; checkpoint report filed
```

**Gate semantics.** Each step gates the next. If step 4 (backend tests) is red, step 5 does
not start. If a step can't be satisfied, that's a finding — record it in
`docs/technical-debt.md` and `docs/implementation/KNOWN_ISSUES.md`; do not silently skip.

---

## Live verification (step 7)

Documentation cannot prove the system works. Every phase's verification is run **against the
running application** — not just unit tests. The phase spec's §Verification / §16 acceptance
criteria define the checklist; each item is exercised live.

Example — Authentication (F02):

- ✓ Login (password) · ✓ Login (magic-code) · ✓ Logout revokes the session
- ✓ Refresh rotates the token (old token now rejected) · ✓ Magic code arrives + verifies
- ✓ First-login forced password change · ✓ Invalid credentials rejected
- ✓ Expired session rejected · ✓ Revoked session rejected · ✓ Browser refresh keeps session

A green checklist is filed in the phase's checkpoint report (`docs/implementation/<phase>/`).
If an item can't be verified live (e.g. external delivery blocked by no-egress), it is marked
**deferred, tracked** with the reason — never silently passed (`docs/AUDIT.md` headline is the
cautionary tale).

---

## Phase checkpoints (step 9)

Every completed phase produces a checkpoint under `docs/implementation/<PHASE>/`:

```
docs/implementation/F02/
├── report.md          ← what was built, what changed, endpoints/migrations/docs touched
├── acceptance.md      ← the live-verification checklist, every box checked or deferred-with-reason
├── api-tests/         ← the prove-it scripts / HTTP replays used
└── screenshots/       ← (frontend phases) the screen states that prove the UX
```

The report answers: *What was built? What changed? Which endpoints changed? Which migrations
ran? Which docs changed? Which known issues remain? Which phase is now unblocked?*

Template: `docs/implementation/_phase-report-template.md`.

---

## Implementation journal vs. specifications

- **Specifications** (`docs/product/`, `docs/phases/frontend/`) describe **what the system
  should become** — the contract.
- **Implementation journal** (`docs/implementation/`) records **what actually happened** while
  building it — the history: the log, the current phase, known issues, the internal changelog,
  and per-decision notes.

Both exist. They are not the same document. A spec drifts only via a reviewed doc-change
(rule 16); the journal accrues with every commit.

---

## The journal's files

| File | Purpose |
|---|---|
| `docs/implementation/IMPLEMENTATION_LOG.md` | Reverse-chronological log: date · phase · completed · unexpected issues · decision · impact. One entry per working session. |
| `docs/implementation/CURRENT_PHASE.md` | The single active phase + its next step. If this says "F02 / AUTH-5", that is the only thing in flight. |
| `docs/implementation/KNOWN_ISSUES.md` | Issues discovered during implementation (distinct from the *planned* gaps in `docs/backend-prerequisites.md`). |
| `docs/implementation/CHANGELOG_INTERNAL.md` | The internal release narrative — what shipped, per phase, for humans and future models. |
| `docs/implementation/decisions/` | Implementation-time decisions (how a thing was built), distinct from architectural ADRs (`DECISIONS.md`, *why* a thing was chosen). |

---

## Change log
- 2026-06-20 — Initial protocol. 9-step lifecycle + live verification + checkpoint convention
  + journal structure. Adopted before Stage 0A; Phase A is the first phase run through it.
