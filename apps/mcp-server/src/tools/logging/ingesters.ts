/**
 * Logging — Ingester MCP tools (config + ingest).
 *
 * Log ingesters (config CRUD) are not yet first-class API endpoints, so
 * `create_log_ingester` / `update_log_ingester` call the expected URL and
 * surface the API's response. `ingest_logs` (the actual ingest action) uses
 * the SDK's bulk-ingest path (X-API-Key auth, separate from JWT).
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

const apiUrl = process.env.FIDSCRIPT_API_URL || 'http://localhost:3001';
const apiKey = process.env.FIDSCRIPT_API_KEY ?? '';

async function callApi(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return res.json();
}

export const ingesterTools: Tool[] = [
  {
    name: 'logging_createLogIngester',
    description: 'Create a log ingester configuration for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Ingester name' },
        source: { type: 'string', description: 'Source identifier (e.g. syslog, app, otlp)' },
        streamName: { type: 'string', description: 'Target log stream name' },
        config: { type: 'object', description: 'Source-specific configuration' },
      },
      required: ['projectId', 'name', 'source', 'streamName'],
    },
  },
  {
    name: 'logging_updateLogIngester',
    description: 'Update a log ingester configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        ingesterId: { type: 'string', description: 'Ingester ID' },
        name: { type: 'string', description: 'Ingester name' },
        source: { type: 'string', description: 'Source identifier' },
        streamName: { type: 'string', description: 'Target log stream name' },
        config: { type: 'object', description: 'Source-specific configuration' },
        enabled: { type: 'boolean', description: 'Whether the ingester is enabled' },
      },
      required: ['projectId', 'ingesterId'],
    },
  },
  {
    name: 'logging_ingestLogs',
    description: 'Bulk-ingest log entries using the project API key.',
    inputSchema: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          description: 'Log entries to ingest',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string', enum: ['debug', 'info', 'warn', 'error', 'fatal'] },
              source: { type: 'string' },
              message: { type: 'string' },
              metadata: { type: 'object' },
              correlationId: { type: 'string' },
              timestamp: { type: 'string' },
            },
            required: ['level', 'source', 'message'],
          },
        },
      },
      required: ['entries'],
    },
  },
];

export async function handleIngesterTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  const projectId = args['projectId'] as string;
  switch (name) {
    case 'logging_createLogIngester':
      return callApi(`/api/v1/projects/${projectId}/logs/ingesters`, 'POST', {
        name: args['name'],
        source: args['source'],
        streamName: args['streamName'],
        config: args['config'],
      });
    case 'logging_updateLogIngester':
      return callApi(
        `/api/v1/projects/${projectId}/logs/ingesters/${args['ingesterId']}`,
        'PATCH',
        {
          name: args['name'],
          source: args['source'],
          streamName: args['streamName'],
          config: args['config'],
          enabled: args['enabled'],
        },
      );
    case 'logging_ingestLogs':
      return sdk.logs.ingest(
        apiKey,
        args['entries'] as Parameters<typeof sdk.logs.ingest>[1],
      );
    default:
      throw new Error(`Unknown logging ingester tool: ${name}`);
  }
}
