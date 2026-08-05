/**
 * Monitoring — Notification channel MCP tools.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const notificationChannelTools: Tool[] = [
  {
    name: 'monitoring_listNotificationChannels',
    description: 'List all notification channels for a project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'monitoring_createNotificationChannel',
    description: 'Create a new notification channel (email, webhook, or slack).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Channel name' },
        type: { type: 'string', enum: ['email', 'webhook', 'slack'], description: 'Channel type' },
        config: { type: 'object', description: 'Type-specific configuration (e.g. {address}, {url}, {webhookUrl})' },
      },
      required: ['projectId', 'name', 'type', 'config'],
    },
  },
  {
    name: 'monitoring_getNotificationChannel',
    description: 'Get a specific notification channel.',
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
    name: 'monitoring_updateNotificationChannel',
    description: 'Update an existing notification channel.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        channelId: { type: 'string', description: 'Channel ID' },
        name: { type: 'string', description: 'Channel name' },
        config: { type: 'object', description: 'Type-specific configuration' },
      },
      required: ['projectId', 'channelId'],
    },
  },
  {
    name: 'monitoring_deleteNotificationChannel',
    description: 'Delete a notification channel.',
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
    name: 'monitoring_testNotificationChannel',
    description: 'Send a test notification through a channel.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        channelId: { type: 'string', description: 'Channel ID' },
      },
      required: ['projectId', 'channelId'],
    },
  },
];

export async function handleNotificationChannelTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'monitoring_listNotificationChannels':
      return sdk.monitoring.listNotificationChannels(args['projectId'] as string);
    case 'monitoring_createNotificationChannel':
      return sdk.monitoring.createNotificationChannel(
        args['projectId'] as string,
        args['name'] as string,
        args['type'] as string,
        args['config'] as Record<string, string>,
      );
    case 'monitoring_getNotificationChannel':
      return sdk.monitoring.getNotificationChannel(args['projectId'] as string, args['channelId'] as string);
    case 'monitoring_updateNotificationChannel':
      return sdk.monitoring.updateNotificationChannel(
        args['projectId'] as string,
        args['channelId'] as string,
        {
          name: args['name'] as string | undefined,
          config: args['config'] as Record<string, string> | undefined,
        },
      );
    case 'monitoring_deleteNotificationChannel':
      return sdk.monitoring.deleteNotificationChannel(args['projectId'] as string, args['channelId'] as string);
    case 'monitoring_testNotificationChannel':
      return sdk.monitoring.testNotificationChannel(args['projectId'] as string, args['channelId'] as string);
    default:
      throw new Error(`Unknown monitoring notification channel tool: ${name}`);
  }
}
