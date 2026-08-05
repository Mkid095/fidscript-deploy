/**
 * Monitoring — Alert rule MCP tools (CRUD).
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const alertRuleTools: Tool[] = [
  {
    name: 'monitoring_listAlertRules',
    description: 'List all alert rules for a project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'monitoring_createAlertRule',
    description: 'Create a new alert rule for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Rule name' },
        metric: { type: 'string', description: 'Metric name to monitor' },
        condition: { type: 'string', description: 'Comparison operator (gt, lt, eq, gte, lte)' },
        threshold: { type: 'number', description: 'Threshold value' },
        severity: { type: 'string', description: 'Severity (info, warning, critical)' },
        durationSeconds: { type: 'number', description: 'Seconds the condition must hold before firing' },
        channels: { type: 'array', items: { type: 'string' }, description: 'Notification channel IDs' },
      },
      required: ['projectId', 'name', 'metric', 'condition', 'threshold'],
    },
  },
  {
    name: 'monitoring_getAlertRule',
    description: 'Get a specific alert rule.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        ruleId: { type: 'string', description: 'Alert rule ID' },
      },
      required: ['projectId', 'ruleId'],
    },
  },
  {
    name: 'monitoring_updateAlertRule',
    description: 'Update an existing alert rule.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        ruleId: { type: 'string', description: 'Alert rule ID' },
        name: { type: 'string', description: 'Rule name' },
        metric: { type: 'string', description: 'Metric name' },
        condition: { type: 'string', description: 'Comparison operator' },
        threshold: { type: 'number', description: 'Threshold value' },
        severity: { type: 'string', description: 'Severity' },
        durationSeconds: { type: 'number', description: 'Hold duration' },
        channels: { type: 'array', items: { type: 'string' }, description: 'Channel IDs' },
        enabled: { type: 'boolean', description: 'Whether the rule is enabled' },
      },
      required: ['projectId', 'ruleId'],
    },
  },
  {
    name: 'monitoring_deleteAlertRule',
    description: 'Delete an alert rule.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        ruleId: { type: 'string', description: 'Alert rule ID' },
      },
      required: ['projectId', 'ruleId'],
    },
  },
  {
    name: 'monitoring_getAlertRuleEvaluations',
    description: 'Get recent evaluation history for an alert rule.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        ruleId: { type: 'string', description: 'Alert rule ID' },
        limit: { type: 'number', description: 'Max evaluations to return (default 10)' },
      },
      required: ['projectId', 'ruleId'],
    },
  },
];

export async function handleAlertRuleTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'monitoring_listAlertRules':
      return sdk.monitoring.listAlertRules(args['projectId'] as string);
    case 'monitoring_createAlertRule':
      return sdk.monitoring.createAlertRule(args['projectId'] as string, {
        name: args['name'] as string,
        metric: args['metric'] as string,
        condition: args['condition'] as string,
        threshold: args['threshold'] as number,
        severity: args['severity'] as string | undefined,
        durationSeconds: args['durationSeconds'] as number | undefined,
        channels: args['channels'] as string[] | undefined,
      });
    case 'monitoring_getAlertRule':
      return sdk.monitoring.getAlertRule(args['projectId'] as string, args['ruleId'] as string);
    case 'monitoring_updateAlertRule':
      return sdk.monitoring.updateAlertRule(args['projectId'] as string, args['ruleId'] as string, {
        name: args['name'] as string | undefined,
        metric: args['metric'] as string | undefined,
        condition: args['condition'] as string | undefined,
        threshold: args['threshold'] as number | undefined,
        severity: args['severity'] as string | undefined,
        durationSeconds: args['durationSeconds'] as number | undefined,
        channels: args['channels'] as string[] | undefined,
        enabled: args['enabled'] as boolean | undefined,
      });
    case 'monitoring_deleteAlertRule':
      return sdk.monitoring.deleteAlertRule(args['projectId'] as string, args['ruleId'] as string);
    case 'monitoring_getAlertRuleEvaluations':
      return sdk.monitoring.getAlertEvaluations(
        args['projectId'] as string,
        args['ruleId'] as string,
        args['limit'] as number | undefined,
      );
    default:
      throw new Error(`Unknown monitoring alert rule tool: ${name}`);
  }
}
