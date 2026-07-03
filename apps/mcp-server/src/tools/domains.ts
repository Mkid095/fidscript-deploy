/**
 * Domain MCP tools — exposes domain DNS operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript/sdk';

export const domainTools: Tool[] = [
  {
    name: 'domain_list',
    description: 'List all domains registered in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'domain_add',
    description: 'Register a new domain for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        domain: { type: 'string', description: 'Domain name (e.g. example.com)' },
      },
      required: ['projectId', 'domain'],
    },
  },
  {
    name: 'domain_verify',
    description: 'Trigger DNS verification for a domain.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        domainId: { type: 'string', description: 'Domain ID' },
      },
      required: ['projectId', 'domainId'],
    },
  },
];

export async function handleDomainTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'domain_list':
      return sdk.domains.list(args.projectId as string);

    case 'domain_add':
      return sdk.domains.create(args.projectId as string, args.domain as string);

    case 'domain_verify':
      return sdk.domains.verify(args.domainId as string);

    default:
      throw new Error(`Unknown domain tool: ${name}`);
  }
}
