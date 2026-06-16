# Event Catalog

Complete reference of all platform events with schemas.

---

## Event Schema

All platform events follow this base structure:

```typescript
interface PlatformEvent {
  id: string;                    // UUID
  eventType: string;             // e.g., "project.created"
  sourceService: string;        // e.g., "projects-service"
  projectId?: string;           // Optional project association
  userId?: string;              // Optional user association
  resourceType?: string;         // e.g., "project", "deployment"
  resourceId?: string;          // UUID of the resource
  payload: Record<string, any>;   // Event-specific data
  correlationId?: string;        // For tracing related events
  causationId?: string;         // ID of the event that caused this
  timestamp: string;            // ISO 8601
}
```

---

## Event Categories

### Identity Events

### `user.created`

Fired when a new user registers or is created by an admin.

```json
{
  "eventType": "user.created",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "resourceType": "user",
  "resourceId": "usr_abc123",
  "payload": {
    "email": "user@example.com",
    "name": "John Doe",
    "method": "email_password"
  }
}
```

### `user.updated`

Fired when user profile is modified.

```json
{
  "eventType": "user.updated",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "resourceType": "user",
  "resourceId": "usr_abc123",
  "payload": {
    "changes": ["name", "avatar_url"],
    "previousValues": {
      "name": "John"
    }
  }
}
```

### `user.deleted`

Fired when a user account is removed.

```json
{
  "eventType": "user.deleted",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "payload": {
    "email": "user@example.com",
    "reason": "user_requested"
  }
}
```

### `user.login`

Fired on successful authentication.

