/**
 * Monitoring MCP tools — aggregated tool list and dispatcher.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { alertRuleTools, handleAlertRuleTool } from './alerts-rules.js';
import { alertTools, handleAlertTool } from './alerts.js';
import { notificationChannelTools, handleNotificationChannelTool } from './notification-channels.js';
import { metricTools, handleMetricTool } from './metrics.js';
import { surfaceTools, handleSurfaceTool } from './surfaces.js';

export const monitoringTools: Tool[] = [
  ...alertRuleTools,
  ...alertTools,
  ...notificationChannelTools,
  ...metricTools,
  ...surfaceTools,
];

export async function handleMonitoringTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  if (name.endsWith('AlertRule') || name === 'monitoring_getAlertRuleEvaluations') {
    return handleAlertRuleTool(name, args, sdk);
  }
  if (
    name === 'monitoring_getActiveAlerts' ||
    name === 'monitoring_acknowledgeAlert' ||
    name === 'monitoring_resolveAlert'
  ) {
    return handleAlertTool(name, args, sdk);
  }
  if (name.startsWith('monitoring_') && name.includes('NotificationChannel')) {
    return handleNotificationChannelTool(name, args, sdk);
  }
  if (
    name === 'monitoring_getMetrics' ||
    name === 'monitoring_recordMetric' ||
    name === 'monitoring_getMetricSeries' ||
    name === 'monitoring_getMetricsStats'
  ) {
    return handleMetricTool(name, args, sdk);
  }
  if (
    name === 'monitoring_listDashboards' ||
    name === 'monitoring_createDashboard' ||
    name === 'monitoring_getUptime' ||
    name === 'monitoring_getIncident' ||
    name === 'monitoring_listIntegrationConfigs' ||
    name === 'monitoring_updateIntegrationConfig'
  ) {
    return handleSurfaceTool(name, args, sdk);
  }
  throw new Error(`Unknown monitoring tool: ${name}`);
}
