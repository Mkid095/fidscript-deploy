import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const marketplaceTools: Tool[] = [
  {
    name: 'marketplace_list_items',
    description: 'List marketplace items (skills, templates, integrations)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['skill', 'template', 'integration'], description: 'Item type' },
        category: { type: 'string', description: 'Category filter' },
        search: { type: 'string', description: 'Search query' },
        sort: { type: 'string', enum: ['downloads', 'rating', 'recent'], description: 'Sort order' },
        limit: { type: 'number', description: 'Max results (default 20)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
    },
  },
  {
    name: 'marketplace_get_item',
    description: 'Get marketplace item details',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Item slug' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'marketplace_get_featured',
    description: 'Get featured marketplace items',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'marketplace_get_categories',
    description: 'Get marketplace categories',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'marketplace_submit_item',
    description: 'Submit item to marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['skill', 'template', 'integration'], description: 'Item type' },
        name: { type: 'string', description: 'Item name' },
        description: { type: 'string', description: 'Description' },
        category: { type: 'string', description: 'Category' },
        subcategory: { type: 'string', description: 'Subcategory' },
        content: { type: 'string', description: 'Skill code, template content, or integration config' },
        website: { type: 'string', description: 'Website URL' },
        githubUrl: { type: 'string', description: 'GitHub URL' },
        npmPackage: { type: 'string', description: 'NPM package name' },
      },
      required: ['type', 'name', 'category'],
    },
  },
  {
    name: 'marketplace_create_review',
    description: 'Create review for marketplace item',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Item slug' },
        rating: { type: 'number', minimum: 1, maximum: 5, description: 'Rating 1-5' },
        title: { type: 'string', description: 'Review title' },
        content: { type: 'string', description: 'Review content' },
      },
      required: ['slug', 'rating'],
    },
  },
  {
    name: 'marketplace_record_download',
    description: 'Record a download for marketplace item',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Item slug' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'marketplace_get_my_submissions',
    description: 'Get my marketplace submissions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'marketplace_update_item',
    description: 'Update my marketplace item',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Item ID' },
        name: { type: 'string', description: 'Item name' },
        description: { type: 'string', description: 'Description' },
        category: { type: 'string', description: 'Category' },
        content: { type: 'string', description: 'Content' },
        website: { type: 'string', description: 'Website URL' },
        githubUrl: { type: 'string', description: 'GitHub URL' },
        npmPackage: { type: 'string', description: 'NPM package' },
        isActive: { type: 'boolean', description: 'Is active' },
      },
      required: ['id'],
    },
  },
];