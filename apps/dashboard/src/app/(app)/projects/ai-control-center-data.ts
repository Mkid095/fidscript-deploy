/**
 * ai-control-center-data.ts
 * Static data + generators for the AI Control Center.
 * No runtime state — pure functions driven by the selected AccountKey.
 */

export const SCOPE_DEFINITIONS: Record<string, { label: string; description: string }> = {
  // Projects
  'projects:read':   { label: 'Projects: Read',   description: 'List and view all projects' },
  'projects:write':  { label: 'Projects: Write',  description: 'Create, update, and clone projects' },
  'projects:delete': { label: 'Projects: Delete', description: 'Delete projects permanently' },
  // Compute
  'functions:read':  { label: 'Functions: Read',  description: 'List, get, and view function code/logs' },
  'functions:write': { label: 'Functions: Write', description: 'Create, update, deploy, invoke, and delete functions' },
  // Data
  'databases:read':  { label: 'Databases: Read',  description: 'List, query, and inspect databases' },
  'databases:write':  { label: 'Databases: Write', description: 'Create, update, and delete databases' },
  'storage:read':     { label: 'Storage: Read',    description: 'List buckets and read objects' },
  'storage:write':    { label: 'Storage: Write',   description: 'Upload, update, and delete objects' },
  'queues:read':      { label: 'Queues: Read',     description: 'Read messages from queues' },
  'queues:write':     { label: 'Queues: Write',    description: 'Publish messages to queues' },
  // Email
  'email:send':       { label: 'Email: Send',      description: 'Send transactional emails via SMTP' },
  'email:read':       { label: 'Email: Read',      description: 'Read email inbox and message status' },
  // Scheduler
  'cron:read':        { label: 'Cron: Read',       description: 'List and inspect cron jobs' },
  'cron:write':       { label: 'Cron: Write',      description: 'Create, update, trigger, and delete cron jobs' },
  // Deploy
  'deployments:read':   { label: 'Deployments: Read',   description: 'List, get, and view deployment logs' },
  'deployments:write':  { label: 'Deployments: Write',  description: 'Create, stop, restart, and rollback deployments' },
  'deployments:delete': { label: 'Deployments: Delete', description: 'Permanently destroy deployments' },
  // Domains
  'domains:read':   { label: 'Domains: Read',   description: 'List, inspect, and check domain health' },
  'domains:write':  { label: 'Domains: Write',  description: 'Add, verify, configure, and manage domains' },
  'domains:delete': { label: 'Domains: Delete',  description: 'Remove domains from the platform' },
  // Env vars
  'envvars:read':  { label: 'Env Vars: Read',  description: 'Read environment variables' },
  'envvars:write': { label: 'Env Vars: Write', description: 'Set and delete environment variables' },
  // Observability
  'monitoring:read':  { label: 'Monitoring: Read',  description: 'View metrics, alerts, and channel configs' },
  'monitoring:write': { label: 'Monitoring: Write', description: 'Create and update alert rules and channels' },
  'logs:read':        { label: 'Logs: Read',         description: 'Query and stream log data' },
  'logs:write':       { label: 'Logs: Write',         description: 'Ingest log entries' },
  // Realtime
  'realtime:read':  { label: 'Realtime: Read',  description: 'Subscribe to realtime event streams' },
  'realtime:write': { label: 'Realtime: Write', description: 'Publish presence and events' },
  // AI
  'ai:read':        { label: 'AI: Read',         description: 'Inspect AI model configurations' },
  'ai:write':       { label: 'AI: Write',        description: 'Configure AI models and prompts' },
  // Marketplace
  'marketplace:read':    { label: 'Marketplace: Read',    description: 'Browse the template marketplace' },
  'marketplace:write':   { label: 'Marketplace: Write',   description: 'Submit and update templates' },
  'marketplace:submit': { label: 'Marketplace: Submit',   description: 'Publish templates to the marketplace' },
  'marketplace:admin':  { label: 'Marketplace: Admin',    description: 'Moderate and manage marketplace' },
  // Auth / sessions
  'auth:read': { label: 'Auth: Read', description: 'View active sessions and API keys' },
  'auth:write': { label: 'Auth: Write', description: 'Revoke sessions and API keys' },
  // Organization
  'org:read':            { label: 'Org: Read',             description: 'View organization members and teams' },
  'org:write':           { label: 'Org: Write',            description: 'Update organization settings' },
  'org:manage-members':   { label: 'Org: Manage Members',  description: 'Add, remove, and update member roles' },
  'org:manage-teams':     { label: 'Org: Manage Teams',    description: 'Create and manage teams' },
};

export function getMcpConfig(apiKey: string, apiUrl: string): string {
  return JSON.stringify({
    mcpServers: {
      fidscript: {
        command: 'npx',
        args: ['-y', '@fidscript-deploy/mcp-server'],
        env: {
          FIDSCRIPT_API_KEY: apiKey,
          FIDSCRIPT_API_URL: apiUrl,
        },
      },
    },
  }, null, 2);
}

export function getCliLoginCommand(apiKey: string): string {
  return `fidscript login ${apiKey}`;
}

export function getSdkInitCode(apiKey: string, apiUrl: string): string {
  return `import { createFidscript } from '@fidscript-deploy/sdk';

const sdk = createFidscript({
  apiKey: '${apiKey}',
  baseURL: '${apiUrl}',
});

// Example: list projects
const { projects } = await sdk.projects.list();
console.log(projects);`;
}
