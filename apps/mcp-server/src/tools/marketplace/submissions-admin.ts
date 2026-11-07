/**
 * Marketplace — Admin moderation MCP tools (approve, reject, feature).
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

export const adminSubmissionTools: Tool[] = [
  {
    name: 'marketplace_approveSubmission',
    description: 'Approve a submission (admin only).',
    inputSchema: {
      type: 'object',
      properties: { itemId: { type: 'string', description: 'Item ID' } },
      required: ['itemId'],
    },
  },
  {
    name: 'marketplace_rejectSubmission',
    description: 'Reject a submission (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'Item ID' },
        reason: { type: 'string', description: 'Rejection reason' },
      },
      required: ['itemId'],
    },
  },
  {
    name: 'marketplace_featureTemplate',
    description: 'Mark or unmark an item as featured (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'Item ID' },
        featured: { type: 'boolean', description: 'Whether to feature (true) or unfeature (false)' },
      },
      required: ['itemId', 'featured'],
    },
  },
];

export async function handleAdminSubmissionTool(
  name: string,
  args: Record<string, unknown>,
  _sdk: FidscriptSDK,
): Promise<unknown> {
  const itemId = args['itemId'] as string;
  switch (name) {
    case 'marketplace_approveSubmission':
      return callApi(`/api/v1/marketplace/items/${itemId}/approve`, 'POST');
    case 'marketplace_rejectSubmission':
      return callApi(`/api/v1/marketplace/items/${itemId}/reject`, 'POST', { reason: args['reason'] });
    case 'marketplace_featureTemplate':
      return callApi(`/api/v1/marketplace/items/${itemId}/featured`, 'POST', { featured: args['featured'] });
    default:
      throw new Error(`Unknown marketplace admin submission tool: ${name}`);
  }
}
