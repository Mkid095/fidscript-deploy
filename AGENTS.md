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
- **No AI visual vocabulary** in UI: no sparkle (✨, `<Sparkles>`), no magic wand (🪄, `<Wand>`), no brain (🧠), no robot (🤖), no orb, no lightning-as-decoration, no neural nodes, no purple/violet gradient backgrounds, no glassmorphism, no pulsing glow/shimmer. Use Lucide icons. Reserve ✨ ONLY for actual AI features, not every action.
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

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
