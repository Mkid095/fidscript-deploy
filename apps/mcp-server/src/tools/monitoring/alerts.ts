/**
 * Monitoring — Active alert (incident) MCP tools.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const alertTools: Tool[] = [
  {
    name: 'monitoring_getActiveAlerts',
    description: 'Get currently active alerts for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        status: { type: 'string', description: 'Filter by alert status (pending, firing, resolved)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'monitoring_acknowledgeAlert',
    description: 'Acknowledge an active alert.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        alertId: { type: 'string', description: 'Alert ID' },
      },
      required: ['projectId', 'alertId'],
    },
  },
  {
    name: 'monitoring_resolveAlert',
    description: 'Mark an alert as resolved.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        alertId: { type: 'string', description: 'Alert ID' },
      },
      required: ['projectId', 'alertId'],
    },
  },
];

export async function handleAlertTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'monitoring_getActiveAlerts':
      return sdk.monitoring.getAlerts(args['projectId'] as string, args['status'] as string | undefined);
    case 'monitoring_acknowledgeAlert':
      return sdk.monitoring.acknowledgeAlert(args['projectId'] as string, args['alertId'] as string);
    case 'monitoring_resolveAlert':
      return sdk.monitoring.resolveAlert(args['projectId'] as string, args['alertId'] as string);
    default:
      throw new Error(`Unknown monitoring alert tool: ${name}`);
  }
}
