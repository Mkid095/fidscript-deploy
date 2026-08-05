/**
 * Deployment MCP tools — exposes deployment operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const deploymentTools: Tool[] = [
  {
    name: 'deployments_list',
    description: 'List all deployments for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        page: { type: 'number', description: 'Page number (default 1)' },
        limit: { type: 'number', description: 'Results per page (default 20)' },
        status: { type: 'string', description: 'Filter by deployment status' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'deployments_get',
    description: 'Get details of a specific deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'deployments_create',
    description: 'Create a new deployment for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        source: {
          type: 'object',
          description: 'Source configuration for the deployment',
          properties: {
            type: { type: 'string', enum: ['git', 'archive'] },
            git: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                credentials: { type: 'string' },
                branch: { type: 'string' },
                dockerfilePath: { type: 'string' },
              },
            },
            archive: {
              type: 'object',
              properties: {
                bucketId: { type: 'string' },
                objectKey: { type: 'string' },
                dockerfilePath: { type: 'string' },
              },
            },
          },
        },
        branch: { type: 'string', description: 'Git branch to deploy' },
        commitSha: { type: 'string', description: 'Specific commit SHA to deploy' },
        envVars: { type: 'object', description: 'Environment variables to inject' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'deployments_getLogs',
    description: 'Get build/runtime logs for a deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'deployments_stop',
    description: 'Stop a running deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'deployments_restart',
    description: 'Restart a stopped or failed deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'deployments_destroy',
    description: 'Permanently destroy a deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'deployments_rollback',
    description: 'Rollback a deployment to a previous release or specific deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        deploymentId: { type: 'string', description: 'Deployment ID to rollback' },
        targetDeploymentId: { type: 'string', description: 'Optional specific deployment ID to rollback to' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
];

export async function handleDeploymentTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'deployments_list':
      return sdk.deployments.list(args.projectId as string, {
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
        status: args.status as string | undefined,
      });

    case 'deployments_get':
      return sdk.deployments.get(args.projectId as string, args.deploymentId as string);

    case 'deployments_create': {
      const input: Record<string, unknown> = {};
      if (args.source) input.source = args.source;
      if (args.branch) input.branch = args.branch;
      if (args.commitSha) input.commitSha = args.commitSha;
      if (args.envVars) input.envVars = args.envVars;
      return sdk.deployments.create(args.projectId as string, input as Parameters<typeof sdk.deployments.create>[1]);
    }

    case 'deployments_getLogs':
      return sdk.deployments.getLogs(args.projectId as string, args.deploymentId as string);

    case 'deployments_stop':
      return sdk.deployments.stop(args.projectId as string, args.deploymentId as string);

    case 'deployments_restart':
      return sdk.deployments.restart(args.projectId as string, args.deploymentId as string);

    case 'deployments_destroy':
      return sdk.deployments.destroy(args.projectId as string, args.deploymentId as string);

    case 'deployments_rollback':
      return sdk.deployments.rollback(
        args.projectId as string,
        args.deploymentId as string,
        args.targetDeploymentId as string | undefined,
      );

    default:
      throw new Error(`Unknown deployment tool: ${name}`);
  }
}
