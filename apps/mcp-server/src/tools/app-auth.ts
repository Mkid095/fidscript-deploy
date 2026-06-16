export const appAuthTools = [
  {
    name: 'app_auth_register',
    description: 'Register app-level user',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } }, required: ['projectId', 'email', 'password'] },
  },
  {
    name: 'app_auth_login',
    description: 'App-level login',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } }, required: ['projectId', 'email', 'password'] },
  },
  {
    name: 'app_auth_magic_link',
    description: 'Request magic link',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, email: { type: 'string' } }, required: ['projectId', 'email'] },
  },
  {
    name: 'app_auth_verify_magic_link',
    description: 'Verify magic link',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, token: { type: 'string' } }, required: ['projectId', 'token'] },
  },
  {
    name: 'app_auth_create_role',
    description: 'Create app role',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, name: { type: 'string' }, permissions: { type: 'array', items: { type: 'string' } } }, required: ['projectId', 'name'] },
  },
  {
    name: 'app_auth_list_roles',
    description: 'List app roles',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'app_auth_assign_role',
    description: 'Assign role to user',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, email: { type: 'string' }, roleName: { type: 'string' } }, required: ['projectId', 'email', 'roleName'] },
  },
];