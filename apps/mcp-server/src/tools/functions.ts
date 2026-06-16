export const functionTools = [
  {
    name: 'list_functions',
    description: 'List serverless functions',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'get_function',
    description: 'Get function details',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, functionId: { type: 'string' } }, required: ['projectId', 'functionId'] },
  },
  {
    name: 'create_function',
    description: 'Create serverless function',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, name: { type: 'string' }, runtime: { type: 'string' }, memoryMb: { type: 'number' }, timeoutSeconds: { type: 'number' } },
      required: ['projectId', 'name', 'runtime'],
    },
  },
  {
    name: 'update_function',
    description: 'Update function config',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, functionId: { type: 'string' }, memoryMb: { type: 'number' }, timeoutSeconds: { type: 'number' } }, required: ['projectId', 'functionId'] },
  },
  {
    name: 'delete_function',
    description: 'Delete function',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, functionId: { type: 'string' } }, required: ['projectId', 'functionId'] },
  },
  {
    name: 'deploy_function',
    description: 'Deploy function code',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, functionId: { type: 'string' }, code: { type: 'string' }, version: { type: 'string' } }, required: ['projectId', 'functionId', 'code'] },
  },
  {
    name: 'invoke_function',
    description: 'Invoke function',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, functionId: { type: 'string' }, payload: {} }, required: ['projectId', 'functionId'] },
  },
  {
    name: 'get_function_logs',
    description: 'Get function logs',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, functionId: { type: 'string' }, limit: { type: 'number' } }, required: ['projectId', 'functionId'] },
  },
  {
    name: 'get_function_versions',
    description: 'Get function versions',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, functionId: { type: 'string' } }, required: ['projectId', 'functionId'] },
  },
];