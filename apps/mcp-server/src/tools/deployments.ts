export const deploymentTools = [
  {
    name: 'list_deployments',
    description: 'List project deployments',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_deployment',
    description: 'Get deployment details',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, deploymentId: { type: 'string' } },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'create_deployment',
    description: 'Create new deployment',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, sourceRepo: { type: 'string' }, sourceBranch: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'rollback_deployment',
    description: 'Rollback to previous deployment',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, deploymentId: { type: 'string' } },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'get_build_config',
    description: 'Get build configuration',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'update_build_config',
    description: 'Update build configuration',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, buildCommand: { type: 'string' }, outputDirectory: { type: 'string' } },
      required: ['projectId'],
    },
  },
];