/**
 * Functions MCP tools — exposes edge functions operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const functionTools: Tool[] = [
  {
    name: 'functions_list',
    description: 'List all edge functions in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'functions_get',
    description: 'Get details of a specific edge function.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        functionId: { type: 'string', description: 'Function ID' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'functions_create',
    description: 'Create a new edge function.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Function name' },
        runtime: { type: 'string', description: 'Runtime (e.g. nodejs20, deno, etc.)' },
        memoryMb: { type: 'number', description: 'Memory limit in MB (optional)' },
        timeoutSeconds: { type: 'number', description: 'Timeout in seconds (optional)' },
      },
      required: ['projectId', 'name', 'runtime'],
    },
  },
  {
    name: 'functions_update',
    description: 'Update an edge function\'s settings.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        functionId: { type: 'string', description: 'Function ID' },
        memoryMb: { type: 'number', description: 'Memory limit in MB' },
        timeoutSeconds: { type: 'number', description: 'Timeout in seconds' },
        currentVersion: { type: 'string', description: 'Version to mark as active' },
        envVars: { type: 'object', description: 'Environment variables' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'functions_deploy',
    description: 'Deploy new code to an edge function.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        functionId: { type: 'string', description: 'Function ID' },
        code: { type: 'string', description: 'Function code as a string' },
        version: { type: 'string', description: 'Optional version string' },
      },
      required: ['projectId', 'functionId', 'code'],
    },
  },
  {
    name: 'functions_invoke',
    description: 'Synchronously invoke an edge function with a payload.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        functionId: { type: 'string', description: 'Function ID' },
        payload: { type: 'object', description: 'Event payload to pass to the function' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'functions_delete',
    description: 'Delete an edge function.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        functionId: { type: 'string', description: 'Function ID' },
      },
      required: ['projectId', 'functionId'],
    },
  },
];

export async function handleFunctionTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'functions_list':
      return sdk.functions.list(args.projectId as string);

    case 'functions_get':
      return sdk.functions.get(args.projectId as string, args.functionId as string);

    case 'functions_create':
      return sdk.functions.create(args.projectId as string, {
        name: args.name as string,
        runtime: args.runtime as string,
        memoryMb: args.memoryMb as number | undefined,
        timeoutSeconds: args.timeoutSeconds as number | undefined,
      });

    case 'functions_update':
      return sdk.functions.update(args.projectId as string, args.functionId as string, {
        memoryMb: args.memoryMb as number | undefined,
        timeoutSeconds: args.timeoutSeconds as number | undefined,
        currentVersion: args.currentVersion as string | undefined,
        envVars: args.envVars as Record<string, string> | undefined,
      });

    case 'functions_deploy':
      return sdk.functions.deploy(
        args.projectId as string,
        args.functionId as string,
        args.code as string,
        args.version as string | undefined,
      );

    case 'functions_invoke':
      return sdk.functions.invoke(
        args.projectId as string,
        args.functionId as string,
        args.payload as Parameters<typeof sdk.functions.invoke>[2],
      );

    case 'functions_delete':
      return sdk.functions.delete(args.projectId as string, args.functionId as string);

    default:
      throw new Error(`Unknown function tool: ${name}`);
  }
}
