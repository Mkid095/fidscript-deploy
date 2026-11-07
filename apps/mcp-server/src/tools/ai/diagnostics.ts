/**
 * AI — Diagnostic, recommendation, generation MCP tools.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

const apiUrl = process.env.FIDSCRIPT_API_URL || 'http://localhost:3001';
const apiKey = process.env.FIDSCRIPT_API_KEY ?? '';

async function callApi(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return res.json();
}

export const diagnosticTools: Tool[] = [
  {
    name: 'ai_diagnoseIssue',
    description: 'Diagnose an error or issue using the project AI assistant.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        error: { type: 'string', description: 'Error message or stack trace' },
        context: { type: 'object', description: 'Additional context (logs, env, recent changes)' },
      },
      required: ['projectId', 'error'],
    },
  },
  {
    name: 'ai_recommendSolution',
    description: 'Get infrastructure or architecture recommendations for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        resourceType: { type: 'string', description: 'Resource type to get recommendations for (optional)' },
        currentSetup: { type: 'object', description: 'Current setup details (optional)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'ai_generateTemplate',
    description: 'Generate a new project from a natural-language description.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        description: { type: 'string', description: 'Project description' },
        requirements: { type: 'array', items: { type: 'string' }, description: 'Specific requirements' },
        templateId: { type: 'string', description: 'Template to use as base (optional)' },
      },
      required: ['projectId', 'description'],
    },
  },
  {
    name: 'ai_explainError',
    description: 'Explain an error message in plain language and suggest fixes.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        error: { type: 'string', description: 'Error message or stack trace to explain' },
        context: { type: 'object', description: 'Additional context' },
      },
      required: ['projectId', 'error'],
    },
  },
  {
    name: 'ai_suggestFix',
    description: 'Suggest a concrete code or config fix for a known problem.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        error: { type: 'string', description: 'Error or problem description' },
        context: { type: 'object', description: 'Additional context (code, config, env)' },
      },
      required: ['projectId', 'error'],
    },
  },
  {
    name: 'ai_assistDeployment',
    description: 'Get AI assistance with a deployment action.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID to assist with' },
        action: { type: 'string', description: 'Action to assist with (e.g. rollback, scale, debug)' },
      },
      required: ['projectId', 'action'],
    },
  },
];

export async function handleDiagnosticTool(
  name: string,
  args: Record<string, unknown>,
  _sdk: FidscriptSDK,
): Promise<unknown> {
  const projectId = args['projectId'] as string;
  switch (name) {
    case 'ai_diagnoseIssue':
      return callApi(`/api/v1/projects/${projectId}/ai/diagnose`, 'POST', {
        error: args['error'],
        context: args['context'],
      });
    case 'ai_recommendSolution':
      return callApi(`/api/v1/projects/${projectId}/ai/recommendations`, 'POST', {
        resourceType: args['resourceType'],
        currentSetup: args['currentSetup'],
      });
    case 'ai_generateTemplate':
      return callApi(`/api/v1/projects/${projectId}/ai/generate`, 'POST', {
        description: args['description'],
        requirements: args['requirements'],
        templateId: args['templateId'],
      });
    case 'ai_explainError':
      return callApi(`/api/v1/projects/${projectId}/ai/diagnose`, 'POST', { error: args['error'], context: args['context'], mode: 'explain' });
    case 'ai_suggestFix':
      return callApi(`/api/v1/projects/${projectId}/ai/diagnose`, 'POST', { error: args['error'], context: args['context'], mode: 'suggest-fix' });
    case 'ai_assistDeployment':
      return callApi(`/api/v1/projects/${projectId}/ai/deploy`, 'POST', {
        deploymentId: args['deploymentId'],
        action: args['action'],
      });
    default:
      throw new Error(`Unknown AI diagnostic tool: ${name}`);
  }
}
