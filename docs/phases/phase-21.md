# Phase 21: Templates Platform

> **Status:** Planned  |  **Track:** Ecosystem  |  **Depends on:** Phase 04, Phase 05, Phase 06, Phase 18

## Objective

Templates that **produce real, deployable projects**: pick a template, fill in variables, and the platform generates a real file tree and **deploys it live**. Today "generate" creates one `Project` row and returns a string that goes nowhere — no files, no repo, no deploy.

## Current State

**STUB.** See `docs/AUDIT.md` §C (Templates). Specific defects:

- `{{var}}` substitution is real — the templating mechanic works.
- But "generate a project" creates **one `Project` row** and returns a **string that goes nowhere**. No files are written, no source is produced, no deployment happens.

## Dependencies

- **Phase 04** (a generated project is a Project).
- **Phase 05** (object storage for generated source archives).
- **Phase 06** (a generated project can be **deployed** — generation's payoff).
- **Phase 18** (`fidscript init --template`).

## Deliverables

- [ ] **Real generation.** A template is a real file tree (a git repo or a tarball in Storage) with `{{var}}` placeholders in **file names and content**. `generate` renders it into real files → materialized as a source archive in Storage (05) (and/or a new git repo), ready to be a deployment source.
- [ ] **Generate → deploy, end-to-end.** From a template, the platform generates the source and feeds it into the Deployment Engine (06) → a live URL. The template's promise is realized: one click (or one command) to a running app.
- [ ] **Variables.** Typed variables (string/choice/bool/secret) with validation, defaults, and descriptions; substituted safely (no code-eval templating — text replacement or a safe engine).
- [ ] **Official templates.** A starter catalog: static site, Node API, full-stack (with DB), Python function — each a real, working, deployable template.
- [ ] **Template authoring.** A spec + CLI (`fidscript template new/pack`) to author and validate a template before submission.
- [ ] **Browse + generate UI/CLI.** Dashboard gallery + `fidscript init --template <id>` in the CLI.

## Technical Design

- **Template = source + manifest:** a `template.json` (variables, files, post-generation steps) + a file tree with placeholders. Rendering produces a deterministic source bundle; secrets-as-variables are injected at deploy time (Phase 04), not baked into the bundle.
- **Pipeline:** `generate(templateId, vars)` → render → upload archive to Storage (05) → create `Project` (04) → create `Deployment` with `source = { type:'storage-archive', id }` (06) → return the live URL when ready. This is the concrete demonstration of the whole platform working together.
- **Safety:** no shell/exec during templating; file path traversal blocked; variable values sanitized.

## Integration Points

- **Events emitted:** `templates.template.applied`, `templates.project.generated`. Consumed by audit (02).
- **Service registry:** registers `templates`.
- **SDK (16):** `templates.list/get/generate`.
- **CLI (18):** `fidscript init --template <id>`, `fidscript template new/pack`.
- **Dashboard (19):** template gallery + generate+deploy flow.
- **Marketplace (23):** community templates are a catalog item type.

## Verification (VPS)

```bash
# Pick a template, fill vars, generate + deploy:
curl -fsS -X POST .../api/v1/templates/node-api/generate \
  -d '{"vars":{"name":"hello"},"deploy":true}' | jq .deploymentUrl
# → a real URL that serves the generated app:
curl -fsS "$(...)"          # 200, content from the generated project

# Or via CLI:
fidscript init --template node-api hello && cd hello && fidscript deploy   # live

# Generated source is real (archived in storage), not just a Project row:
fidscript storage ls ...
```

**Exit criterion:** a template generates real files and deploys to a live URL; variables substitute correctly in file names and content; generation + deploy is a single working flow. The "create one row + return a string" stub is gone.

## Out of Scope / Future

- Community template signing / verification — folds into Marketplace (23).
- Multi-file diff/merge templating — future.
- "Init into an existing repo" / monorepo generation — future.

## Risks

- Templates that don't deploy cleanly undermine trust → each official template is a prove-it (generate → deploy → live) before shipping.
- Secret variables baked into generated source → always inject at deploy time, never persist into the bundle.

## Next Phase

[Phase 22: AI Layer](./phase-22.md)
