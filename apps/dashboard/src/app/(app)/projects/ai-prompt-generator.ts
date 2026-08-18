/**
 * ai-prompt-generator.ts
 * Generates the dynamic AI agent instructions shown in the AI Control Center.
 * The raw API key is NEVER embedded — only the prefix for display.
 */

import { SCOPE_DEFINITIONS } from './ai-control-center-data';

export interface AccountKey {
  id: string;
  name: string;
  keyPrefix: string;          // e.g. "fsk_a1b2c3d4"
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
}

export function getAiPrompt(key: AccountKey, apiUrl: string): string {
  const grantedScopes = key.permissions
    .map(s => SCOPE_DEFINITIONS[s])
    .filter(Boolean);

  const scopeList = grantedScopes.length
    ? grantedScopes.map(s => `  - ${s.label} — ${s.description}`).join('\n')
    : '  (no scopes granted — key can only list and create projects)';

  const expiryNote = key.expiresAt
    ? `**Expires:** ${new Date(key.expiresAt).toLocaleDateString()}`
    : '**Expires:** never';

  return `You are an AI agent operating a FIDScript Deploy account via MCP.

AUTHENTICATION:
Provide your API key using the X-API-Key header:
  X-API-Key: ${key.keyPrefix}...

PLATFORM API: ${apiUrl}

YOUR GRANTED SCOPES:
${scopeList}
${expiryNote}

IMPORTANT — TWO-KEY MODEL:
Most FIDScript tools (email, functions, storage, databases, queues, cron,
deployments, domains, monitoring, logging) require a projectId and a Project
API Key (fpk_...). To use these tools:

1. First create or select a project using your Account API Key (fsk_...):
     project_list    → discover existing projects
     project_create  → create a new project (returns projectId)

2. Then create a Project API Key for that project:
     SDK:  sdk.projects.createApiKey(projectId, 'MCP Integration')
     CLI:  fidscript projects api-key create <projectId> 'MCP Integration'
     HTTP: POST /api/v1/projects/:projectId/api-keys

3. Use the returned fpk_ key for all project-scoped tools.

Account-level tools (no projectId needed):
  project_list, project_create,
  auth_* tools (sessions and keys),
  marketplace_* tools,
  realtime_setPresence,
  logging_ingestLogs

OPERATING RULES:
1. Enumerate available resources before creating new ones
2. Confirm destructive operations (delete, drop, revoke) before executing
3. Never attempt operations outside your granted scopes
4. Report errors with endpoint path and HTTP status code
5. Use MCP (recommended), CLI: fidscript <cmd>, SDK, or REST as appropriate`;
}
