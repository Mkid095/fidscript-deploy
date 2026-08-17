/**
 * Storage MCP tools — exposes storage bucket and file operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const storageTools: Tool[] = [
  {
    name: 'storage_listBuckets',
    description: 'List all storage buckets in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'storage_createBucket',
    description: 'Create a new storage bucket.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Bucket name' },
        provider: { type: 'string', description: 'Storage provider (default internal)' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'storage_deleteBucket',
    description: 'Delete a storage bucket and all its files.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        bucketId: { type: 'string', description: 'Bucket ID' },
      },
      required: ['projectId', 'bucketId'],
    },
  },
  {
    name: 'storage_listFiles',
    description: 'List files in a storage bucket.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        bucketId: { type: 'string', description: 'Bucket ID' },
        prefix: { type: 'string', description: 'Filter by key prefix (optional)' },
        page: { type: 'number', description: 'Page number (optional)' },
        limit: { type: 'number', description: 'Results per page (optional)' },
      },
      required: ['projectId', 'bucketId'],
    },
  },
  {
    name: 'storage_uploadFile',
    description: 'Upload a file to a storage bucket. Pass file content as base64-encoded string.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        bucketId: { type: 'string', description: 'Bucket ID' },
        fileContent: { type: 'string', description: 'File content as base64-encoded string' },
        name: { type: 'string', description: 'File name' },
        contentType: { type: 'string', description: 'MIME type (optional)' },
        key: { type: 'string', description: 'Storage key/path (optional)' },
      },
      required: ['projectId', 'bucketId', 'fileContent', 'name'],
    },
  },
  {
    name: 'storage_deleteFile',
    description: 'Delete a file from a storage bucket.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        bucketId: { type: 'string', description: 'Bucket ID' },
        fileId: { type: 'string', description: 'File ID' },
      },
      required: ['projectId', 'bucketId', 'fileId'],
    },
  },
  {
    name: 'storage_getSignedUrl',
    description: 'Get a temporary signed URL to access a private file.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        bucketId: { type: 'string', description: 'Bucket ID' },
        fileId: { type: 'string', description: 'File ID' },
        expiresIn: { type: 'number', description: 'URL expiration in seconds (default 3600)' },
      },
      required: ['projectId', 'bucketId', 'fileId'],
    },
  },
];

export async function handleStorageTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'storage_listBuckets':
      return sdk.storage.listBuckets(args.projectId as string);

    case 'storage_createBucket':
      return sdk.storage.createBucket(
        args.projectId as string,
        args.name as string,
        args.provider as 'cloudinary' | 'telegram' | 'internal' | undefined,
      );

    case 'storage_deleteBucket':
      return sdk.storage.deleteBucket(args.projectId as string, args.bucketId as string);

    case 'storage_listFiles':
      return sdk.storage.listFiles(args.projectId as string, args.bucketId as string, {
        prefix: args.prefix as string | undefined,
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
      });

    case 'storage_uploadFile': {
      const fileContent = args.fileContent as string;
      const buffer = Buffer.from(fileContent, 'base64');
      return sdk.storage.uploadFile(
        args.projectId as string,
        args.bucketId as string,
        buffer,
        args.name as string,
        {
          contentType: args.contentType as string | undefined,
          key: args.key as string | undefined,
        },
      );
    }

    case 'storage_deleteFile':
      return sdk.storage.deleteFile(args.projectId as string, args.bucketId as string, args.fileId as string);

    case 'storage_getSignedUrl':
      return sdk.storage.getSignedUrl(
        args.projectId as string,
        args.bucketId as string,
        args.fileId as string,
        args.expiresIn as number | undefined,
      );

    default:
      throw new Error(`Unknown storage tool: ${name}`);
  }
}
