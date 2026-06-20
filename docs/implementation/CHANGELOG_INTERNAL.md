# Internal Changelog

> The human + model-readable narrative of **what shipped**, per phase. Distinct from the
> per-commit git log (which is too granular) and the journal log (which is per-session).
> One section per shipped phase, newest first.

---

## [Unreleased] — Phase B (in flight)

F02-authentication backend enablers. Backend-only; no frontend yet. See
`docs/backend-prerequisites.md` → Phase B.

- ✅ `PREREQ-AUTH-1` `mustChangePassword` field + migration + seed
- ✅ `PREREQ-AUTH-4` flag surfaced on `GET /auth/me`
- *(pending)* `PREREQ-AUTH-2` `POST /auth/change-password` endpoint
- *(pending)* `PREREQ-AUTH-3` platform magic-code (`/auth/magic-code` + `/auth/verify-magic-code`)

(Phase A — `PREREQ-AUTH-5/6/7` — was already implemented in the code; verified + reconciled
2026-06-20, not new work.)

---

## [2026-06-20] — Documentation freeze (Phase D0)

The blueprint became the contract. No code shipped; the foundation for all subsequent
implementation: the validation report, the phased prerequisite registry, the implementation
roadmap, the Definition of Done, the execution protocol, the technical-debt registry, and 7
product-rationale ADRs.
