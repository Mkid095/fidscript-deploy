/**
 * Marketplace — User-side submission MCP tools (submit, list mine, status, update).
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

export const userSubmissionTools: Tool[] = [
  {
    name: 'marketplace_submitItem',
    description: 'Submit a new item to the marketplace.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name' },
        slug: { type: 'string', description: 'URL-safe slug' },
        description: { type: 'string', description: 'Item description' },
        category: { type: 'string', description: 'Item category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Search tags' },
        repositoryUrl: { type: 'string', description: 'Source repository URL (optional)' },
        homepageUrl: { type: 'string', description: 'Homepage URL (optional)' },
      },
      required: ['name', 'slug', 'description', 'category'],
    },
  },
  {
    name: 'marketplace_listMySubmissions',
    description: 'List marketplace items submitted by the current user.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'marketplace_getSubmissionStatus',
    description: 'Get the moderation status of a specific submission.',
    inputSchema: {
      type: 'object',
      properties: { itemId: { type: 'string', description: 'Item ID' } },
      required: ['itemId'],
    },
  },
  {
    name: 'marketplace_updateSubmission',
    description: 'Update a submission\'s metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'Item ID' },
        name: { type: 'string', description: 'Updated name' },
        description: { type: 'string', description: 'Updated description' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags' },
        homepageUrl: { type: 'string', description: 'Updated homepage URL' },
      },
      required: ['itemId'],
    },
  },
];

export async function handleUserSubmissionTool(
  name: string,
  args: Record<string, unknown>,
  _sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'marketplace_submitItem':
      return callApi('/api/v1/marketplace/submit', 'POST', {
        name: args['name'],
        slug: args['slug'],
        description: args['description'],
        category: args['category'],
        tags: args['tags'],
        repositoryUrl: args['repositoryUrl'],
        homepageUrl: args['homepageUrl'],
      });
    case 'marketplace_listMySubmissions':
      return callApi('/api/v1/marketplace/my/submissions');
    case 'marketplace_getSubmissionStatus':
      return callApi(`/api/v1/marketplace/items/${args['itemId'] as string}`);
    case 'marketplace_updateSubmission':
      return callApi(`/api/v1/marketplace/items/${args['itemId'] as string}`, 'PATCH', {
        name: args['name'],
        description: args['description'],
        tags: args['tags'],
        homepageUrl: args['homepageUrl'],
      });
    default:
      throw new Error(`Unknown marketplace user submission tool: ${name}`);
  }
}
