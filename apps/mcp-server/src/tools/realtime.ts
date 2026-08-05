/**
 * Realtime MCP tools — exposes realtime channel and presence operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const realtimeTools: Tool[] = [
  {
    name: 'realtime_listChannels',
    description: 'List all realtime channels in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'realtime_createChannel',
    description: 'Create a new realtime channel.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Channel name' },
        isPrivate: { type: 'boolean', description: 'Whether channel is private (default false)' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'realtime_deleteChannel',
    description: 'Delete a realtime channel.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        channelId: { type: 'string', description: 'Channel ID' },
      },
      required: ['projectId', 'channelId'],
    },
  },
  {
    name: 'realtime_setPresence',
    description: 'Set the current user\'s presence status.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        channelId: { type: 'string', description: 'Channel ID to set presence in (optional)' },
        status: { type: 'string', enum: ['online', 'away', 'busy', 'offline'], description: 'Presence status' },
      },
      required: ['status'],
    },
  },
];

export async function handleRealtimeTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'realtime_listChannels':
      return sdk.realtime.listChannels(args.projectId as string);

    case 'realtime_createChannel':
      return sdk.realtime.createChannel(
        args.projectId as string,
        args.name as string,
        args.isPrivate as boolean | undefined,
      );

    case 'realtime_deleteChannel':
      return sdk.realtime.deleteChannel(args.projectId as string, args.channelId as string);

    case 'realtime_setPresence':
      return sdk.realtime.setPresence(
        args.status as 'online' | 'away' | 'busy' | 'offline',
        args.channelId as string | undefined,
      );

    default:
      throw new Error(`Unknown realtime tool: ${name}`);
  }
}
