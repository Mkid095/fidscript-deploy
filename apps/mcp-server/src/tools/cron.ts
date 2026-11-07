/**
 * Cron/Scheduler MCP tools — exposes scheduled job operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const cronTools: Tool[] = [
  {
    name: 'cron_list',
    description: 'List all scheduled cron jobs in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'cron_get',
    description: 'Get details of a specific cron job.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        jobId: { type: 'string', description: 'Cron job ID' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'cron_create',
    description: 'Create a new scheduled cron job.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Job name' },
        cronExpression: { type: 'string', description: 'Cron expression (e.g. "0 * * * *")' },
        endpoint: { type: 'string', description: 'HTTP endpoint to call' },
        functionId: { type: 'string', description: 'Edge function ID to invoke' },
        timezone: { type: 'string', description: 'Timezone (default UTC)' },
        payload: { type: 'object', description: 'Payload to send with each run' },
        enabled: { type: 'boolean', description: 'Whether job is enabled (default true)' },
        retryAttempts: { type: 'number', description: 'Number of retry attempts on failure' },
        retryDelaySeconds: { type: 'number', description: 'Delay between retries in seconds' },
        timeoutSeconds: { type: 'number', description: 'Job timeout in seconds' },
      },
      required: ['projectId', 'name', 'cronExpression'],
    },
  },
  {
    name: 'cron_update',
    description: 'Update a cron job\'s configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        jobId: { type: 'string', description: 'Cron job ID' },
        name: { type: 'string', description: 'Job name' },
        cronExpression: { type: 'string', description: 'Cron expression' },
        endpoint: { type: 'string', description: 'HTTP endpoint' },
        functionId: { type: 'string', description: 'Edge function ID' },
        timezone: { type: 'string', description: 'Timezone' },
        payload: { type: 'object', description: 'Payload' },
        enabled: { type: 'boolean', description: 'Enabled state' },
        retryAttempts: { type: 'number', description: 'Retry attempts' },
        retryDelaySeconds: { type: 'number', description: 'Retry delay' },
        timeoutSeconds: { type: 'number', description: 'Timeout' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'cron_delete',
    description: 'Delete a cron job.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        jobId: { type: 'string', description: 'Cron job ID' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'cron_trigger',
    description: 'Manually trigger a cron job to run immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        jobId: { type: 'string', description: 'Cron job ID' },
        payload: { type: 'object', description: 'Optional payload to override the job\'s default payload' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'cron_getNextRun',
    description: 'Get the next scheduled run time for a cron job.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        jobId: { type: 'string', description: 'Cron job ID' },
      },
      required: ['projectId', 'jobId'],
    },
  },
];

export async function handleCronTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'cron_list':
      return sdk.cron.list(args.projectId as string);

    case 'cron_get':
      return sdk.cron.get(args.projectId as string, args.jobId as string);

    case 'cron_create':
      return sdk.cron.create(args.projectId as string, {
        name: args.name as string,
        cronExpression: args.cronExpression as string,
        endpoint: args.endpoint as string | undefined,
        functionId: args.functionId as string | undefined,
        timezone: args.timezone as string | undefined,
        payload: args.payload as Record<string, unknown> | undefined,
        enabled: args.enabled as boolean | undefined,
        retryAttempts: args.retryAttempts as number | undefined,
        retryDelaySeconds: args.retryDelaySeconds as number | undefined,
        timeoutSeconds: args.timeoutSeconds as number | undefined,
      });

    case 'cron_update':
      return sdk.cron.update(args.projectId as string, args.jobId as string, {
        name: args.name as string | undefined,
        cronExpression: args.cronExpression as string | undefined,
        endpoint: args.endpoint as string | undefined,
        functionId: args.functionId as string | undefined,
        timezone: args.timezone as string | undefined,
        payload: args.payload as Record<string, unknown> | undefined,
        enabled: args.enabled as boolean | undefined,
        retryAttempts: args.retryAttempts as number | undefined,
        retryDelaySeconds: args.retryDelaySeconds as number | undefined,
        timeoutSeconds: args.timeoutSeconds as number | undefined,
      });

    case 'cron_delete':
      return sdk.cron.delete(args.projectId as string, args.jobId as string);

    case 'cron_trigger':
      return sdk.cron.trigger(
        args.projectId as string,
        args.jobId as string,
        args.payload as Parameters<typeof sdk.cron.trigger>[2],
      );

    case 'cron_getNextRun':
      return sdk.cron.getNextRun(args.projectId as string, args.jobId as string);

    default:
      throw new Error(`Unknown cron tool: ${name}`);
  }
}
