export const queueTools = [
  {
    name: 'list_queues',
    description: 'List message queues',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'create_queue',
    description: 'Create message queue',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, name: { type: 'string' }, type: { type: 'string' } }, required: ['projectId', 'name'] },
  },
  {
    name: 'delete_queue',
    description: 'Delete queue',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, queueId: { type: 'string' } }, required: ['projectId', 'queueId'] },
  },
  {
    name: 'publish_message',
    description: 'Publish message to queue',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, queueId: { type: 'string' }, body: { type: 'string' }, headers: { type: 'object' } }, required: ['projectId', 'queueId', 'body'] },
  },
  {
    name: 'publish_batch_messages',
    description: 'Publish multiple messages',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, queueId: { type: 'string' }, messages: { type: 'array' } }, required: ['projectId', 'queueId', 'messages'] },
  },
  {
    name: 'consume_messages',
    description: 'Consume messages from queue',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, queueId: { type: 'string' }, maxMessages: { type: 'number' } }, required: ['projectId', 'queueId'] },
  },
  {
    name: 'acknowledge_messages',
    description: 'Acknowledge processed messages',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, queueId: { type: 'string' }, messageIds: { type: 'array', items: { type: 'string' } } }, required: ['projectId', 'queueId', 'messageIds'] },
  },
  {
    name: 'retry_messages',
    description: 'Retry failed messages',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, queueId: { type: 'string' }, messageIds: { type: 'array', items: { type: 'string' } } }, required: ['projectId', 'queueId', 'messageIds'] },
  },
  {
    name: 'get_queue_stats',
    description: 'Get queue statistics',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, queueId: { type: 'string' } }, required: ['projectId', 'queueId'] },
  },
];