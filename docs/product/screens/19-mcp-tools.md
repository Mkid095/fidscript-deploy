# Screen Spec — `McpToolsTab`

> Per-project MCP tools tab at `/dashboard/projects/:id/mcp?tab=tools` (F11). The
> operator's view of the MCP server's tool manifest for this project.

## 1. Purpose
The user browses the MCP server's 108 tools — what they do, which inventory IDs they map
to, and how to use them. The principle: **MCP is the project's API surface for LLMs; the
UI shows every tool at a glance.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/mcp?tab=tools` (default tab).
- **Permission:** any member (`O/A/D/V`); read-only.
- **Project scope:** the tools are scoped to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › MCP › Tools                                       │
├──────────────────────────────────────────────────────────────────────┤
│ MCP server exposes 108 tools across this project.                    │
│ [Search tools...]   Cluster: [All ▼]                                 │
├──────────────────────────────────────────────────────────────────────┤
│ projects                                                                │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ projects_list     List projects in the workspace                  ││
│ │                   Inventory: PROJ-01                              ││
│ │                   [Open docs]                                     ││
│ ├──────────────────────────────────────────────────────────────────┤│
│ │ projects_create   Create a new project                            ││
│ │                   Inventory: PROJ-02                              ││
│ │                   [Open docs]                                     ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ deployments                                                           │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ deployments_create  Create a new deployment                       ││
│ │                     Inventory: DEPL-02                            ││
│ │                     [Open docs]                                   ││
│ └──────────────────────────────────────────────────────────────────┘│
│ ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Search input**: filters by tool name + description; live count.
- **Cluster filter**: dropdown (All | Auth | Projects | Deployments | Functions | …).
- **Tool groups**: grouped by inventory cluster (the first segment of the inventory ID).
- **Per-tool row**:
  - **Name** (mono).
  - **Description** (one-line).
  - **Inventory ID** (e.g. `PROJ-01`).
  - **"Open docs"** link (to the API reference, if exists).
- **Empty state**: "No tools match your search." (search-only; the manifest always has 108
  entries).

## 5. Primary + secondary actions
- **No primary action** (the tab is read-only).
- **Per-tool**: "Open docs" link.

## 6. API mapping
- **List tools** — fetched from the MCP server (`/tools` or the WS gateway's tool list).
  The UI caches it per project.
- **Inventory ID** — derived from the tool's metadata; the UI maps each tool to its
  inventory ID for the cross-reference.

## 7. Forms + validation
- **No data-entry forms.** The screen is read-only.

## 8. Accessibility
- **Focus order**: search → cluster filter → tool groups → per-tool rows.
- **Search**: `role="searchbox"`; live count announced via `aria-live="polite"`.
- **Tool rows**: each row is `role="article"` with the tool name as `aria-label`.
- **Cluster filter**: `role="combobox"`; the options are the inventory clusters.

## 9. Cross-references
- **Phase**: F11 MCP UI §6.
- **Service spec**: `docs/product/services/mcp.md`.
- **Journey**: AI agent operator's "what tools does the MCP server expose?" flow.
- **Navigation**: MCP section's Tools tab (default).
- **Related screens**: MCP → API Key, MCP → Connect.

## 10. Acceptance criteria
1. The tab opens at `/dashboard/projects/:id/mcp?tab=tools`; the search input is
   focused.
2. The manifest lists 108 tools grouped by inventory cluster.
3. The search input filters by name + description; the live count updates.
4. The cluster filter scopes the list to a single cluster.
5. Each tool shows name, description, inventory ID, "Open docs" link.
6. The empty state is "No tools match your search." (when search has no matches).
7. The tab is realtime-cached: opening the tab on two devices shows the same tools.
8. The manifest is the same per project (the tools are project-scoped, but the inventory
   is shared).