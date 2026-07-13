# SDK Modules — Structure and Conventions

## Source
`packages/sdk/src/`

## Entry Point (`index.ts`)

```typescript
import { createFidscript } from '@fidscript-deploy/sdk';

const fs = createFidscript({
  baseURL: 'https://api.example.com',   // REQUIRED, no default
  apiKey: '...',                          // optional
  timeout?: 30000,                        // optional, ms
  maxRetries?: 3,                         // optional
  onUnauthorized: async () => {            // optional, for token refresh
    return await refreshToken();
  },
});
```

Returns `FidscriptSDK` with all modules.

## Modules

| Module | Key Methods |
|--------|-------------|
| `auth` | login, logout, register, getSession, refreshToken, changePassword |
| `projects` | create, list, get, update, delete, getMembers, inviteMember |
| `deployments` | create, list, get, cancel, rollback |
| `storage` | createBucket, listBuckets, uploadFile, listFiles, deleteFile, getFileUrl |
| `databases` | create, list, get, update, delete, query, getTables, getColumns |
| `domains` | create, list, get, verify, checkHealth, getDnsRecords, reconcile |
| `email` | send, sendTemplated, listMessages, getMessageStatus, getDeliveryOverview, listTemplates, listDomains, setupDomain, verifyDkim |
| `functions` | create, list, get, update, delete, invoke, getLogs |
| `queues` | create, list, get, produce, consume, ack, nack |
| `cron` | create, list, get, update, delete, trigger, getRuns |
| `realtime` | connect (Socket.IO), subscribe, unsubscribe |
| `monitoring` | getMetrics, createAlertRule, getAlerts, acknowledgeAlert |
| `logs` | streamLogs, getLogs, createStream |
| `templates` | list, get, generateAndDeploy |
| `github` | connect, disconnect, listRepos, listBranches |
| `installation` | getStatus, configure, checkHealth |
| `notifications` | list, markRead, markAllRead, delete |

## FidscriptClient (`client.ts`)

Axios-based HTTP client:

```typescript
class FidscriptClient {
  constructor(options: FidscriptClientOptions) {
    this.client = axios.create({
      baseURL: options.baseURL + '/api/v1',  // Auto-prefixes
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
    });

    // 401 interceptor — transparent refresh
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401 && options.onUnauthorized) {
          const newToken = await options.onUnauthorized();
          if (newToken) {
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return this.client.request(error.config);
          }
        }
        throw this.normalizeError(error);
      }
    );
  }
}
```

## Error Types (`modules/errors.ts`)

```typescript
class FidscriptError extends Error {
  constructor(message: string, code?: string, statusCode?: number) { ... }
}
class AuthError extends FidscriptError { ... }        // 401
class NotFoundError extends FidscriptError { ... }    // 404
class ValidationError extends FidscriptError { ... }  // 422
class RateLimitError extends FidscriptError { ... }   // 429
```

**Important**: SDK return types use `failureType` (from `EmailFailureType` enum),
NOT `error`. The field is `EmailMessageStatus.failureType`.

## Database Provider (`modules/databases.ts`)

```typescript
class DatabaseProvider {
  // Per-database instance — connects to a specific managed database
  query<T>(sql: string, params?: any[]): Promise<DataResult>
  getTables(): Promise<TableInfo[]>
  getColumns(tableName: string): Promise<ColumnInfo[]>
  liveQuery(sql: string): AsyncIterable<LiveQueryResult>
  // ...
}

// Convenience on FidscriptSDK:
const db = fs.database('db-uuid');  // gets a DatabaseProvider for that DB
```

## Exports from SDK root

```typescript
// Core
export { createFidscript, FidscriptClient, FidscriptClientOptions };
export type { FidscriptSDK };

// Typed errors
export { FidscriptError, AuthError, NotFoundError, ValidationError, RateLimitError };

// All modules
export { AuthModule, ProjectsModule, DeploymentsModule, StorageModule,
         DatabasesModule, DomainsModule, EmailModule, FunctionsModule,
         QueuesModule, CronModule, RealtimeModule, MonitoringModule,
         LoggingModule, TemplatesModule, GithubModule, InstallationModule,
         NotificationsModule };

// Database types
export type { Database, TableInfo, ColumnInfo, RealtimeEvent,
                MigrationRecord, DataResult, Op, LiveQueryResult };
```
