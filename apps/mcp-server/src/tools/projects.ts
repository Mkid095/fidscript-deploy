/**
 * Project MCP tools — exposes project operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const projectTools: Tool[] = [
  {
    name: 'project_list',
    description: 'List all projects.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'project_create',
    description: 'Create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        type: { type: 'string', description: 'Project type (frontend, backend, fullstack)' },
      },
      required: ['name'],
    },
  },
];

export async function handleProjectTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'project_list':
      return sdk.projects.list();

    case 'project_create':
      return sdk.projects.create({
        name: args.name as string,
        type: (args.type as string) ?? 'frontend',
      });

    default:
      throw new Error(`Unknown project tool: ${name}`);
  }
}
