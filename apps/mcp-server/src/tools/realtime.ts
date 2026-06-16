export const realtimeTools = [
  {
    name: 'list_realtime_channels',
    description: 'List realtime channels',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'create_realtime_channel',
    description: 'Create realtime channel',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, name: { type: 'string' }, isPrivate: { type: 'boolean' } }, required: ['projectId', 'name'] },
  },
  {
    name: 'delete_realtime_channel',
    description: 'Delete channel',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, channelId: { type: 'string' } }, required: ['projectId', 'channelId'] },
  },
  {
    name: 'get_realtime_channel_presence',
    description: 'Get channel presence',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, channelId: { type: 'string' } }, required: ['projectId', 'channelId'] },
  },
];