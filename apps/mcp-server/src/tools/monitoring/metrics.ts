/**
 * Monitoring — Metric and series MCP tools.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

const apiUrl = process.env.FIDSCRIPT_API_URL || 'http://localhost:3001';
const apiKey = process.env.FIDSCRIPT_API_KEY ?? '';

export const metricTools: Tool[] = [
  {
    name: 'monitoring_getMetrics',
    description: 'Get recent metric samples for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        metric: { type: 'string', description: 'Filter by metric name (optional)' },
        limit: { type: 'number', description: 'Max samples to return (default 100)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'monitoring_recordMetric',
    description: 'Record a new metric sample for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        metric: { type: 'string', description: 'Metric name' },
        value: { type: 'number', description: 'Metric value' },
        labels: { type: 'object', description: 'Optional metric labels' },
      },
      required: ['projectId', 'metric', 'value'],
    },
  },
  {
    name: 'monitoring_getMetricSeries',
    description: 'Get aggregated metric series data (summary statistics over time).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        metric: { type: 'string', description: 'Metric name' },
      },
      required: ['projectId', 'metric'],
    },
  },
  {
    name: 'monitoring_getMetricsStats',
    description: 'Get aggregate metric statistics for a project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project ID' } },
      required: ['projectId'],
    },
  },
];

export async function handleMetricTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'monitoring_getMetrics':
      return sdk.monitoring.getMetrics(
        args['projectId'] as string,
        args['metric'] as string | undefined,
        args['limit'] as number | undefined,
      );
    case 'monitoring_recordMetric':
      return sdk.monitoring.recordMetric(
        args['projectId'] as string,
        args['metric'] as string,
        args['value'] as number,
        args['labels'] as Record<string, string> | undefined,
      );
    case 'monitoring_getMetricSeries': {
      const projectId = args['projectId'] as string;
      const metric = args['metric'] as string;
      const url = `${apiUrl}/api/v1/projects/${projectId}/monitoring/metrics/${encodeURIComponent(metric)}/summary`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`Metric series fetch failed: HTTP ${res.status}`);
      return res.json();
    }
    case 'monitoring_getMetricsStats': {
      const projectId = args['projectId'] as string;
      const res = await fetch(`${apiUrl}/api/v1/projects/${projectId}/monitoring/metrics/stats`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`Metrics stats fetch failed: HTTP ${res.status}`);
      return res.json();
    }
    default:
      throw new Error(`Unknown monitoring metric tool: ${name}`);
  }
}
