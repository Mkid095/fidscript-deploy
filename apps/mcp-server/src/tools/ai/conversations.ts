/**
 * AI — Conversation MCP tools (CRUD + chat).
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

const apiUrl = process.env.FIDSCRIPT_API_URL || 'http://localhost:3001';
const apiKey = process.env.FIDSCRIPT_API_KEY ?? '';

async function callApi(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return res.json();
}

export const conversationTools: Tool[] = [
  {
    name: 'ai_listConversations',
    description: 'List AI conversations for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Max conversations to return (optional)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'ai_createConversation',
    description: 'Create a new AI conversation.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        type: { type: 'string', description: 'Conversation type (optional)' },
        model: { type: 'string', description: 'Model to use (optional)' },
        metadata: { type: 'object', description: 'Optional metadata' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'ai_getConversation',
    description: 'Get a specific AI conversation with messages.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        conversationId: { type: 'string', description: 'Conversation ID' },
      },
      required: ['projectId', 'conversationId'],
    },
  },
  {
    name: 'ai_sendChatMessage',
    description: 'Send a chat message to a conversation (creates one if no id given).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        conversationId: { type: 'string', description: 'Conversation ID (optional, creates new if absent)' },
        content: { type: 'string', description: 'Message content' },
        model: { type: 'string', description: 'Model override (optional)' },
        stream: { type: 'boolean', description: 'Stream the response (optional)' },
      },
      required: ['projectId', 'content'],
    },
  },
];

export async function handleConversationTool(
  name: string,
  args: Record<string, unknown>,
  _sdk: FidscriptSDK,
): Promise<unknown> {
  const projectId = args['projectId'] as string;
  switch (name) {
    case 'ai_listConversations':
      return callApi(
        `/api/v1/projects/${projectId}/ai/conversations` +
          (args['limit'] ? `?limit=${args['limit']}` : ''),
      );
    case 'ai_createConversation':
      return callApi(`/api/v1/projects/${projectId}/ai/conversations`, 'POST', {
        type: args['type'],
        model: args['model'],
        metadata: args['metadata'],
      });
    case 'ai_getConversation':
      return callApi(
        `/api/v1/projects/${projectId}/ai/conversations/${args['conversationId'] as string}`,
      );
    case 'ai_sendChatMessage': {
      const conversationId = args['conversationId'] as string | undefined;
      if (conversationId) {
        return callApi(
          `/api/v1/projects/${projectId}/ai/conversations/${conversationId}/messages`,
          'POST',
          {
            content: args['content'],
            model: args['model'],
            stream: args['stream'],
          },
        );
      }
      return callApi(`/api/v1/projects/${projectId}/ai/chat`, 'POST', {
        content: args['content'],
      });
    }
    default:
      throw new Error(`Unknown AI conversation tool: ${name}`);
  }
}
