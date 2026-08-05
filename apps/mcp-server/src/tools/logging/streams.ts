/**
 * Logging — Log stream MCP tools (CRUD).
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const logStreamTools: Tool[] = [
  {
    name: 'logging_listLogStreams',
    description: 'List all log streams for a project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'logging_createLogStream',
    description: 'Create a new log stream for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Stream name' },
        type: { type: 'string', description: 'Stream type (e.g. application, system, audit)' },
        retentionDays: { type: 'number', description: 'Days to retain logs (optional)' },
      },
      required: ['projectId', 'name', 'type'],
    },
  },
  {
    name: 'logging_getLogStream',
    description: 'Get a specific log stream.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        streamId: { type: 'string', description: 'Log stream ID' },
      },
      required: ['projectId', 'streamId'],
    },
  },
  {
    name: 'logging_deleteLogStream',
    description: 'Delete a log stream and all its entries.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        streamId: { type: 'string', description: 'Log stream ID' },
      },
      required: ['projectId', 'streamId'],
    },
  },
];

export async function handleLogStreamTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'logging_listLogStreams':
      return sdk.logs.listStreams(args['projectId'] as string);
    case 'logging_createLogStream':
      return sdk.logs.createStream(
        args['projectId'] as string,
        args['name'] as string,
        args['type'] as string,
        args['retentionDays'] as number | undefined,
      );
    case 'logging_getLogStream':
      return sdk.logs.getStream(args['projectId'] as string, args['streamId'] as string);
    case 'logging_deleteLogStream':
      return sdk.logs.deleteStream(args['projectId'] as string, args['streamId'] as string);
    default:
      throw new Error(`Unknown logging stream tool: ${name}`);
  }
}
