export const monitoringTools = [
  {
    name: 'record_metric',
    description: 'Record custom metric',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, metric: { type: 'string' }, value: { type: 'number' }, labels: { type: 'object' } }, required: ['projectId', 'metric', 'value'] },
  },
  {
    name: 'get_metrics',
    description: 'Get project metrics',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, metric: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'get_metric_summary',
    description: 'Get metric summary',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, metric: { type: 'string' }, interval: { type: 'string' } }, required: ['projectId', 'metric'] },
  },
  {
    name: 'create_alert_rule',
    description: 'Create alert rule',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, name: { type: 'string' }, metric: { type: 'string' }, condition: { type: 'string' }, threshold: { type: 'number' }, severity: { type: 'string' } }, required: ['projectId', 'name', 'metric', 'condition', 'threshold'] },
  },
  {
    name: 'list_alert_rules',
    description: 'List alert rules',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'delete_alert_rule',
    description: 'Delete alert rule',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, ruleId: { type: 'string' } }, required: ['projectId', 'ruleId'] },
  },
  {
    name: 'get_alerts',
    description: 'Get active alerts',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, status: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'acknowledge_alert',
    description: 'Acknowledge alert',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, alertId: { type: 'string' } }, required: ['projectId', 'alertId'] },
  },
  {
    name: 'resolve_alert',
    description: 'Resolve alert',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, alertId: { type: 'string' } }, required: ['projectId', 'alertId'] },
  },
  {
    name: 'get_monitoring_stats',
    description: 'Get dashboard stats',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
];