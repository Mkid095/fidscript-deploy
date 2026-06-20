# Implementation Decisions

> Per-decision notes on **how** something was built, captured during implementation. Distinct
> from architectural ADRs in `DECISIONS.md`, which record **why** a major direction was chosen.
>
> Rule of thumb: if the decision constrains the whole platform or could be reversed by a future
> contributor who doesn't know the context → it's an ADR (`DECISIONS.md`). If it's a localized
> "we built X this way to unblock Y" → it belongs here.
>
> Format: `YYYY-MM-DD · <phase> · <short title>` → context, choice, rationale, reversibility.

---

## 2026-06-20 · pre-implementation · Journal-vs-ADR split

- **Context:** the project now has both architectural decisions and will accumulate
  implementation-time decisions. They need separate homes or the ADR log becomes noisy.
- **Choice:** `DECISIONS.md` (ADRs) = *why* a direction was chosen; this directory = *how* a
  thing was built, localized.
- **Rationale:** keeps the ADR log scannable for the big reversals; preserves the build-time
  rationale without bloating it.
- **Reversibility:** trivial — promote a note here to an ADR if it grows platform-wide impact.

---

*(implementation decisions for Phase A onward are appended below as they are made)*
