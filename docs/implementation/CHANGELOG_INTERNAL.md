# Internal Changelog

> The human + model-readable narrative of **what shipped**, per phase. Distinct from the
> per-commit git log (which is too granular) and the journal log (which is per-session).
> One section per shipped phase, newest first.

---

## [Unreleased] — Phase A (in flight)

Platform-correctness hardening of the auth token/session machinery. Backend-only; no
frontend. See `docs/backend-prerequisites.md` → Phase A.

- *(pending)* `PREREQ-AUTH-5` logout no-op fix
- *(pending)* `PREREQ-AUTH-6` refresh/session rotation fix
- *(pending)* `PREREQ-AUTH-7` `JWT_SECRET_FILE` honored by auth.module + jwt.strategy

---

## [2026-06-20] — Documentation freeze (Phase D0)

The blueprint became the contract. No code shipped; the foundation for all subsequent
implementation: the validation report, the phased prerequisite registry, the implementation
roadmap, the Definition of Done, the execution protocol, the technical-debt registry, and 7
product-rationale ADRs.
