export const loggingTools = [
  {
    name: 'write_log',
    description: 'Write log entry',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, stream: { type: 'string' }, level: { type: 'string' }, message: { type: 'string' }, metadata: { type: 'object' } }, required: ['projectId', 'stream', 'level', 'message'] },
  },
  {
    name: 'write_batch_logs',
    description: 'Write multiple logs',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, logs: { type: 'array' } }, required: ['projectId', 'logs'] },
  },
  {
    name: 'get_logs',
    description: 'Get logs with filters',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, stream: { type: 'string' }, level: { type: 'string' }, search: { type: 'string' }, limit: { type: 'number' } }, required: ['projectId'] },
  },
  {
    name: 'get_log_stats',
    description: 'Get log statistics',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, stream: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'get_log_timeline',
    description: 'Get log histogram',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, stream: { type: 'string' }, interval: { type: 'string' } }, required: ['projectId', 'stream'] },
  },
  {
    name: 'list_log_streams',
    description: 'List log streams',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
];