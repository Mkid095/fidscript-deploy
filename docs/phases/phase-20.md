# Phase 20: Skills Platform

> **Status:** Planned  |  **Track:** Surfaces  |  **Depends on:** Phase 17, Phase 18

## Objective

Installable **Claude skills** (and other agent skills) that teach an agent *how* to operate the FIDScript platform — paired with the MCP server (17) as its hands. A user installs a skill, asks the agent to "set up a new app with a database and deploy it," and the agent follows the skill's instructions to drive the platform to a real result. Today the "skill" is plain markdown with no `SKILL.md` frontmatter referencing fictional commands.

## Current State

**STUB.** See `docs/AUDIT.md` §D (Skills). Specific defects:

- `fidscript-skill.md` is plain documentation — **no `SKILL.md` frontmatter**, so it is **not installable** as a skill.
- It references **fictional commands and repositories** — an agent following it would fail.

> Note: the *old* Phase 20 ("skills marketplace for reusable business modules" with a Docker runtime) conflated skills with the Marketplace (Phase 23). This phase is specifically **agent skills** — the instructional half of Surface 2 (MCP = hands, Skills = instructions).

## Dependencies

- **Phase 17** (MCP server — the tools the skill drives).
- **Phase 18** (CLI — the skill may instruct agents to run CLI commands too).
- The backend phases the skills operate on (deployments, databases, functions, domains, etc.).

## Deliverables

- [ ] **Proper `SKILL.md` frontmatter.** Each skill ships valid frontmatter (`name`, `description`, allowed-tools, etc.) so it is genuinely installable in Claude / Claude Code / compatible agents.
- [ ] **Real, working skills.** A starter library that drives the platform via real MCP tools and/or CLI commands:
  - `fidscript-deploy` — scaffold, configure, and deploy an app end-to-end.
  - `fidscript-database` — provision a DB, run migrations, back up / restore.
  - `fidscript-functions` — author, deploy, and invoke functions; wire event triggers.
  - `fidscript-domains` — add and verify a custom domain with TLS.
  - `fidscript-diagnose` — inspect logs, metrics, alerts, and queue depth to debug a problem.
  - Every reference in these skills points at **real** MCP tools / CLI commands that exist on the VPS.
- [ ] **Skill ↔ MCP pairing verified.** An agent with the skill + the MCP server configured can complete a real workflow (no fictional commands).
- [ ] **Install / manage.** Skills install/uninstall cleanly; versioned; the dashboard (19) can browse/install them. An authoring template + guide lets users write their own.
- [ ] **Catalog location.** Skills live in a discoverable place (e.g. `apps/skills/` or a `skills/` registry) with metadata for the future Marketplace (23).

## Technical Design

- **Skill = instructions + tool mapping:** a `SKILL.md` describes goals, steps, guardrails, and the exact MCP tool names (or CLI commands) to use. The agent reads the skill and calls the MCP server (17) / CLI (18) to act. The skill contains no business logic of its own.
- **Frontmatter standard:** adopt the installable-skill frontmatter (`name`, `description`, optional `allowed-tools`). Keep `description` precise so an agent reliably selects the right skill.
- **Versioning:** each skill carries a version + the platform API/CLI version it targets; mismatch is surfaced (not silently broken).
- **Distribution:** bundled with the platform and installable locally first; publishable to the Marketplace later (23).

## Integration Points

- **Surface 2 (the agent surface): MCP (17) + Skills (this).** Skills are the "what to do"; MCP is the "how to do it."
- **Dashboard (19):** browse/install/manage skills.
- **Marketplace (23):** skills become a catalog item type (alongside templates).

## Verification (VPS)

```bash
# Install a skill into Claude Code / Desktop, with the MCP server (Phase 17) configured.
# Then prompt the agent:
#   "Use the fidscript-deploy skill to create a project called demo with a Postgres database and deploy it."
# → the agent follows the skill, calls real MCP tools (projects.create, databases.create, deployments.create),
#   and the result exists on the VPS:
fidscript project list -o json | jq '.[] | .name'        # 'demo' present
fidscript db list                                         # appdb present
curl -fsS "$(fidscript deployments list -o json | jq -r '.[0].url')"   # live

# Confirm frontmatter is valid + no fictional commands remain (grep the skill for any tool name not in the MCP tool list).
```

**Exit criterion:** a real, installable `SKILL.md`-frontmattered skill drives the platform through real MCP/CLI tools to a verified result on the VPS; references are real (no fictional commands); skills install/uninstall and are versioned. The plain-markdown stub is replaced.

## Out of Scope / Future

- Skill execution sandboxing — out of scope (the agent + MCP handle execution; skills are instructions).
- A visual skill builder — future.
- Cross-agent portability beyond Claude-family conventions — future.

## Risks

- Skills that reference tools that don't exist yet mislead the agent → only ship a skill after its tools verify; gate skill availability on MCP tool presence.
- Drift as the API evolves → version skills against API/CLI versions and surface mismatches.

## Files you'll touch (precision map)

- Stub at: `apps/mcp-server/fidscript-skill.md` (plain documentation — **no `SKILL.md` frontmatter**, references fictional commands).
- Create: a skills registry (e.g. `skills/` or `apps/skills/`) with installable `SKILL.md` files — `deploy`, `database`, `functions`, `domains`, `diagnose` — each driving the **real** Phase 17 MCP tools / Phase 18 CLI commands.
- Dashboard (Phase 19) browse/install UI; item type feeds the Phase 23 marketplace.

## Next Phase

[Phase 21: Templates Platform](./phase-21.md)
