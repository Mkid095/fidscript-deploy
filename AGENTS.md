# AI Agent Rules — FIDScript Deploy

> **CRITICAL:** These rules are STRICTLY ENFORCED. Read `.ai/coding-rules.md` before any work.

## Before Modifying Code

1. Read `.ai/coding-rules.md` — enforcement rules, non-negotiable
2. Read `.ai/project-manifest.md` — system overview
3. Read `.ai/review-checklist.md` — must complete every item
4. Inspect existing implementation
5. Do NOT rewrite working systems
6. Check blast radius before making changes

## When Adding Features

Required updates — every time, without exception:

- [ ] Update relevant phase doc (`docs/phases/phase-*.md`) if implementation changed current state
- [ ] `CHANGELOG.md` — update with files changed and description
- [ ] `.ai/review-checklist.md` — complete every item

## Strict Rules

### NEVER do any of these:

- Create `helpers.ts`, `common.ts`, `misc.ts`, `utils.ts`, `tools.ts` — **forbidden**
- Put business logic in React/Next.js components — **forbidden**
- Put API calls directly in components — use server actions or API route handlers only
- Exceed **150 lines per file** — split immediately
- Add dependencies without explicit approval
- Skip `CHANGELOG.md` update — it is **mandatory**
- Use `any` type without documented exception
- Use native `alert()`, `confirm()`, `prompt()` — use toast/dialog components only
- Comment out code instead of deleting — **delete it**
- Add commented-out code as "future reference" — **never**
- Skip phase verification — verify every phase on VPS before declaring done

### Always do these:

- Follow `[domain]-[action]-[type].ts` naming
- Keep UI in components, logic in server/lib
- Run `tsc --noEmit` before committing
- Verify file line counts: `wc -l <file>` — must be ≤ 150
- Phase docs updated FROM the actual implementation

## Commit Format

```
feat(domain): description
fix(domain): description
docs(domain): description
refactor(domain): description
```

## Review Checklist

Run `.ai/review-checklist.md` before declaring done. Do not skip items.
