/**
 * Phase 16 — FIDScript Platform SDK
 *
 * One canonical SDK for the entire FIDScript Deploy platform.
 * Consolidates and supersedes the old `apps/sdk` (axios) and `packages/sdk` (fetch).
 *
 * Usage:
 * ```ts
 * import { createFidscript } from '@fidscript/sdk';
 *
 * const fs = createFidscript({
 *   baseURL: 'https://api.your-deployment.example.com',
 *   apiKey: process.env.FIDSCRIPT_API_KEY,
 * });
 * const projects = await fs.projects.list();
 * ```
 *
 * `baseURL` is REQUIRED. There is no hardcoded default — every consumer of
 * this open-source SDK must explicitly point to their own API host. This is
 * deliberate: no implicit credential leakage, no silent cross-instance calls.
 */

import { FidscriptClient, FidscriptClientOptions } from './client';
import { AuthModule } from './modules/auth';
import { ProjectsModule } from './modules/projects';
import { DeploymentsModule } from './modules/deployments';
import { StorageModule } from './modules/storage';
import { DatabasesModule, DatabaseProvider } from './modules/databases';
export { DatabaseProvider };
export type { Database, TableInfo, ColumnInfo, RealtimeEvent, MigrationRecord, DataResult, Op, LiveQueryResult } from './modules/databases';
import { DomainsModule } from './modules/domains';
import { EmailModule, AdminMailboxModule, AdminAttachmentConfigModule, PlatformMailboxMessage, PlatformMailboxSummary, PlatformMailboxesResponse, CreatePlatformMailboxResponse, ListPlatformMessagesResponse, AdminSendMailResponse, AdminAttachmentConfig, StorageBackend, MailboxMessage, EmailDomain, Mailbox, EmailAlias } from './modules/email';
import { FunctionsModule } from './modules/functions';
import { QueuesModule } from './modules/queues';
import { CronModule } from './modules/cron';
import { RealtimeModule } from './modules/realtime';
import { MonitoringModule } from './modules/monitoring';
import { LoggingModule } from './modules/logging';
import { TemplatesModule } from './modules/templates';
import { GithubModule } from './modules/github';
import {
  FidscriptError,
  AuthError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from './modules/errors';

export { FidscriptClient, FidscriptClientOptions };
export { FidscriptError, AuthError, NotFoundError, ValidationError, RateLimitError };
export { AuthModule, ProjectsModule, DeploymentsModule, StorageModule, DatabasesModule, DomainsModule, EmailModule, FunctionsModule, QueuesModule, CronModule, RealtimeModule, MonitoringModule, LoggingModule, TemplatesModule, GithubModule };
export { AdminMailboxModule, AdminAttachmentConfigModule, type PlatformMailboxMessage, type PlatformMailboxSummary, type PlatformMailboxesResponse, type CreatePlatformMailboxResponse, type ListPlatformMessagesResponse, type AdminSendMailResponse, type AdminAttachmentConfig, type StorageBackend, type MailboxMessage, type EmailDomain, type Mailbox, type EmailAlias };
export type { Domain, DnsConnection, DomainHealth, DomainHealthStatus, DnsRecord, DnsRecordCategory, DnsRecordStatus, DnsRecordsResponse, DomainSslInfo, DomainType, DomainCapabilities } from './modules/domains';
export type { RealtimeEventHandler } from './modules/realtime';

export interface FidscriptSDK {
  auth: AuthModule;
  projects: ProjectsModule;
  deployments: DeploymentsModule;
  storage: StorageModule;
  databases: DatabasesModule;
  /** Convenience: returns a DatabaseProvider for the given database id. */
  database(databaseId: string): DatabaseProvider;
  domains: DomainsModule;
  email: EmailModule;
  functions: FunctionsModule;
  queues: QueuesModule;
  cron: CronModule;
  realtime: RealtimeModule;
  monitoring: MonitoringModule;
  logs: LoggingModule;
  templates: TemplatesModule;
  github: GithubModule;
}

export function createFidscript(options: {
  apiKey?: string;
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  onUnauthorized?: () => Promise<string | null>;
}): FidscriptSDK {
  const client = new FidscriptClient(options);
  return {
    auth: new AuthModule(client),
    projects: new ProjectsModule(client),
    deployments: new DeploymentsModule(client),
    storage: new StorageModule(client),
    databases: new DatabasesModule(client),
    database: (id: string) => new DatabasesModule(client).database(id),
    domains: new DomainsModule(client),
    email: new EmailModule(client),
    functions: new FunctionsModule(client),
    queues: new QueuesModule(client),
    cron: new CronModule(client),
    realtime: new RealtimeModule(client),
    monitoring: new MonitoringModule(client),
    logs: new LoggingModule(client),
    templates: new TemplatesModule(client),
    github: new GithubModule(client),
  };
}
