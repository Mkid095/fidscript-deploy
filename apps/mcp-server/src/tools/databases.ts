/**
 * Database MCP tools — exposes managed database operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const databaseTools: Tool[] = [
  {
    name: 'databases_list',
    description: 'List all managed databases in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'databases_get',
    description: 'Get details of a specific database.',
    inputSchema: {
      type: 'object',
      properties: {
        databaseId: { type: 'string', description: 'Database ID' },
      },
      required: ['databaseId'],
    },
  },
  {
    name: 'databases_create',
    description: 'Create a new managed database.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Database name' },
        type: { type: 'string', description: 'Database type (default postgresql)' },
        environment: { type: 'string', description: 'Environment (default production)' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'databases_delete',
    description: 'Delete a managed database.',
    inputSchema: {
      type: 'object',
      properties: {
        databaseId: { type: 'string', description: 'Database ID' },
      },
      required: ['databaseId'],
    },
  },
  {
    name: 'databases_backup',
    description: 'Trigger an immediate backup of a database.',
    inputSchema: {
      type: 'object',
      properties: {
        databaseId: { type: 'string', description: 'Database ID' },
      },
      required: ['databaseId'],
    },
  },
  {
    name: 'databases_listBackups',
    description: 'List all backups for a database.',
    inputSchema: {
      type: 'object',
      properties: {
        databaseId: { type: 'string', description: 'Database ID' },
      },
      required: ['databaseId'],
    },
  },
  {
    name: 'databases_restore',
    description: 'Restore a database from a backup.',
    inputSchema: {
      type: 'object',
      properties: {
        databaseId: { type: 'string', description: 'Database ID' },
        backupId: { type: 'string', description: 'Backup ID to restore from' },
      },
      required: ['databaseId', 'backupId'],
    },
  },
];

export async function handleDatabaseTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'databases_list':
      return sdk.databases.list(args.projectId as string);

    case 'databases_get':
      return sdk.databases.get(args.databaseId as string);

    case 'databases_create':
      return sdk.databases.create(args.projectId as string, {
        name: args.name as string,
        type: args.type as string | undefined,
        environment: args.environment as string | undefined,
      });

    case 'databases_delete':
      return sdk.databases.delete(args.databaseId as string);

    case 'databases_backup':
      return sdk.databases.backup(args.databaseId as string);

    case 'databases_listBackups':
      return sdk.databases.listBackups(args.databaseId as string);

    case 'databases_restore':
      return sdk.databases.restore(args.databaseId as string, args.backupId as string);

    default:
      throw new Error(`Unknown database tool: ${name}`);
  }
}
