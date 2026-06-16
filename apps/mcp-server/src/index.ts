import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';

const API_BASE_URL = process.env.FIDSCRIPT_API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

// API client helper
async function apiRequest(method: string, path: string, data?: any, apiKey?: string) {
  const response = await axios({
    method,
    url: `${API_BASE_URL}${API_PREFIX}${path}`,
    data,
    headers: {
      'Authorization': `Bearer ${apiKey || process.env.FIDSCRIPT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

// Create MCP server
const server = new Server(
  {
    name: 'fidscript',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ===== TOOL DEFINITIONS =====

const tools = [
  // ============ AUTH MODULE ============
  {
    name: 'auth_register',
    description: 'Register a new user account on FIDScript platform',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email address' },
        password: { type: 'string', description: 'User password (min 8 characters)' },
        name: { type: 'string', description: 'User display name' },
      },
      required: ['email', 'password'],
    },
  },
  {
    name: 'auth_login',
    description: 'Login to FIDScript platform and get access token',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email' },
        password: { type: 'string', description: 'User password' },
      },
      required: ['email', 'password'],
    },
  },
  {
    name: 'auth_magic_link',
    description: 'Request a passwordless magic link for login',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email' },
      },
      required: ['email'],
    },
  },
  {
    name: 'auth_verify_magic_link',
    description: 'Verify magic link token and login',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Magic link token from email' },
      },
      required: ['token'],
    },
  },
  {
    name: 'auth_logout',
    description: 'Logout current session',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'auth_get_session',
    description: 'Get current authenticated user session info',
    inputSchema: { type: 'object', properties: {} },
  },

  // ============ PROJECTS MODULE ============
  {
    name: 'list_projects',
    description: 'List all projects for the authenticated user',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project',
    description: 'Get details of a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        type: { type: 'string', description: 'Project type: FRONTEND, BACKEND, WORKER, CRON, DOCKER, STATIC' },
        description: { type: 'string', description: 'Project description' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update project settings',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        envVars: { type: 'object', description: 'Environment variables as key-value pairs' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project and all its resources',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project_members',
    description: 'List all members of a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'add_project_member',
    description: 'Add a user to project as member',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', description: 'Member role: viewer, developer, admin' },
      },
      required: ['projectId', 'email', 'role'],
    },
  },
  {
    name: 'remove_project_member',
    description: 'Remove member from project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        userId: { type: 'string' },
      },
      required: ['projectId', 'userId'],
    },
  },
  {
    name: 'get_project_env_vars',
    description: 'Get project environment variables',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'set_project_env_vars',
    description: 'Set/update project environment variables',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        envVars: { type: 'object' },
      },
      required: ['projectId', 'envVars'],
    },
  },

  // ============ DEPLOYMENTS MODULE ============
  {
    name: 'list_deployments',
    description: 'List all deployments for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_deployment',
    description: 'Get deployment details',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        deploymentId: { type: 'string' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'create_deployment',
    description: 'Create a new deployment',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        sourceRepo: { type: 'string', description: 'Git repository URL' },
        sourceBranch: { type: 'string', description: 'Branch to deploy (default: main)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'rollback_deployment',
    description: 'Rollback to a previous deployment',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        deploymentId: { type: 'string' },
      },
      required: ['projectId', 'deploymentId'],
    },
  },
  {
    name: 'get_build_config',
    description: 'Get project build configuration',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'update_build_config',
    description: 'Update project build configuration',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        buildCommand: { type: 'string' },
        outputDirectory: { type: 'string' },
        healthCheckPath: { type: 'string' },
      },
      required: ['projectId'],
    },
  },

  // ============ STORAGE MODULE ============
  {
    name: 'list_buckets',
    description: 'List storage buckets for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_bucket',
    description: 'Create a new storage bucket',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        provider: { type: 'string', description: 'Storage provider: internal, cloudinary, s3' },
        isPublic: { type: 'boolean' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'delete_bucket',
    description: 'Delete a storage bucket',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        bucketId: { type: 'string' },
      },
      required: ['projectId', 'bucketId'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a bucket',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        bucketId: { type: 'string' },
      },
      required: ['projectId', 'bucketId'],
    },
  },
  {
    name: 'upload_file',
    description: 'Upload a file to storage bucket (base64 encoded content)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        bucketId: { type: 'string' },
        name: { type: 'string' },
        content: { type: 'string', description: 'Base64 encoded file content' },
        contentType: { type: 'string' },
      },
      required: ['projectId', 'bucketId', 'name', 'content'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from bucket',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        bucketId: { type: 'string' },
        fileId: { type: 'string' },
      },
      required: ['projectId', 'bucketId', 'fileId'],
    },
  },
  {
    name: 'get_signed_url',
    description: 'Get temporary signed URL to access private file',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        bucketId: { type: 'string' },
        fileId: { type: 'string' },
        expiresIn: { type: 'number', description: 'URL expiration in seconds (default: 3600)' },
      },
      required: ['projectId', 'bucketId', 'fileId'],
    },
  },

  // ============ DATABASE MODULE ============
  {
    name: 'list_databases',
    description: 'List managed databases for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_database',
    description: 'Provision a new managed database',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string', description: 'Database type: postgresql, mysql, redis' },
        version: { type: 'string' },
        size: { type: 'string', description: 'Size: small, medium, large' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'get_database',
    description: 'Get database details and connection info',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        databaseId: { type: 'string' },
      },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'delete_database',
    description: 'Delete a managed database',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        databaseId: { type: 'string' },
      },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'rotate_database_credentials',
    description: 'Rotate database credentials (generates new password)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        databaseId: { type: 'string' },
      },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'list_database_backups',
    description: 'List backups for a database',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        databaseId: { type: 'string' },
      },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'create_database_backup',
    description: 'Create a manual backup',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        databaseId: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['projectId', 'databaseId'],
    },
  },
  {
    name: 'restore_database_backup',
    description: 'Restore database from backup',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        databaseId: { type: 'string' },
        backupId: { type: 'string' },
      },
      required: ['projectId', 'databaseId', 'backupId'],
    },
  },

  // ============ EMAIL MODULE ============
  {
    name: 'send_email',
    description: 'Send an email',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        to: { type: 'string' },
        subject: { type: 'string' },
        text: { type: 'string' },
        html: { type: 'string' },
        from: { type: 'string' },
        replyTo: { type: 'string' },
      },
      required: ['projectId', 'to', 'subject'],
    },
  },
  {
    name: 'list_mailboxes',
    description: 'List email mailboxes for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_mailbox',
    description: 'Create an email mailbox',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['projectId', 'email'],
    },
  },
  {
    name: 'delete_mailbox',
    description: 'Delete an email mailbox',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        mailboxId: { type: 'string' },
      },
      required: ['projectId', 'mailboxId'],
    },
  },
  {
    name: 'list_email_aliases',
    description: 'List email aliases',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_email_alias',
    description: 'Create an email alias',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        alias: { type: 'string' },
        forwardsTo: { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
      },
      required: ['projectId', 'alias', 'forwardsTo'],
    },
  },
  {
    name: 'verify_email_domain',
    description: 'Verify domain for email (DKIM, SPF, DMARC)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        domain: { type: 'string' },
      },
      required: ['projectId', 'domain'],
    },
  },
  {
    name: 'get_email_logs',
    description: 'Get email sending logs',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['projectId'],
    },
  },

  // ============ FUNCTIONS MODULE ============
  {
    name: 'list_functions',
    description: 'List serverless functions for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_function',
    description: 'Get function details',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        functionId: { type: 'string' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'create_function',
    description: 'Create a new serverless function',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        runtime: { type: 'string', description: 'Runtime: nodejs, python, php, go, rust' },
        entryPoint: { type: 'string' },
        memoryMb: { type: 'number' },
        timeoutSeconds: { type: 'number' },
      },
      required: ['projectId', 'name', 'runtime'],
    },
  },
  {
    name: 'update_function',
    description: 'Update function configuration',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        functionId: { type: 'string' },
        memoryMb: { type: 'number' },
        timeoutSeconds: { type: 'number' },
        envVars: { type: 'object' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'delete_function',
    description: 'Delete a serverless function',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        functionId: { type: 'string' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'deploy_function',
    description: 'Deploy function code',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        functionId: { type: 'string' },
        code: { type: 'string', description: 'Function source code' },
        version: { type: 'string' },
      },
      required: ['projectId', 'functionId', 'code'],
    },
  },
  {
    name: 'invoke_function',
    description: 'Invoke a serverless function synchronously',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        functionId: { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'get_function_logs',
    description: 'Get function execution logs',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        functionId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['projectId', 'functionId'],
    },
  },
  {
    name: 'get_function_versions',
    description: 'Get function version history',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        functionId: { type: 'string' },
      },
      required: ['projectId', 'functionId'],
    },
  },

  // ============ QUEUES MODULE ============
  {
    name: 'list_queues',
    description: 'List message queues for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_queue',
    description: 'Create a new message queue',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string', description: 'Type: stream, queue, workqueue' },
        retentionDays: { type: 'number' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'delete_queue',
    description: 'Delete a message queue',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        queueId: { type: 'string' },
      },
      required: ['projectId', 'queueId'],
    },
  },
  {
    name: 'publish_message',
    description: 'Publish message to queue',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        queueId: { type: 'string' },
        body: { type: 'string', description: 'Message body (JSON string)' },
        headers: { type: 'object' },
        delaySeconds: { type: 'number' },
      },
      required: ['projectId', 'queueId', 'body'],
    },
  },
  {
    name: 'publish_batch_messages',
    description: 'Publish multiple messages to queue',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        queueId: { type: 'string' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              body: { type: 'string' },
              headers: { type: 'object' },
            },
          },
        },
      },
      required: ['projectId', 'queueId', 'messages'],
    },
  },
  {
    name: 'consume_messages',
    description: 'Consume messages from queue',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        queueId: { type: 'string' },
        maxMessages: { type: 'number' },
        timeoutSeconds: { type: 'number' },
      },
      required: ['projectId', 'queueId'],
    },
  },
  {
    name: 'acknowledge_messages',
    description: 'Acknowledge successful message processing',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        queueId: { type: 'string' },
        messageIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['projectId', 'queueId', 'messageIds'],
    },
  },
  {
    name: 'retry_messages',
    description: 'Retry failed messages',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        queueId: { type: 'string' },
        messageIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['projectId', 'queueId', 'messageIds'],
    },
  },
  {
    name: 'get_queue_stats',
    description: 'Get queue statistics',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        queueId: { type: 'string' },
      },
      required: ['projectId', 'queueId'],
    },
  },

  // ============ CRON MODULE ============
  {
    name: 'list_cron_jobs',
    description: 'List cron jobs for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_cron_job',
    description: 'Get cron job details',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        jobId: { type: 'string' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'create_cron_job',
    description: 'Create a new cron job',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        cronExpression: { type: 'string', description: 'Cron expression (e.g., */5 * * * *)' },
        timezone: { type: 'string' },
        endpoint: { type: 'string' },
        functionId: { type: 'string' },
        payload: { type: 'object' },
        enabled: { type: 'boolean' },
      },
      required: ['projectId', 'name', 'cronExpression'],
    },
  },
  {
    name: 'update_cron_job',
    description: 'Update cron job',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        jobId: { type: 'string' },
        name: { type: 'string' },
        cronExpression: { type: 'string' },
        enabled: { type: 'boolean' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'delete_cron_job',
    description: 'Delete a cron job',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        jobId: { type: 'string' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'trigger_cron_job',
    description: 'Manually trigger a cron job',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        jobId: { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'get_cron_job_runs',
    description: 'Get cron job execution history',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        jobId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['projectId', 'jobId'],
    },
  },
  {
    name: 'get_cron_job_next_run',
    description: 'Get next scheduled run time',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        jobId: { type: 'string' },
      },
      required: ['projectId', 'jobId'],
    },
  },

  // ============ REALTIME MODULE ============
  {
    name: 'list_realtime_channels',
    description: 'List realtime channels for a project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_realtime_channel',
    description: 'Create a realtime channel',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        isPrivate: { type: 'boolean' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'delete_realtime_channel',
    description: 'Delete a realtime channel',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        channelId: { type: 'string' },
      },
      required: ['projectId', 'channelId'],
    },
  },
  {
    name: 'get_realtime_channel_presence',
    description: 'Get channel presence (online users)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        channelId: { type: 'string' },
      },
      required: ['projectId', 'channelId'],
    },
  },

  // ============ MONITORING MODULE ============
  {
    name: 'record_metric',
    description: 'Record a custom metric',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        metric: { type: 'string', description: 'Metric name' },
        value: { type: 'number' },
        labels: { type: 'object' },
      },
      required: ['projectId', 'metric', 'value'],
    },
  },
  {
    name: 'get_metrics',
    description: 'Get metrics for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        metric: { type: 'string' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_metric_summary',
    description: 'Get metric summary with min/max/avg',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        metric: { type: 'string' },
        interval: { type: 'string', description: 'Interval: 5m, 15m, 1h, 6h, 24h, 7d' },
      },
      required: ['projectId', 'metric'],
    },
  },
  {
    name: 'create_alert_rule',
    description: 'Create an alert rule',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        metric: { type: 'string' },
        condition: { type: 'string', description: 'above, below, equals' },
        threshold: { type: 'number' },
        severity: { type: 'string' },
        durationSeconds: { type: 'number' },
      },
      required: ['projectId', 'name', 'metric', 'condition', 'threshold'],
    },
  },
  {
    name: 'list_alert_rules',
    description: 'List alert rules',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'delete_alert_rule',
    description: 'Delete an alert rule',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        ruleId: { type: 'string' },
      },
      required: ['projectId', 'ruleId'],
    },
  },
  {
    name: 'get_alerts',
    description: 'Get active alerts',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        status: { type: 'string' },
        severity: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'acknowledge_alert',
    description: 'Acknowledge an alert',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        alertId: { type: 'string' },
      },
      required: ['projectId', 'alertId'],
    },
  },
  {
    name: 'resolve_alert',
    description: 'Resolve an alert',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        alertId: { type: 'string' },
      },
      required: ['projectId', 'alertId'],
    },
  },
  {
    name: 'get_monitoring_stats',
    description: 'Get dashboard monitoring statistics',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },

  // ============ LOGGING MODULE ============
  {
    name: 'write_log',
    description: 'Write a log entry',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        stream: { type: 'string' },
        level: { type: 'string' },
        message: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['projectId', 'stream', 'level', 'message'],
    },
  },
  {
    name: 'write_batch_logs',
    description: 'Write multiple log entries',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              stream: { type: 'string' },
              level: { type: 'string' },
              message: { type: 'string' },
              metadata: { type: 'object' },
            },
          },
        },
      },
      required: ['projectId', 'logs'],
    },
  },
  {
    name: 'get_logs',
    description: 'Get logs with filters',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        stream: { type: 'string' },
        level: { type: 'string' },
        search: { type: 'string' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_log_stats',
    description: 'Get log statistics',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        stream: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_log_timeline',
    description: 'Get log timeline histogram',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        stream: { type: 'string' },
        interval: { type: 'string' },
      },
      required: ['projectId', 'stream'],
    },
  },
  {
    name: 'list_log_streams',
    description: 'List log streams',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },

  // ============ APP AUTH MODULE ============
  {
    name: 'app_auth_register',
    description: 'Register app-level user (for project-specific auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['projectId', 'email', 'password'],
    },
  },
  {
    name: 'app_auth_login',
    description: 'App-level login',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
      },
      required: ['projectId', 'email', 'password'],
    },
  },
  {
    name: 'app_auth_magic_link',
    description: 'Request app-level magic link',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['projectId', 'email'],
    },
  },
  {
    name: 'app_auth_verify_magic_link',
    description: 'Verify app-level magic link',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        token: { type: 'string' },
      },
      required: ['projectId', 'token'],
    },
  },
  {
    name: 'app_auth_create_role',
    description: 'Create app-level role',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'app_auth_list_roles',
    description: 'List app-level roles',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'app_auth_assign_role',
    description: 'Assign role to user',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string' },
        roleName: { type: 'string' },
      },
      required: ['projectId', 'email', 'roleName'],
    },
  },
];

// ===== REQUEST HANDLERS =====

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // AUTH
      case 'auth_register':
        return handleResponse(await apiRequest('POST', '/auth/register', args));
      case 'auth_login':
        return handleResponse(await apiRequest('POST', '/auth/login', args));
      case 'auth_magic_link':
        return handleResponse(await apiRequest('POST', '/auth/magic-link', args));
      case 'auth_verify_magic_link':
        return handleResponse(await apiRequest('POST', '/auth/verify-magic-link', args));
      case 'auth_logout':
        return handleResponse(await apiRequest('POST', '/auth/logout'));
      case 'auth_get_session':
        return handleResponse(await apiRequest('GET', '/auth/session'));

      // PROJECTS
      case 'list_projects':
        return handleResponse(await apiRequest('GET', '/projects'));
      case 'get_project':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}`));
      case 'create_project':
        return handleResponse(await apiRequest('POST', '/projects', args));
      case 'update_project':
        return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}`, args));
      case 'delete_project':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}`));
      case 'get_project_members':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/members`));
      case 'add_project_member':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/members`, args));
      case 'remove_project_member':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/members/${args.userId}`));
      case 'get_project_env_vars':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/env`));
      case 'set_project_env_vars':
        return handleResponse(await apiRequest('PUT', `/projects/${args.projectId}/env`, { envVars: args.envVars }));

      // DEPLOYMENTS
      case 'list_deployments':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/deployments`));
      case 'get_deployment':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/deployments/${args.deploymentId}`));
      case 'create_deployment':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/deployments`, args));
      case 'rollback_deployment':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/deployments/${args.deploymentId}/rollback`));
      case 'get_build_config':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/deployments/config`));
      case 'update_build_config':
        return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}/deployments/config`, args));

      // STORAGE
      case 'list_buckets':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/storage/buckets`));
      case 'create_bucket':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/storage/buckets`, args));
      case 'delete_bucket':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/storage/buckets/${args.bucketId}`));
      case 'list_files':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files`));
      case 'upload_file':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files`, args));
      case 'delete_file':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files/${args.fileId}`));
      case 'get_signed_url':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/storage/buckets/${args.bucketId}/files/${args.fileId}/url`, { expiresIn: args.expiresIn }));

      // DATABASES
      case 'list_databases':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/databases`));
      case 'create_database':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases`, args));
      case 'get_database':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/databases/${args.databaseId}`));
      case 'delete_database':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/databases/${args.databaseId}`));
      case 'rotate_database_credentials':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases/${args.databaseId}/credentials/rotate`, args));
      case 'list_database_backups':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/databases/${args.databaseId}/backups`));
      case 'create_database_backup':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases/${args.databaseId}/backups`, args));
      case 'restore_database_backup':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/databases/${args.databaseId}/backups/${args.backupId}/restore`, args));

      // EMAIL
      case 'send_email':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/send`, args));
      case 'list_mailboxes':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/email/mailboxes`));
      case 'create_mailbox':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/mailboxes`, args));
      case 'delete_mailbox':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/email/mailboxes/${args.mailboxId}`));
      case 'list_email_aliases':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/email/aliases`));
      case 'create_email_alias':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/aliases`, args));
      case 'verify_email_domain':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/email/verify-domain`, args));
      case 'get_email_logs':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/email/logs`, { limit: args.limit }));

      // FUNCTIONS
      case 'list_functions':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions`));
      case 'get_function':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions/${args.functionId}`));
      case 'create_function':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/functions`, args));
      case 'update_function':
        return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}/functions/${args.functionId}`, args));
      case 'delete_function':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/functions/${args.functionId}`));
      case 'deploy_function':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/functions/${args.functionId}/deploy`, args));
      case 'invoke_function':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/functions/${args.functionId}/invoke`, { payload: args.payload }));
      case 'get_function_logs':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions/${args.functionId}/logs`, { limit: args.limit }));
      case 'get_function_versions':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/functions/${args.functionId}/versions`));

      // QUEUES
      case 'list_queues':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/queues`));
      case 'create_queue':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues`, args));
      case 'delete_queue':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/queues/${args.queueId}`));
      case 'publish_message':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/messages`, args));
      case 'publish_batch_messages':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/messages/batch`, args));
      case 'consume_messages':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/consume`, args));
      case 'acknowledge_messages':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/ack`, { messageIds: args.messageIds }));
      case 'retry_messages':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/queues/${args.queueId}/retry`, { messageIds: args.messageIds }));
      case 'get_queue_stats':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/queues/${args.queueId}/stats`));

      // CRON
      case 'list_cron_jobs':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron`));
      case 'get_cron_job':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron/${args.jobId}`));
      case 'create_cron_job':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/cron`, args));
      case 'update_cron_job':
        return handleResponse(await apiRequest('PATCH', `/projects/${args.projectId}/cron/${args.jobId}`, args));
      case 'delete_cron_job':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/cron/${args.jobId}`));
      case 'trigger_cron_job':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/cron/${args.jobId}/trigger`, { payload: args.payload }));
      case 'get_cron_job_runs':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron/${args.jobId}/runs`, { limit: args.limit }));
      case 'get_cron_job_next_run':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/cron/${args.jobId}/next-run`));

      // REALTIME
      case 'list_realtime_channels':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/realtime/channels`));
      case 'create_realtime_channel':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/realtime/channels`, args));
      case 'delete_realtime_channel':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/realtime/channels/${args.channelId}`));
      case 'get_realtime_channel_presence':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/realtime/channels/${args.channelId}/presence`));

      // MONITORING
      case 'record_metric':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/metrics`, args));
      case 'get_metrics':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/metrics`, args));
      case 'get_metric_summary':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/metrics/${args.metric}/summary`, { interval: args.interval }));
      case 'create_alert_rule':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/alerts/rules`, args));
      case 'list_alert_rules':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/alerts/rules`));
      case 'delete_alert_rule':
        return handleResponse(await apiRequest('DELETE', `/projects/${args.projectId}/monitoring/alerts/rules/${args.ruleId}`));
      case 'get_alerts':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/alerts`, args));
      case 'acknowledge_alert':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/alerts/${args.alertId}/acknowledge`));
      case 'resolve_alert':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/monitoring/alerts/${args.alertId}/resolve`));
      case 'get_monitoring_stats':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/monitoring/stats`));

      // LOGGING
      case 'write_log':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/logs`, args));
      case 'write_batch_logs':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/logs/batch`, args));
      case 'get_logs':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs`, args));
      case 'get_log_stats':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs/stats`, { stream: args.stream }));
      case 'get_log_timeline':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs/streams/${args.stream}/timeline`, { interval: args.interval }));
      case 'list_log_streams':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/logs/streams`));

      // APP AUTH
      case 'app_auth_register':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/register`, args));
      case 'app_auth_login':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/login`, args));
      case 'app_auth_magic_link':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/magic-link`, args));
      case 'app_auth_verify_magic_link':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/verify-magic-link`, args));
      case 'app_auth_create_role':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/roles`, args));
      case 'app_auth_list_roles':
        return handleResponse(await apiRequest('GET', `/projects/${args.projectId}/auth/roles`));
      case 'app_auth_assign_role':
        return handleResponse(await apiRequest('POST', `/projects/${args.projectId}/auth/roles/assign`, args));

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

function handleResponse(data: any) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// Start server
server.start().catch(console.error);

console.error('FIDScript MCP Server running on stdio');