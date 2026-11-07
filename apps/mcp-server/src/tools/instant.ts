/**
 * Instant MCP tools — the platform's view of a project's data plane.
 *
 * An application's tables, users and permissions live in its Instant app.
 * These tools provision that app and report its address, so an agent can
 * set up a project's data plane without leaving the conversation.
 *
 * The data plane's OWN MCP server — the one that queries and writes the
 * data — is a separate server (`@fidscript/instant-mcp`). The platform's
 * MCP hub carries both.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const instantTools: Tool[] = [
  {
    name: 'instant_status',
    description:
      "Get the project's Instant app — the data plane where its tables, users and " +
      'permission rules live — and whether Instant is available on this platform.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'instant_provision',
    description:
      "Provision the project's Instant app. Every deployment of the project will then " +
      'carry its app id and hosts in its environment.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        title: { type: 'string', description: "The app's title (the project's name by default)" },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'instant_config',
    description:
      'Get what a deployed application needs to reach its data plane: the Instant app ' +
      'id and the API, realtime, storage and console hosts.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'instant_delete',
    description:
      "Delete the project's Instant app and everything in it — its tables, its users " +
      'and its permission rules. This cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
];

export async function handleInstantTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'instant_status':
      return sdk.instant.get(args.projectId as string);

    case 'instant_provision':
      return sdk.instant.provision(
        args.projectId as string,
        args.title as string | undefined,
      );

    case 'instant_config':
      return sdk.instant.clientConfig(args.projectId as string);

    case 'instant_delete':
      return sdk.instant.unlink(args.projectId as string);

    default:
      throw new Error(`Unknown Instant tool: ${name}`);
  }
}
