export const databaseTools = [
  {
    name: 'list_databases',
    description: 'List managed databases',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_database',
    description: 'Provision new database',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, name: { type: 'string' }, type: { type: 'string' }, version: { type: 'string' }, size: { type: 'string' } },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'get_database',
    description: 'Get database details',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, databaseId: { type: 'string' } },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'delete_database',
    description: 'Delete managed database',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, databaseId: { type: 'string' } },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'rotate_database_credentials',
    description: 'Rotate database credentials',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, databaseId: { type: 'string' } },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'list_database_backups',
    description: 'List database backups',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, databaseId: { type: 'string' } },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'create_database_backup',
    description: 'Create database backup',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, databaseId: { type: 'string' }, description: { type: 'string' } },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'restore_database_backup',
    description: 'Restore from backup',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, databaseId: { type: 'string' }, backupId: { type: 'string' } },
      required: ['projectId', 'databaseId', 'backupId'],
    },
  },
];