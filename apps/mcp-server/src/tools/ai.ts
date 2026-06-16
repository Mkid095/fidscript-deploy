import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const aiTools: Tool[] = [
  {
    name: 'ai_chat',
    description: 'Quick chat with AI assistant for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        content: { type: 'string', description: 'Message content' },
      },
      required: ['projectId', 'content'],
    },
  },
  {
    name: 'ai_create_conversation',
    description: 'Create a new AI conversation',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        type: { type: 'string', description: 'Conversation type (general, error, deployment)' },
        model: { type: 'string', description: 'AI model to use' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'ai_list_conversations',
    description: 'List AI conversations for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'ai_get_conversation',
    description: 'Get AI conversation with messages',
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
    name: 'ai_send_message',
    description: 'Send message in AI conversation',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        conversationId: { type: 'string', description: 'Conversation ID' },
        content: { type: 'string', description: 'Message content' },
        model: { type: 'string', description: 'AI model override' },
      },
      required: ['projectId', 'conversationId', 'content'],
    },
  },
  {
    name: 'ai_delete_conversation',
    description: 'Delete AI conversation',
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
    name: 'ai_diagnose_error',
    description: 'Diagnose an error and get fix recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        error: { type: 'string', description: 'Error message or stack trace' },
        context: {
          type: 'object',
          description: 'Additional context (deployment, function, etc.)',
        },
      },
      required: ['projectId', 'error'],
    },
  },
  {
    name: 'ai_get_recommendations',
    description: 'Get infrastructure recommendations for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        resourceType: { type: 'string', description: 'Resource type (deployment, database, function)' },
        currentSetup: { type: 'object', description: 'Current infrastructure setup' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'ai_assist_deployment',
    description: 'Get deployment assistance',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID (optional)' },
        action: { type: 'string', description: 'Action needed (deploy, rollback, troubleshoot)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'ai_assist_project_generation',
    description: 'Get assistance generating a new project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        description: { type: 'string', description: 'Project description' },
        requirements: { type: 'array', items: { type: 'string' }, description: 'Requirements' },
        templateId: { type: 'string', description: 'Template ID to use' },
      },
      required: ['projectId', 'description'],
    },
  },
];