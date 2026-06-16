export const authTools = [
  {
    name: 'auth_register',
    description: 'Register a new user account on FIDScript platform',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email address' },
        password: { type: 'string', description: 'User password' },
        name: { type: 'string', description: 'User display name' },
      },
      required: ['email', 'password'],
    },
  },
  {
    name: 'auth_login',
    description: 'Login to FIDScript platform',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  },
  {
    name: 'auth_magic_link',
    description: 'Request passwordless magic link',
    inputSchema: {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: ['email'],
    },
  },
  {
    name: 'auth_verify_magic_link',
    description: 'Verify magic link token',
    inputSchema: {
      type: 'object',
      properties: { token: { type: 'string' } },
      required: ['token'],
    },
  },
  {
    name: 'auth_logout',
    description: 'Logout current session',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'auth_get_session',
    description: 'Get current authenticated user info',
    inputSchema: { type: 'object', properties: {} },
  },
];