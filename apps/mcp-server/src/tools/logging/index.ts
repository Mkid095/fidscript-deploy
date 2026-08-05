/**
 * Logging MCP tools — aggregated tool list and dispatcher.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { logStreamTools, handleLogStreamTool } from './streams.js';
import { logQueryTools, handleLogQueryTool } from './queries.js';
import { ingesterTools, handleIngesterTool } from './ingesters.js';

export const loggingTools: Tool[] = [
  ...logStreamTools,
  ...logQueryTools,
  ...ingesterTools,
];

export async function handleLoggingTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  if (name.endsWith('LogStream') || name === 'logging_deleteLogStream') {
    return handleLogStreamTool(name, args, sdk);
  }
  if (
    name === 'logging_queryLogs' ||
    name === 'logging_getLogEvents' ||
    name === 'logging_tailLogs' ||
    name === 'logging_getLogStats' ||
    name === 'logging_getLogTimeline'
  ) {
    return handleLogQueryTool(name, args, sdk);
  }
  if (
    name === 'logging_createLogIngester' ||
    name === 'logging_updateLogIngester' ||
    name === 'logging_ingestLogs'
  ) {
    return handleIngesterTool(name, args, sdk);
  }
  throw new Error(`Unknown logging tool: ${name}`);
}
