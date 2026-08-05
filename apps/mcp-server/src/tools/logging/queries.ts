/**
 * Logging — Query, stats, timeline MCP tools.
 *
 * `query_logs` and `get_log_events` are aliases over the SDK's `getLogs`
 * (different parameter shapes for AI convenience). `tail_logs` uses the SDK's
 * streaming generator to return a bounded sample of the live stream.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export const logQueryTools: Tool[] = [
  {
    name: 'logging_queryLogs',
    description: 'Query log entries with filters.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        stream: { type: 'string', description: 'Filter by stream name' },
        level: { type: 'string', description: 'Minimum log level (debug|info|warn|error|fatal)' },
        startTime: { type: 'string', description: 'ISO timestamp lower bound' },
        endTime: { type: 'string', description: 'ISO timestamp upper bound' },
        search: { type: 'string', description: 'Full-text search across log messages' },
        limit: { type: 'number', description: 'Max entries (default 100)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'logging_getLogEvents',
    description: 'Get recent log events for a specific stream.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        streamName: { type: 'string', description: 'Stream name' },
        level: { type: 'string', description: 'Minimum log level' },
        search: { type: 'string', description: 'Full-text search' },
        limit: { type: 'number', description: 'Max entries (default 100)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
      required: ['projectId', 'streamName'],
    },
  },
  {
    name: 'logging_tailLogs',
    description: 'Tail a log stream for live entries (returns a bounded sample).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        stream: { type: 'string', description: 'Stream to tail (optional)' },
        level: { type: 'string', description: 'Minimum log level' },
        maxEntries: { type: 'number', description: 'Max entries to collect before returning (default 50)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'logging_getLogStats',
    description: 'Get aggregate log statistics (counts by level, stream count).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        stream: { type: 'string', description: 'Filter by stream (optional)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'logging_getLogTimeline',
    description: 'Get log timeline (counts bucketed over time).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        streamName: { type: 'string', description: 'Stream name' },
        interval: { type: 'string', description: 'Bucket interval (e.g. 1h, 1d)' },
      },
      required: ['projectId', 'streamName'],
    },
  },
];

export async function handleLogQueryTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'logging_queryLogs':
      return sdk.logs.getLogs(args['projectId'] as string, {
        stream: args['stream'] as string | undefined,
        level: args['level'] as string | undefined,
        startTime: args['startTime'] as string | undefined,
        endTime: args['endTime'] as string | undefined,
        search: args['search'] as string | undefined,
        limit: args['limit'] as number | undefined,
        cursor: args['cursor'] as string | undefined,
      });
    case 'logging_getLogEvents':
      return sdk.logs.getLogsByStream(args['projectId'] as string, args['streamName'] as string, {
        level: args['level'] as string | undefined,
        search: args['search'] as string | undefined,
        limit: args['limit'] as number | undefined,
        cursor: args['cursor'] as string | undefined,
      });
    case 'logging_tailLogs': {
      const projectId = args['projectId'] as string;
      const max = (args['maxEntries'] as number | undefined) ?? 50;
      const collected: LogEntry[] = [];
      for await (const entry of sdk.logs.streamLogs(projectId, {
        stream: args['stream'] as string | undefined,
        level: args['level'] as string | undefined,
      })) {
        collected.push(entry);
        if (collected.length >= max) break;
      }
      return { entries: collected, count: collected.length };
    }
    case 'logging_getLogStats':
      return sdk.logs.getStats(args['projectId'] as string, args['stream'] as string | undefined);
    case 'logging_getLogTimeline':
      return sdk.logs.getTimeline(
        args['projectId'] as string,
        args['streamName'] as string,
        args['interval'] as string | undefined,
      );
    default:
      throw new Error(`Unknown logging query tool: ${name}`);
  }
}
