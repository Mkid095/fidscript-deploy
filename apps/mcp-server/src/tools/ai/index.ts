/**
 * AI MCP tools — aggregated tool list and dispatcher.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { conversationTools, handleConversationTool } from './conversations.js';
import { diagnosticTools, handleDiagnosticTool } from './diagnostics.js';

export const aiTools: Tool[] = [
  ...conversationTools,
  ...diagnosticTools,
];

export async function handleAiTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  if (
    name === 'ai_listConversations' ||
    name === 'ai_createConversation' ||
    name === 'ai_getConversation' ||
    name === 'ai_sendChatMessage'
  ) {
    return handleConversationTool(name, args, sdk);
  }
  if (
    name === 'ai_diagnoseIssue' ||
    name === 'ai_recommendSolution' ||
    name === 'ai_generateTemplate' ||
    name === 'ai_explainError' ||
    name === 'ai_suggestFix' ||
    name === 'ai_assistDeployment'
  ) {
    return handleDiagnosticTool(name, args, sdk);
  }
  throw new Error(`Unknown AI tool: ${name}`);
}
