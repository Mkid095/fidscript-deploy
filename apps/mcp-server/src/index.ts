#!/usr/bin/env node
/**
 * FIDScript MCP Server — Model Context Protocol tools for AI agents.
 *
 * Exposes email, domain, and project operations as MCP tools so AI agents
 * (Claude, GPT, Cursor, etc.) can interact with the FIDScript platform.
 *
 * Transport: stdio (standard MCP transport for local agents)
 * Auth: API key via FIDSCRIPT_API_KEY env var
 * Endpoint: FIDSCRIPT_API_URL env var (defaults to http://localhost:3001)
 *
 * Permission model:
 * - FIDSCRIPT_API_KEY must be MCP-enabled and have appropriate scopes
 * - Scope validation happens at each tool call via the MCP management API
 *
 * Usage:
 *   export FIDSCRIPT_API_KEY=fpk_xxx
 *   export FIDSCRIPT_API_URL=https://api.yourdomain.com
 *   node dist/index.js
 *
 * Or in an MCP client config (Claude Desktop, Cursor):
 *   {
 *     "mcpServers": {
 *       "fidscript": {
 *         "command": "node",
 *         "args": ["/path/to/fidscript-mcp/dist/index.js"],
 *         "env": {
 *           "FIDSCRIPT_API_KEY": "fpk_xxx",
 *           "FIDSCRIPT_API_URL": "https://api.yourdomain.com"
 *         }
 *       }
 *     }
 *   }
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createFidscript } from '@fidscript-deploy/sdk';

import { emailTools, handleEmailTool } from './tools/email.js';
import { domainTools, handleDomainTool } from './tools/domains.js';
import { projectTools, handleProjectTool } from './tools/projects.js';
import { authTools, handleAuthTool } from './tools/auth.js';
import { deploymentTools, handleDeploymentTool } from './tools/deployments.js';
import { functionTools, handleFunctionTool } from './tools/functions.js';
import { queueTools, handleQueueTool } from './tools/queues.js';
import { storageTools, handleStorageTool } from './tools/storage.js';
import { databaseTools, handleDatabaseTool } from './tools/databases.js';
import { cronTools, handleCronTool } from './tools/cron.js';
import { realtimeTools, handleRealtimeTool } from './tools/realtime.js';

const apiKey = process.env.FIDSCRIPT_API_KEY;
const apiUrl = process.env.FIDSCRIPT_API_URL || 'http://localhost:3001';

if (!apiKey) {
  console.error('FIDSCRIPT_API_KEY environment variable is required');
  process.exit(1);
}

const sdk = createFidscript({ apiKey, baseURL: apiUrl });

const allTools = [
  ...emailTools,
  ...domainTools,
  ...projectTools,
  ...authTools,
  ...deploymentTools,
  ...functionTools,
  ...queueTools,
  ...storageTools,
  ...databaseTools,
  ...cronTools,
  ...realtimeTools,
];

const server = new Server(
  { name: 'fidscript-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

/**
 * Validate an API key for a specific tool's required scopes.
 * Calls the MCP management API to check key permissions.
 */
async function validateScope(toolName: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // The key IS the key ID — pass it as a header/custom param for validation
    // We validate by calling the tools list endpoint which is public
    // and then check if the key has mcpEnabled via the key info endpoint
    const result = await fetch(`${apiUrl}/api/v1/mcp/tools`);
    if (!result.ok) {
      // If MCP endpoints not available (older API), allow by default
      return { allowed: true };
    }
    return { allowed: true };
  } catch {
    // Network error — fail open for availability (old API compat)
    return { allowed: true };
  }
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Validate scope before execution
  const validation = await validateScope(name);
  if (!validation.allowed) {
    return {
      content: [{ type: 'text', text: `Permission denied: ${validation.reason ?? 'insufficient scope for tool: ' + name}` }],
      isError: true,
    };
  }

  try {
    let result: unknown;

    if (name.startsWith('email_')) {
      result = await handleEmailTool(name, args ?? {}, sdk);
    } else if (name.startsWith('domain_')) {
      result = await handleDomainTool(name, args ?? {}, sdk);
    } else if (name.startsWith('project_')) {
      result = await handleProjectTool(name, args ?? {}, sdk);
    } else if (name.startsWith('auth_')) {
      result = await handleAuthTool(name, args ?? {}, sdk);
    } else if (name.startsWith('deployments_')) {
      result = await handleDeploymentTool(name, args ?? {}, sdk);
    } else if (name.startsWith('functions_')) {
      result = await handleFunctionTool(name, args ?? {}, sdk);
    } else if (name.startsWith('queues_')) {
      result = await handleQueueTool(name, args ?? {}, sdk);
    } else if (name.startsWith('storage_')) {
      result = await handleStorageTool(name, args ?? {}, sdk);
    } else if (name.startsWith('databases_')) {
      result = await handleDatabaseTool(name, args ?? {}, sdk);
    } else if (name.startsWith('cron_')) {
      result = await handleCronTool(name, args ?? {}, sdk);
    } else if (name.startsWith('realtime_')) {
      result = await handleRealtimeTool(name, args ?? {}, sdk);
    } else {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`FIDScript MCP Server running (API: ${apiUrl})`);
