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

import { validateScope } from './scope-validator.js';
import { allTools, dispatchTool } from './tool-dispatcher.js';

const apiKey = process.env.FIDSCRIPT_API_KEY;
const apiUrl = process.env.FIDSCRIPT_API_URL || 'http://localhost:3001';

if (!apiKey) {
  console.error('FIDSCRIPT_API_KEY environment variable is required');
  process.exit(1);
}

const sdk = createFidscript({ apiKey, baseURL: apiUrl });


const server = new Server(
  { name: 'fidscript-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Validate scope before execution
  const validation = await validateScope(apiUrl, apiKey, name);
  if (!validation.allowed) {
    return {
      content: [{ type: 'text', text: `Permission denied: ${validation.reason ?? 'insufficient scope for tool: ' + name}` }],
      isError: true,
    };
  }

  try {
    const { handled, result } = await dispatchTool(name, args, sdk);
    if (!handled) {
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
