/**
 * Monitoring — Dashboard, uptime, incident, integration-config MCP tools.
 *
 * Some endpoints are not yet implemented in the API (dashboards, uptime,
 * integration configs). These tools call the expected URL and surface the
 * API's honest response (currently 404) so callers know what's available.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

const apiUrl = process.env.FIDSCRIPT_API_URL || 'http://localhost:3001';
const apiKey = process.env.FIDSCRIPT_API_KEY ?? '';

async function callApi(path: string): Promise<unknown> {
  const res = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return res.json();
}

export const surfaceTools: Tool[] = [
  {
    name: 'monitoring_listDashboards',
    description: 'List monitoring dashboards for a project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'monitoring_createDashboard',
    description: 'Create a new monitoring dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Dashboard name' },
        widgets: { type: 'array', description: 'Dashboard widget definitions' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'monitoring_getUptime',
    description: 'Get uptime status for a project or service.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        service: { type: 'string', description: 'Optional service name to scope uptime to' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'monitoring_getIncident',
    description: 'Get details of a specific incident (alert firing history).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        incidentId: { type: 'string', description: 'Incident ID' },
      },
      required: ['projectId', 'incidentId'],
    },
  },
  {
    name: 'monitoring_listIntegrationConfigs',
    description: 'List third-party integration configs (Slack, PagerDuty, etc.) for a project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'monitoring_updateIntegrationConfig',
    description: 'Update a third-party integration config.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        integrationId: { type: 'string', description: 'Integration config ID' },
        enabled: { type: 'boolean', description: 'Whether the integration is enabled' },
        config: { type: 'object', description: 'Integration-specific configuration' },
      },
      required: ['projectId', 'integrationId'],
    },
  },
];

export async function handleSurfaceTool(
  name: string,
  args: Record<string, unknown>,
  _sdk: FidscriptSDK,
): Promise<unknown> {
  const projectId = args['projectId'] as string;
  switch (name) {
    case 'monitoring_listDashboards':
      return callApi(`/api/v1/projects/${projectId}/monitoring/dashboards`);
    case 'monitoring_createDashboard':
      return callApi(`/api/v1/projects/${projectId}/monitoring/dashboards`);
    case 'monitoring_getUptime':
      return callApi(
        `/api/v1/projects/${projectId}/monitoring/uptime` +
          (args['service'] ? `?service=${encodeURIComponent(args['service'] as string)}` : ''),
      );
    case 'monitoring_getIncident':
      return callApi(
        `/api/v1/projects/${projectId}/monitoring/incidents/${args['incidentId'] as string}`,
      );
    case 'monitoring_listIntegrationConfigs':
      return callApi(`/api/v1/projects/${projectId}/monitoring/integrations`);
    case 'monitoring_updateIntegrationConfig':
      return callApi(
        `/api/v1/projects/${projectId}/monitoring/integrations/${args['integrationId'] as string}`,
      );
    default:
      throw new Error(`Unknown monitoring surface tool: ${name}`);
  }
}
