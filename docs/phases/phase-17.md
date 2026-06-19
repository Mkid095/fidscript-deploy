# Phase 17: MCP Platform

> **Status:** In Progress  |  **Track:** Surfaces  |  **Depends on:** Phase 16, Phase 03

## Objective

A Model Context Protocol server that lets coding agents (Claude Code, Claude Desktop, Cursor) **operate the platform** — list projects, deploy, invoke functions, query logs, manage databases — through real, working tools.

## Current State

**IN PROGRESS.**

- The modular `tools/*` + `handlers.ts` + `server.ts` path is **real and live** — `initialize` + `tools/list` return structured tool schemas (verified).
- `@modelcontextprotocol/sdk@0.5.0` is installed and the server starts on stdio.
- `install.sh` fixed to point at the built `dist/server.js` with Node.js (no more `npx` of an unpublished package).
- All platform modules exposed as MCP tools: auth, projects, deployments, storage, databases, email, functions, queues, cron, realtime, monitoring, logging, AI, marketplace.

## Dependencies

- **Phase 16** (the SDK — the MCP server should be a thin layer over it, not a second HTTP client).
- **Phase 03** (auth: the server authenticates to the API with a token/API key).
- **Phase 00** (lockfile reconciled so the MCP SDK is actually installed).

## Deliverables

- [ ] **Delete the dead `index.ts`** duplicate; the modular `server.ts` path is the one and only entrypoint.
- [ ] **Starts for real.** `@modelcontextprotocol/sdk` is in the lockfile (Phase 00) and `apps/mcp-server` builds and runs.
- [ ] **Transports.** stdio (local, for Claude Code/Desktop) and HTTP/SSE (remote) transports both supported.
- [ ] **Authentication.** The server authenticates to the API via a configured API key/token (`FIDSCRIPT_API_KEY`/`_FILE`); optionally exposes its own bearer for the HTTP transport. Optionally OAuth for end-user agents.
- [ ] **`tools/list` + tool calls work.** A client can enumerate tools and invoke one that returns a real result from the VPS.
- [ ] **Tool coverage.** Map the platform's capabilities to MCP tools — driven from the SDK (16): `projects.*`, `deployments.create/logs/rollback`, `functions.invoke`, `databases.create/backup/restore`, `storage.upload`, `domains.add/verify`, `queues.publish`, `logs.query`, `scheduler.*`. Generate/adapt from the SDK to avoid drift.
- [ ] **Scoped permissions.** A server can be configured to expose only a subset of tools/projects (least-privilege for an agent).
- [ ] **Long operations.** Deployments/builds stream progress (MCP progress notifications) rather than blocking.
- [ ] **Install story fixed.** Document adding the server to Claude Desktop / Claude Code / Cursor configs with the real command/path; `install.sh` no longer `npx`s an unpublished package (it points at the built server or a published one).

## Technical Design

- **Thin layer over the SDK (16):** each MCP tool handler calls the corresponding SDK method; the SDK owns auth, retries, types, and pagination. This kills drift and duplication.
- **Tool definition:** name, JSON-schema input, description (rich enough for an agent to choose correctly). Output is structured (text + JSON) per MCP.
- **Auth:** the server holds a platform API key (project- or user-scoped); for the HTTP transport, clients present a bearer the server validates. Document the scoping so an agent can't exceed intended access.
- **Progress:** long calls (deploy, backup) use MCP progress tokens; the underlying SDK streams build logs.

## Integration Points

- **Surface 2 of 3** (Dashboard, **MCP+Skills**, CLI). Consumed by Claude/agents; consumes the SDK + API.
- **Paired with Skills (20):** the Claude skill is the *instructions* an agent follows; the MCP server is the *hands* it uses.
- **Service registry:** the server can expose its own tool list (and discover other services via the registry).

## Verification (VPS)

```bash
# The server starts and lists tools:
node apps/mcp-server/dist/main.js --stdio   # then JSON-RPC initialize + tools/list → real tool list

# Or against the running HTTP transport:
curl -fsS https://deploy.fidscript.com/mcp/tools -H "Authorization: Bearer ..."   # tool list

# End-to-end via a real client: add to Claude Code/Desktop config, then ask the agent:
#   "create a project called demo and deploy it"
# → the agent calls projects.create + deployments.create via MCP → real project + deployment exist on the VPS

# Confirm the dead index.ts is gone and tools/* is the sole path.
```

**Exit criterion:** the MCP server builds and starts; a client enumerates tools and a tool call returns a real result from the VPS; an agent can perform a real workflow (create + deploy) through it. The 1526-line duplicate is deleted; no `npx` of an unpublished package.

## Out of Scope / Future

- Resources/prompts (MCP resources beyond tools) — future.
- Agent-side memory/persistence — out of scope (that's the client's job).
- OAuth with multiple providers — future (API key / bearer now).

## Risks

- An agent with a powerful API key can do real damage (deploy, delete) → scope keys per project, default to read tools, document least-privilege.
- Tool descriptions too thin → agents misuse tools; invest in clear schemas + descriptions.

## Files you'll touch (precision map)

- `apps/mcp-server/install.sh` — fixed to point at `node dist/server.js` instead of `npx` of unpublished package.
- Remaining: bearer/API-key auth (FIDSCRIPT_API_KEY wired already), scoped tool subset per token, progress notifications for long ops (deploy/build streaming).

## Next Phase

[Phase 18: CLI Platform](./phase-18.md)
