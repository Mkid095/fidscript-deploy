export const cronTools = [
  {
    name: 'list_cron_jobs',
    description: 'List cron jobs',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'get_cron_job',
    description: 'Get cron job details',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, jobId: { type: 'string' } }, required: ['projectId', 'jobId'] },
  },
  {
    name: 'create_cron_job',
    description: 'Create cron job',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, name: { type: 'string' }, cronExpression: { type: 'string' }, timezone: { type: 'string' }, endpoint: { type: 'string' }, enabled: { type: 'boolean' } },
      required: ['projectId', 'name', 'cronExpression'],
    },
  },
  {
    name: 'update_cron_job',
    description: 'Update cron job',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, jobId: { type: 'string' }, name: { type: 'string' }, cronExpression: { type: 'string' }, enabled: { type: 'boolean' } }, required: ['projectId', 'jobId'] },
  },
  {
    name: 'delete_cron_job',
    description: 'Delete cron job',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, jobId: { type: 'string' } }, required: ['projectId', 'jobId'] },
  },
  {
    name: 'trigger_cron_job',
    description: 'Manually trigger cron job',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, jobId: { type: 'string' }, payload: {} }, required: ['projectId', 'jobId'] },
  },
  {
    name: 'get_cron_job_runs',
    description: 'Get execution history',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, jobId: { type: 'string' }, limit: { type: 'number' } }, required: ['projectId', 'jobId'] },
  },
  {
    name: 'get_cron_job_next_run',
    description: 'Get next run time',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, jobId: { type: 'string' } }, required: ['projectId', 'jobId'] },
  },
];