export const projectTools = [
  {
    name: 'list_projects',
    description: 'List all projects',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project',
    description: 'Get project details',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update project settings',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        envVars: { type: 'object' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project_members',
    description: 'List project members',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'add_project_member',
    description: 'Add member to project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
      },
      required: ['projectId', 'email', 'role'],
    },
  },
  {
    name: 'remove_project_member',
    description: 'Remove member from project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, userId: { type: 'string' } },
      required: ['projectId', 'userId'],
    },
  },
  {
    name: 'get_project_env_vars',
    description: 'Get environment variables',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'set_project_env_vars',
    description: 'Set environment variables',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, envVars: { type: 'object' } },
      required: ['projectId', 'envVars'],
    },
  },
];