```json
{
  "eventType": "user.login",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "payload": {
    "method": "email_password",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### `user.logout`

Fired when a session is invalidated.

```json
{
  "eventType": "user.logout",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "payload": {
    "sessionId": "ses_xyz789",
    "reason": "user_initiated"
  }
}
```

### `session.created`

Fired when a new session is established.

```json
{
  "eventType": "session.created",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "resourceType": "session",
  "resourceId": "ses_xyz789",
  "payload": {
    "expiresAt": "2026-06-17T12:00:00Z",
    "ipAddress": "192.168.1.1"
  }
}
```

### `session.revoked`

Fired when a session is forcefully invalidated.

```json
{
  "eventType": "session.revoked",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "payload": {
    "sessionId": "ses_xyz789",
    "reason": "admin_action"
  }
}
```

### `api_key.created`

Fired when an API key is generated.

```json
{
  "eventType": "api_key.created",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "resourceType": "api_key",
  "resourceId": "key_abc123",
  "payload": {
    "name": "Production API Key",
    "permissions": ["projects:read", "deployments:write"]
  }
}
```

### `api_key.revoked`

Fired when an API key is deleted.

```json
{
  "eventType": "api_key.revoked",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "payload": {
    "keyId": "key_abc123",
    "name": "Production API Key"
  }
}
```

### `mfa.enabled`

Fired when MFA is activated for a user.

```json
{
  "eventType": "mfa.enabled",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "payload": {
    "method": "totp"
  }
}
```

### `mfa.disabled`

Fired when MFA is deactivated.

```json
{
  "eventType": "mfa.disabled",
  "sourceService": "identity-service",
  "userId": "usr_abc123",
  "payload": {
    "reason": "user_requested"
  }
}
```

---

## Project Events

### `project.created`

Fired when a new project is provisioned.

```json
{
  "eventType": "project.created",
  "sourceService": "project-service",
  "userId": "usr_abc123",
  "projectId": "prj_abc123",
  "resourceType": "project",
  "resourceId": "prj_abc123",
  "payload": {
    "name": "my-application",
    "type": "frontend",
    "slug": "my-application",
    "subdomain": "my-application.fidscript.dev"
  }
}
```

### `project.updated`

Fired when project settings change.

```json
{
  "eventType": "project.updated",
  "sourceService": "project-service",
  "userId": "usr_abc123",
  "projectId": "prj_abc123",
  "resourceType": "project",
  "resourceId": "prj_abc123",
  "payload": {
    "changes": ["env_vars", "build_settings"],
    "previousValues": {
      "env_vars": {}
    }
  }
}
```

### `project.deleted`

Fired when a project is permanently removed.

```json
{
  "eventType": "project.deleted",
  "sourceService": "project-service",
  "userId": "usr_abc123",
  "projectId": "prj_abc123",
  "payload": {
    "name": "my-application",
    "reason": "user_requested"
  }
}
```

### `project.suspended`

Fired when a project is paused.

```json
{
  "eventType": "project.suspended",
  "sourceService": "project-service",
  "projectId": "prj_abc123",
  "resourceType": "project",
  "resourceId": "prj_abc123",
  "payload": {
    "reason": "billing_overdue"
  }
}
```

### `project.archived`

Fired when a project is archived (read-only).

```json
{
  "eventType": "project.archived",
  "sourceService": "project-service",
  "projectId": "prj_abc123",
  "resourceType": "project",
  "resourceId": "prj_abc123",
  "payload": {}
}
```

### `project.cloned`

Fired when a project is duplicated.

```json
{
  "eventType": "project.cloned",
  "sourceService": "project-service",
  "userId": "usr_abc123",
  "projectId": "prj_abc123",
  "resourceType": "project",
  "resourceId": "prj_new456",
  "payload": {
    "sourceProjectId": "prj_abc123",
    "newProjectName": "my-application-clone"
  }
}
```

### `project.restored`

Fired when a suspended or archived project is reactivated.

```json
{
  "eventType": "project.restored",
  "sourceService": "project-service",
  "projectId": "prj_abc123",
  "resourceType": "project",
  "resourceId": "prj_abc123",
  "payload": {
    "previousStatus": "suspended"
  }
}
```

---

## Deployment Events

### `deployment.started`

Fired when a deployment is triggered.

```json
{
  "eventType": "deployment.started",
  "sourceService": "deployment-service",
  "userId": "usr_abc123",
  "projectId": "prj_abc123",
  "resourceType": "deployment",
  "resourceId": "dpl_abc123",
  "payload": {
    "version": "1.0.0",
    "source": "git",
    "branch": "main",
    "commitSha": "abc123def456"
  }
}
```

### `deployment.building`

Fired when the build phase begins.

```json
{
  "eventType": "deployment.building",
  "sourceService": "deployment-service",
  "projectId": "prj_abc123",
  "resourceType": "deployment",
  "resourceId": "dpl_abc123",
  "payload": {
    "buildStrategy": "buildpack",
    "runtime": "nodejs18"
  }
}
```

### `deployment.deploying`

Fired when containers are being started.

```json
{
  "eventType": "deployment.deploying",
  "sourceService": "deployment-service",
  "projectId": "prj_abc123",
  "resourceType": "deployment",
  "resourceId": "dpl_abc123",
  "payload": {
    "containerCount": 2,
    "replicas": 2
  }
}
```

### `deployment.succeeded`

Fired when deployment completes successfully.

```json
{
  "eventType": "deployment.succeeded",
  "sourceService": "deployment-service",
  "projectId": "prj_abc123",
  "resourceType": "deployment",
  "resourceId": "dpl_abc123",
  "payload": {
    "version": "1.0.0",
    "durationMs": 45000,
    "url": "https://my-application.fidscript.dev"
  }
}
```

### `deployment.failed`

Fired when deployment fails.

```json
{
  "eventType": "deployment.failed",
  "sourceService": "deployment-service",
  "projectId": "prj_abc123",
  "resourceType": "deployment",
  "resourceId": "dpl_abc123",
  "payload": {
    "version": "1.0.0",
    "errorCode": "BUILD_FAILED",
    "errorMessage": "npm install exited with code 1"
  }
}
```

### `deployment.rolled_back`

Fired when deployment is reverted.

```json
{
  "eventType": "deployment.rolled_back",
  "sourceService": "deployment-service",
  "userId": "usr_abc123",
  "projectId": "prj_abc123",
  "resourceType": "deployment",
  "resourceId": "dpl_abc123",
  "payload": {
    "rolledBackToVersion": "0.9.0",
    "previousDeploymentId": "dpl_xyz789"
  }
}
```

---

## Domain Events

### `domain.added`

Fired when a domain is registered.

```json
{
  "eventType": "domain.added",
  "sourceService": "domain-service",
  "projectId": "prj_abc123",
  "resourceType": "domain",
  "resourceId": "dom_abc123",
  "payload": {
    "domain": "myapp.com",
    "isCustom": true
  }
}
```

### `domain.verified`

Fired when DNS validation succeeds.

```json
{
  "eventType": "domain.verified",
  "sourceService": "domain-service",
  "projectId": "prj_abc123",
  "resourceType": "domain",
  "resourceId": "dom_abc123",
  "payload": {
    "domain": "myapp.com",
    "verificationMethods": ["A_RECORD", "CNAME"]
  }
}
```

### `domain.failed`

Fired when domain verification fails.

```json
{
  "eventType": "domain.failed",
  "sourceService": "domain-service",
  "projectId": "prj_abc123",
  "resourceType": "domain",
  "resourceId": "dom_abc123",
  "payload": {
    "domain": "myapp.com",
    "errorCode": "DNS_NOT_PROPAGATED",
    "errorMessage": "A record not found after 24 hours"
  }
}
```

### `domain.ssl_enabled`

Fired when SSL certificate is provisioned.

```json
{
  "eventType": "domain.ssl_enabled",
  "sourceService": "domain-service",
  "projectId": "prj_abc123",
  "resourceType": "domain",
  "resourceId": "dom_abc123",
  "payload": {
    "domain": "myapp.com",
    "certificateId": "cert_xyz789",
    "expiresAt": "2026-09-16T00:00:00Z"
  }
}
```

### `domain.deleted`

Fired when a domain is removed.

```json
{
  "eventType": "domain.deleted",
  "sourceService": "domain-service",
  "projectId": "prj_abc123",
  "payload": {
    "domain": "myapp.com"
  }
}
```

---

## Database Events

### `database.provisioned`

Fired when a managed database is created.

```json
{
  "eventType": "database.provisioned",
  "sourceService": "database-service",
  "projectId": "prj_abc123",
  "resourceType": "database",
  "resourceId": "db_abc123",
  "payload": {
    "name": "myapp_db",
    "type": "postgres",
    "host": "postgres.internal",
    "port": 5432
  }
}
```

### `database.updated`

Fired when database settings change.

```json
{
  "eventType": "database.updated",
  "sourceService": "database-service",
  "projectId": "prj_abc123",
  "resourceType": "database",
  "resourceId": "db_abc123",
  "payload": {
    "changes": ["max_connections"],
    "previousValues": {
      "max_connections": 50
    }
  }
}
```

### `database.backup_started`

Fired when a backup begins.

```json
{
  "eventType": "database.backup_started",
  "sourceService": "database-service",
  "projectId": "prj_abc123",
  "resourceType": "database",
  "resourceId": "db_abc123",
  "payload": {
    "backupId": "bak_xyz789",
    "type": "automated"
  }
}
```

### `database.backup_completed`

Fired when backup finishes.

```json
{
  "eventType": "database.backup_completed",
  "sourceService": "database-service",
  "projectId": "prj_abc123",
  "resourceType": "database",
  "resourceId": "db_abc123",
  "payload": {
    "backupId": "bak_xyz789",
    "sizeBytes": 52428800,
    "durationMs": 30000
  }
}
```

### `database.restored`

Fired when database is restored from backup.

```json
{
  "eventType": "database.restored",
  "sourceService": "database-service",
  "projectId": "prj_abc123",
  "resourceType": "database",
  "resourceId": "db_abc123",
  "payload": {
    "backupId": "bak_xyz789",
    "restoredAt": "2026-06-16T10:00:00Z"
  }
}
```

### `database.deleted`

Fired when a database is deleted.

```json
{
  "eventType": "database.deleted",
  "sourceService": "database-service",
  "projectId": "prj_abc123",
  "payload": {
    "name": "myapp_db"
  }
}
```

---

## Storage Events

### `storage.bucket_created`

Fired when a storage bucket is created.

```json
{
  "eventType": "storage.bucket_created",
  "sourceService": "storage-service",
  "projectId": "prj_abc123",
  "resourceType": "bucket",
  "resourceId": "bkt_abc123",
  "payload": {
    "name": "assets",
    "provider": "internal"
  }
}
```

### `storage.file_uploaded`

Fired when a file is uploaded.

```json
{
  "eventType": "storage.file_uploaded",
  "sourceService": "storage-service",
  "projectId": "prj_abc123",
  "resourceType": "file",
  "resourceId": "file_xyz789",
  "payload": {
    "bucketId": "bkt_abc123",
    "key": "images/logo.png",
    "sizeBytes": 15234,
    "mimeType": "image/png"
  }
}
```

### `storage.file_deleted`

Fired when a file is removed.

```json
{
  "eventType": "storage.file_deleted",
  "sourceService": "storage-service",
  "projectId": "prj_abc123",
  "payload": {
    "bucketId": "bkt_abc123",
    "key": "images/logo.png"
  }
}
```

### `storage.bucket_deleted`

Fired when a bucket is removed.

```json
{
  "eventType": "storage.bucket_deleted",
  "sourceService": "storage-service",
  "projectId": "prj_abc123",
  "payload": {
    "name": "assets"
  }
}
```

---

## Email Events

### `email.sent`

Fired when an email is submitted for delivery.

```json
{
  "eventType": "email.sent",
  "sourceService": "email-service",
  "projectId": "prj_abc123",
  "resourceType": "email",
  "resourceId": "eml_abc123",
  "payload": {
    "from": "no-reply@myapp.com",
    "to": ["user@example.com"],
    "subject": "Welcome!",
    "provider": "stalwart"
  }
}
```

### `email.delivered`

Fired when email is confirmed delivered.

```json
{
  "eventType": "email.delivered",
  "sourceService": "email-service",
  "projectId": "prj_abc123",
  "resourceType": "email",
  "resourceId": "eml_abc123",
  "payload": {
    "messageId": "abc123@provider.com",
    "deliveredAt": "2026-06-16T10:05:00Z"
  }
}
```

### `email.bounced`

Fired when email delivery fails.

```json
{
  "eventType": "email.bounced",
  "sourceService": "email-service",
  "projectId": "prj_abc123",
  "resourceType": "email",
  "resourceId": "eml_abc123",
  "payload": {
    "bounceType": "permanent",
    "reason": "mailbox_not_found"
  }
}
```

### `email.domain_added`

Fired when an email sending domain is added.

```json
{
  "eventType": "email.domain_added",
  "sourceService": "email-service",
  "projectId": "prj_abc123",
  "resourceType": "email_domain",
  "resourceId": "edm_abc123",
  "payload": {
    "domain": "myapp.com"
  }
}
```

### `email.mailbox_created`

Fired when a mailbox is created.

```json
{
  "eventType": "email.mailbox_created",
  "sourceService": "email-service",
  "projectId": "prj_abc123",
  "resourceType": "mailbox",
  "resourceId": "mbx_abc123",
  "payload": {
    "address": "contact@myapp.com"
  }
}
```

---

## Functions Events

### `function.created`

Fired when a serverless function is registered.

```json
{
  "eventType": "function.created",
  "sourceService": "functions-service",
  "projectId": "prj_abc123",
  "resourceType": "function",
  "resourceId": "fn_abc123",
  "payload": {
    "name": "processPayment",
    "runtime": "nodejs18"
  }
}
```

### `function.deployed`

Fired when a new function version is deployed.

```json
{
  "eventType": "function.deployed",
  "sourceService": "functions-service",
  "projectId": "prj_abc123",
  "resourceType": "function",
  "resourceId": "fn_abc123",
  "payload": {
    "name": "processPayment",
    "version": "1.0.0",
    "codeDigest": "sha256:abc123..."
  }
}
```

### `function.invoked`

Fired when a function is executed.

```json
{
  "eventType": "function.invoked",
  "sourceService": "functions-service",
  "projectId": "prj_abc123",
  "resourceType": "function",
  "resourceId": "fn_abc123",
  "payload": {
    "name": "processPayment",
    "version": "1.0.0",
    "invocationId": "inv_xyz789",
    "durationMs": 145
  }
}
```

### `function.error`

Fired when a function execution fails.

```json
{
  "eventType": "function.error",
  "sourceService": "functions-service",
  "projectId": "prj_abc123",
  "resourceType": "function",
  "resourceId": "fn_abc123",
  "payload": {
    "name": "processPayment",
    "error": "Connection timeout",
    "invocationId": "inv_xyz789"
  }
}
```

### `function.deleted`

Fired when a function is removed.

```json
{
  "eventType": "function.deleted",
  "sourceService": "functions-service",
  "projectId": "prj_abc123",
  "payload": {
    "name": "processPayment"
  }
}
```

---

## Queue Events

### `queue.created`

Fired when a queue is created.

```json
{
  "eventType": "queue.created",
  "sourceService": "queue-service",
  "projectId": "prj_abc123",
  "resourceType": "queue",
  "resourceId": "q_abc123",
  "payload": {
    "name": "order-notifications",
    "type": "work"
  }
}
```

### `queue.message_published`

Fired when a message is sent to a queue.

```json
{
  "eventType": "queue.message_published",
  "sourceService": "queue-service",
  "projectId": "prj_abc123",
  "resourceType": "queue",
  "resourceId": "q_abc123",
  "payload": {
    "messageId": "msg_xyz789",
    "queueName": "order-notifications"
  }
}
```

### `queue.message_consumed`

Fired when a message is successfully processed.

```json
{
  "eventType": "queue.message_consumed",
  "sourceService": "queue-service",
  "projectId": "prj_abc123",
  "resourceType": "queue",
  "resourceId": "q_abc123",
  "payload": {
    "messageId": "msg_xyz789",
    "processingTimeMs": 234
  }
}
```

### `queue.message_failed`

Fired when message processing fails.

```json
{
  "eventType": "queue.message_failed",
  "sourceService": "queue-service",
  "projectId": "prj_abc123",
  "resourceType": "queue",
  "resourceId": "q_abc123",
  "payload": {
    "messageId": "msg_xyz789",
    "error": "Timeout",
    "retryCount": 3
  }
}
```

### `queue.dead_lettered`

Fired when a message exceeds retry limits.

```json
{
  "eventType": "queue.dead_lettered",
  "sourceService": "queue-service",
  "projectId": "prj_abc123",
  "resourceType": "queue",
  "resourceId": "q_abc123",
  "payload": {
    "messageId": "msg_xyz789",
    "reason": "max_retries_exceeded"
  }
}
```

---

## Cron Events

### `cron.job_created`

Fired when a cron job is registered.

```json
{
  "eventType": "cron.job_created",
  "sourceService": "cron-service",
  "projectId": "prj_abc123",
  "resourceType": "cron_job",
  "resourceId": "cj_abc123",
  "payload": {
    "name": "daily-report",
    "schedule": "0 9 * * *"
  }
}
```

### `cron.job_run_started`

Fired when a cron job execution begins.

```json
{
  "eventType": "cron.job_run_started",
  "sourceService": "cron-service",
  "projectId": "prj_abc123",
  "resourceType": "cron_execution",
  "resourceId": "ce_xyz789",
  "payload": {
    "jobId": "cj_abc123",
    "scheduledFor": "2026-06-16T09:00:00Z"
  }
}
```

### `cron.job_run_completed`

Fired when cron job finishes successfully.

```json
{
  "eventType": "cron.job_run_completed",
  "sourceService": "cron-service",
  "projectId": "prj_abc123",
  "resourceType": "cron_execution",
  "resourceId": "ce_xyz789",
  "payload": {
    "jobId": "cj_abc123",
    "durationMs": 5000,
    "responseCode": 200
  }
}
```

### `cron.job_run_failed`

Fired when cron job execution fails.

```json
{
  "eventType": "cron.job_run_failed",
  "sourceService": "cron-service",
  "projectId": "prj_abc123",
  "resourceType": "cron_execution",
  "resourceId": "ce_xyz789",
  "payload": {
    "jobId": "cj_abc123",
    "error": "Connection refused"
  }
}
```

### `cron.job_deleted`

Fired when a cron job is removed.

```json
{
  "eventType": "cron.job_deleted",
  "sourceService": "cron-service",
  "projectId": "prj_abc123",
  "payload": {
    "name": "daily-report"
  }
}
```

---

## Realtime Events

### `realtime.channel_created`

Fired when a realtime channel is created.

```json
{
  "eventType": "realtime.channel_created",
  "sourceService": "realtime-service",
  "projectId": "prj_abc123",
  "resourceType": "channel",
  "resourceId": "ch_abc123",
  "payload": {
    "name": "project-updates",
    "isPrivate": false
  }
}
```

### `realtime.client_joined`

Fired when a client subscribes to a channel.

```json
{
  "eventType": "realtime.client_joined",
  "sourceService": "realtime-service",
  "projectId": "prj_abc123",
  "resourceType": "channel",
  "resourceId": "ch_abc123",
  "payload": {
    "connectionId": "conn_xyz789",
    "userId": "usr_abc123"
  }
}
```

### `realtime.client_left`

Fired when a client unsubscribes.

```json
{
  "eventType": "realtime.client_left",
  "sourceService": "realtime-service",
  "projectId": "prj_abc123",
  "resourceType": "channel",
  "resourceId": "ch_abc123",
  "payload": {
    "connectionId": "conn_xyz789"
  }
}
```

---

## Skills Events

### `skill.installed`

Fired when a skill is installed.

```json
{
  "eventType": "skill.installed",
  "sourceService": "skills-service",
  "projectId": "prj_abc123",
  "resourceType": "skill",
  "resourceId": "sk_abc123",
  "payload": {
    "skillSlug": "cms-blog-generator",
    "version": "1.2.0"
  }
}
```

### `skill.uninstalled`

Fired when a skill is removed.

```json
{
  "eventType": "skill.uninstalled",
  "sourceService": "skills-service",
  "projectId": "prj_abc123",
  "payload": {
    "skillSlug": "cms-blog-generator"
  }
}
```

### `skill.updated`

Fired when a skill is upgraded.

```json
{
  "eventType": "skill.updated",
  "sourceService": "skills-service",
  "projectId": "prj_abc123",
  "resourceType": "skill",
  "resourceId": "sk_abc123",
  "payload": {
    "skillSlug": "cms-blog-generator",
    "fromVersion": "1.1.0",
    "toVersion": "1.2.0"
  }
}
```

---

## Event Subscription Patterns

### Webhook Delivery

```json
{
  "deliveryId": "dlv_abc123",
  "event": { ... },
  "deliveredAt": "2026-06-16T10:00:00Z",
  "attempts": 1,
  "response": {
    "statusCode": 200,
    "body": "OK"
  }
}
```

### NATS Subject Mapping

| Event Category | NATS Subject Pattern |
|----------------|---------------------|
| Identity | `identity.user.*` |
| Projects | `projects.project.*` |
| Deployments | `projects.deployment.*` |
| Domains | `projects.domain.*` |
| Databases | `infrastructure.database.*` |
| Storage | `storage.*` |
| Email | `email.*` |
| Functions | `functions.*` |
| Queues | `queues.*` |
| Cron | `cron.*` |
| Realtime | `realtime.*` |
| Skills | `skills.*` |
