# Phase 18: CLI Platform

> **Status:** Planned  |  **Track:** Surfaces  |  **Depends on:** Phase 16

## Objective

A `fidscript` command-line tool — the third access surface — that lets a developer manage the entire platform from the terminal: log in, create a project, deploy from a directory, tail logs, run a function, back up a database. Today **no CLI exists at all** (no `bin`, no `commander`/`inquirer`).

## Current State

**MISSING.** See `docs/AUDIT.md` §D (CLI). No CLI binary, no command framework, no entrypoint. One of the three required surfaces is simply absent.

## Dependencies

- **Phase 16** (the SDK — the CLI is a thin, ergonomic shell over it; it should never re-implement HTTP calls).

## Deliverables

- [ ] **A distributable `fidscript` binary.** Node + `commander`, with a `bin` entry (`apps/cli` or `packages/cli`), installable via `npm i -g` (or `npx` from a published package / tarball).
- [ ] **Auth.** `fidscript login` accepts an API key (or a browser/device flow) → stores credentials in a config dir (`~/.fidscript`); `fidscript logout`; `fidscript whoami`.
- [ ] **Project context.** `fidscript project create/list/use` — `use` sets the current project (persisted) so subsequent commands don't repeat `--project`.
- [ ] **Deploy.** `fidscript deploy` from a project directory (detect source: Dockerfile/git/archive), streams build logs to the terminal, prints the live URL on success. `fidscript deployments list/logs/rollback/destroy`.
- [ ] **Resource commands** mirroring the API: `db create/backup/restore/conn`, `fn new/deploy/invoke/logs`, `storage upload/get/ls`, `domains add/verify`, `env set/get/list`, `queues push/consume`, `cron list/create/run`, `logs query/tail`, `metrics query`, `alerts list`.
- [ ] **Realtime tail.** `fidscript logs tail` and deployment-status watch via Phase 13.
- [ ] **Scaffold.** `fidscript init` generates a starter project (Dockerfile + config).
- [ ] **DX.** Table + JSON output (`-o json`), `--quiet`, shell completion, `fidscript version`/`update`, helpful errors and `--help` everywhere. No emojis (Rule 9).

## Technical Design

- **Built on the SDK (16):** commands parse args → call SDK methods → format output. Auth/credentials and "current project" live in `~/.fidscript/config.json` (perms `0600`).
- **Commander** subcommand tree; `inquirer`/`@inquirer/prompts` for interactive flows (login, project selection). Streaming logs use the SDK's streaming/realtime.
- **Config:** `~/.fidscript/{config.json, credentials}` — credentials file holds the API key/token (never printed); a `currentProject` per-host.
- **Output:** a single formatter layer (table/json/raw) so commands stay small.

## Integration Points

- **Surface 3 of 3.** Consumes the SDK (16) + API. Pairs with Skills (20) — the skill can instruct an agent to run CLI commands, or call MCP directly; both reach the same platform.

## Verification (VPS)

```bash
fidscript login            # API key → stored
fidscript whoami           # echoes the user
fidscript project create demo && fidscript project use demo
fidscript deploy           # from a dir with a Dockerfile → streams logs → prints live URL
curl -fsS "$(fidscript deployments list -o json | jq -r '.[0].url')"   # live
fidscript db create appdb
fidscript db conn appdb    # prints a working connection string
fidscript fn new hello && fidscript fn deploy hello && fidscript fn invoke hello -d '{}'
fidscript logs tail        # streams live logs
fidscript deployments rollback
fidscript deployments list -o json   # machine-readable
```

**Exit criterion:** `fidscript login → project create → deploy → logs tail → db/fn/storage` all work end-to-end against the VPS; output is scriptable (`-o json`); credentials are stored safely. The third surface exists.

## Out of Scope / Future

- Auto-update/in-place upgrade mechanics beyond `update` → npm — future.
- Plugin/extension system — future.
- Native (non-Node) distribution — future (could compile via pkg/bun).

## Risks

- Credential file leakage → `0600` perms, never log secrets, document revocation (`fidscript logout` + API-key revoke in 03).
- Drift between CLI commands and API if built by hand → build strictly over the SDK; if a capability is in the SDK it should have a command.

## Next Phase

[Phase 19: Dashboard Platform](./phase-19.md)
