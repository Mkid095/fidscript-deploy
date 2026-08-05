/**
 * Queues MCP tools — exposes queue operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const queueTools: Tool[] = [
  {
    name: 'queues_list',
    description: 'List all queues in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'queues_get',
    description: 'Get details of a specific queue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        queueId: { type: 'string', description: 'Queue ID' },
      },
      required: ['projectId', 'queueId'],
    },
  },
  {
    name: 'queues_create',
    description: 'Create a new queue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Queue name' },
        type: { type: 'string', description: 'Queue type (optional)' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'queues_delete',
    description: 'Delete a queue and all its messages.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        queueId: { type: 'string', description: 'Queue ID' },
      },
      required: ['projectId', 'queueId'],
    },
  },
  {
    name: 'queues_publish',
    description: 'Publish a message to a queue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        queueId: { type: 'string', description: 'Queue ID' },
        data: { type: 'string', description: 'Message body (string or JSON-serializable object)' },
        headers: { type: 'object', description: 'Optional message headers' },
      },
      required: ['projectId', 'queueId', 'data'],
    },
  },
  {
    name: 'queues_getMessages',
    description: 'Get messages from a queue without consuming them.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        queueId: { type: 'string', description: 'Queue ID' },
        status: { type: 'string', description: 'Filter by message status (optional)' },
        limit: { type: 'number', description: 'Max messages to return (default 10)' },
        cursor: { type: 'string', description: 'Pagination cursor (optional)' },
      },
      required: ['projectId', 'queueId'],
    },
  },
];

export async function handleQueueTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'queues_list':
      return sdk.queues.list(args.projectId as string);

    case 'queues_get':
      return sdk.queues.get(args.projectId as string, args.queueId as string);

    case 'queues_create':
      return sdk.queues.create(args.projectId as string, {
        name: args.name as string,
        type: args.type as string | undefined,
      });

    case 'queues_delete':
      return sdk.queues.delete(args.projectId as string, args.queueId as string);

    case 'queues_publish':
      return sdk.queues.publish(
        args.projectId as string,
        args.queueId as string,
        args.data as string | object,
        args.headers as Record<string, string> | undefined,
      );

    case 'queues_getMessages':
      return sdk.queues.getMessages(args.projectId as string, args.queueId as string, {
        status: args.status as string | undefined,
        limit: args.limit as number | undefined,
        cursor: args.cursor as string | undefined,
      });

    default:
      throw new Error(`Unknown queue tool: ${name}`);
  }
}
