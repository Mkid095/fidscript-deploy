# Service: MCP (Model Context Protocol)

Exposes the platform as a set of MCP tools for LLMs, plus the per-project API key + connect snippet
that an LLM client (Claude/Cursor/…) uses.

## 1. Purpose
Drive the whole platform from an LLM — "create a database, deploy this repo, rotate the key" —
through the MCP server at `apps/mcp-server/` (stdio transport; 108 tools). The dashboard surfaces
the tool catalog + a connect snippet so a user can wire their IDE/agent in two clicks.

## 2. Screens
- **MCP** (sidebar §14): tabs *Tools / API Key / Connect*.
- **Tools tab** — searchable catalog of every MCP tool (name, what it does, related inventory ID).
- **Connect tab** — copy-pasteable JSON snippet for Claude/Cursor (stdio transport, env vars
  with the API key + platform URL).

## 3. Data model
- No new tables. The MCP server is a **thin proxy** over the SDK (`@fidscript/sdk`) → API.

## 4. API mapping
**The MCP server exposes 108 tools across** (see `backend/surfaces.md` → MCP): auth(6), projects(10),
deployments(6), storage(7), databases(8), email(8), functions(9), queues(9), cron(8), realtime(4),
monitoring(10), logging(6), app-auth(7), ai(10), marketplace(9).

**Tools vs API:** every tool corresponds to one or more inventory endpoints (e.g. `auth_login` →
`AUTH-02`; `deploy_function` → `FN-06`). Cross-reference inventory IDs in the *Tools* tab.

## 5. Realtime events
The MCP server does not emit or subscribe — it's a stateless proxy. Events flow through the
SDK/HTTP as normal.

## 6. Settings
- **Per-project API key** (`fpk_…`, PROJ-20) — the same key the SDK uses. The *Connect* tab shows
  it once; the user copies it into their IDE config.
- **Platform URL** — the dashboard auto-fills the current host.

## 7. Automation
- **Tool catalog** is derived from the MCP server's tool registration (build-time). The dashboard
  reads the manifest to render the *Tools* tab.
- **Connect snippet** is templated; the user pastes into Claude Desktop config (`claude_desktop_config.json`)
  or Cursor (`~/.cursor/mcp.json`).

## 8. Dependencies
- **Hard:** the MCP server at `apps/mcp-server/`; `@fidscript/sdk`; a project API key.
- **Soft:** any MCP-compatible client.
- **Backend gaps** (from the audit):
  - MCP does **not** yet expose tools for templates, skills, or registry/health. The *Tools* tab
    surfaces only the 108 existing tools and labels the gaps honestly.
  - SDK and MCP coverage are uneven (the audit confirmed templates present in MCP, skills not).

## 9. Phase
**F11** — pending spec.
