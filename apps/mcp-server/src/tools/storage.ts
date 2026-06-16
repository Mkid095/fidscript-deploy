export const storageTools = [
  {
    name: 'list_buckets',
    description: 'List storage buckets',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_bucket',
    description: 'Create storage bucket',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, name: { type: 'string' }, provider: { type: 'string' }, isPublic: { type: 'boolean' } },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'delete_bucket',
    description: 'Delete storage bucket',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, bucketId: { type: 'string' } },
      required: ['projectId', 'bucketId'],
    },
  },
  {
    name: 'list_files',
    description: 'List bucket files',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, bucketId: { type: 'string' } },
      required: ['projectId', 'bucketId'],
    },
  },
  {
    name: 'upload_file',
    description: 'Upload file to bucket',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, bucketId: { type: 'string' }, name: { type: 'string' }, content: { type: 'string' }, contentType: { type: 'string' } },
      required: ['projectId', 'bucketId', 'name', 'content'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete bucket file',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, bucketId: { type: 'string' }, fileId: { type: 'string' } },
      required: ['projectId', 'bucketId', 'fileId'],
    },
  },
  {
    name: 'get_signed_url',
    description: 'Get temporary signed URL',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, bucketId: { type: 'string' }, fileId: { type: 'string' }, expiresIn: { type: 'number' } },
      required: ['projectId', 'bucketId', 'fileId'],
    },
  },
];