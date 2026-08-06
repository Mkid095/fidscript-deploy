/**
 * Env-var MCP tools — exposes project-scoped environment variable CRUD to AI
 * agents. Mirrors the SDK endpoints in `packages/sdk/src/modules/projects.ts`
 * (getEnvVars, setEnvVars, deleteEnvVar).
 *
 * The backend (apps/api/src/modules/projects/services/project-env.service.ts)
 * encrypts values at rest via AES-256-GCM and decrypts on read for owners /
 * admins only — the role mask is enforced server-side, not here.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const envVarTools: Tool[] = [
  {
    name: 'env_var_list',
    description:
      'List all environment variables for a project. Values are returned as "[masked]" for non-owner / non-admin callers — the backend enforces the role check.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project UUID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'env_var_set',
    description:
      'Upsert one or more env vars on a project. Values are AES-256-GCM encrypted at rest by the backend before persistence.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project UUID' },
        envVars: {
          type: 'object',
          description: 'Map of env var keys to plaintext values (e.g. { DATABASE_URL: "postgres://…" }).',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['projectId', 'envVars'],
    },
  },
  {
    name: 'env_var_delete',
    description: 'Delete a single env var by key.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project UUID' },
        key: { type: 'string', description: 'Env var key to delete' },
      },
      required: ['projectId', 'key'],
    },
  },
];

export async function handleEnvVarTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'env_var_list': {
      const projectId = args.projectId as string;
      if (!projectId) throw new Error('projectId is required');
      return sdk.projects.getEnvVars(projectId);
    }

    case 'env_var_set': {
      const projectId = args.projectId as string;
      const envVars = args.envVars as Record<string, string> | undefined;
      if (!projectId) throw new Error('projectId is required');
      if (!envVars || typeof envVars !== 'object') throw new Error('envVars must be a key→value object');
      return sdk.projects.setEnvVars(projectId, envVars);
    }

    case 'env_var_delete': {
      const projectId = args.projectId as string;
      const key = args.key as string;
      if (!projectId) throw new Error('projectId is required');
      if (!key) throw new Error('key is required');
      return sdk.projects.deleteEnvVar(projectId, key);
    }

    default:
      throw new Error(`Unknown env-var tool: ${name}`);
  }
}