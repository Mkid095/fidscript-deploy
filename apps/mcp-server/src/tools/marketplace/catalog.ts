/**
 * Marketplace — Catalog, search, reviews MCP tools.
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

export const catalogTools: Tool[] = [
  {
    name: 'marketplace_browse',
    description: 'Browse marketplace templates and integrations.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
        featured: { type: 'boolean', description: 'Show only featured items (optional)' },
        limit: { type: 'number', description: 'Max items to return (optional)' },
        offset: { type: 'number', description: 'Pagination offset (optional)' },
      },
    },
  },
  {
    name: 'marketplace_search',
    description: 'Search marketplace items by free-text query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Filter by category (optional)' },
        limit: { type: 'number', description: 'Max items (optional)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'marketplace_getFeatured',
    description: 'Get currently featured marketplace items.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'marketplace_listCategories',
    description: 'List all marketplace categories.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'marketplace_getTemplateDetails',
    description: 'Get detailed information about a marketplace item by slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Marketplace item slug' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'marketplace_submitReview',
    description: 'Submit a review for a marketplace item.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Marketplace item slug' },
        rating: { type: 'number', description: 'Rating (1-5)' },
        title: { type: 'string', description: 'Review title' },
        comment: { type: 'string', description: 'Review body' },
      },
      required: ['slug', 'rating', 'comment'],
    },
  },
];

export async function handleCatalogTool(
  name: string,
  args: Record<string, unknown>,
  _sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'marketplace_browse': {
      const params = new URLSearchParams();
      if (args['category']) params.set('category', args['category'] as string);
      if (args['featured'] !== undefined) params.set('featured', String(args['featured']));
      if (args['limit'] !== undefined) params.set('limit', String(args['limit']));
      if (args['offset'] !== undefined) params.set('offset', String(args['offset']));
      const qs = params.toString();
      return callApi(`/api/v1/marketplace${qs ? `?${qs}` : ''}`);
    }
    case 'marketplace_search': {
      const params = new URLSearchParams({ q: args['query'] as string });
      if (args['category']) params.set('category', args['category'] as string);
      if (args['limit'] !== undefined) params.set('limit', String(args['limit']));
      return callApi(`/api/v1/marketplace?${params.toString()}`);
    }
    case 'marketplace_getFeatured':
      return callApi('/api/v1/marketplace/featured');
    case 'marketplace_listCategories':
      return callApi('/api/v1/marketplace/categories');
    case 'marketplace_getTemplateDetails':
      return callApi(`/api/v1/marketplace/${args['slug'] as string}`);
    case 'marketplace_submitReview':
      return callApi(
        `/api/v1/marketplace/${args['slug'] as string}/reviews`,
        'POST',
        { rating: args['rating'], title: args['title'], comment: args['comment'] },
      );
    default:
      throw new Error(`Unknown marketplace catalog tool: ${name}`);
  }
}
