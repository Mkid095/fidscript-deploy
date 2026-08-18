export const SCOPE_ALLOWLIST = [
  // Project-scoped
  'projects:read',
  'projects:write',
  'projects:delete',
  // Compute
  'functions:read',
  'functions:write',
  // Data
  'databases:read',
  'databases:write',
  'storage:read',
  'storage:write',
  'queues:read',
  'queues:write',
  // Email
  'email:send',
  'email:read',
  // Scheduler
  'cron:read',
  'cron:write',
  // Deploy
  'deployments:read',
  'deployments:write',
  'deployments:delete',
  // Domains
  'domains:read',
  'domains:write',
  'domains:delete',
  // Env vars
  'envvars:read',
  'envvars:write',
  // Observability
  'monitoring:read',
  'monitoring:write',
  'logs:read',
  'logs:write',
  // Realtime
  'realtime:read',
  'realtime:write',
  // AI
  'ai:read',
  'ai:write',
  // Marketplace
  'marketplace:read',
  'marketplace:write',
  'marketplace:submit',
  'marketplace:admin',
  // Auth / sessions (account-level)
  'auth:read',
  'auth:write',
  // Organization
  'org:read',
  'org:write',
  'org:manage-members',
  'org:manage-teams',
] as const;

export type Scope = (typeof SCOPE_ALLOWLIST)[number];
export const SCOPE_SET = new Set<string>(SCOPE_ALLOWLIST);
