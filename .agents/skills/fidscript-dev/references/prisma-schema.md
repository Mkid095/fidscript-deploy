# Prisma Schema — Key Models and Patterns

## Source
`apps/api/prisma/schema.prisma`

## Critical Rules

### 1. Every enum MUST declare a schema
```prisma
enum Role {
  USER
  ADMIN
  OWNER
  @@schema("public")   // ← required, not optional
}
```
Missing `@@schema` defaults to "public". But explicit is better.

### 2. Every relation needs an inverse
Prisma requires explicit back-references. These were caught as bugs:
```prisma
// EmailMailbox must have:
legalHolds EmailLegalHold[]

// Organization must have:
members OrganizationMember[]
```

### 3. EmailMessage.body is NOT stored
Stalwart is the source of truth for email body. The DB only stores metadata.
If a PR adds a `body` field to `EmailMessage`, question it hard.

### 4. Binary targets for Docker
```prisma
generator client {
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```
"native" for local dev, "debian-openssl-3.0.x" for Docker runtime.

---

## Key Models

### User (identity schema)
```
id, email, passwordHash?, name?, avatarUrl?, role, mfaEnabled, mfaSecret?,
mustChangePassword, emailVerifiedAt?, preferredAuthMethod, lastLoginAt?,
verificationCode?, verificationCodeExpiresAt?, createdAt, updatedAt
Relations: sessions, apiKeys, auditLogs, projects (owner), memberships,
githubConnection, mailboxMemberships, verificationTokens, orgMemberships,
teamMemberships
```

### Organization (identity schema)
```
id, name, slug, logoUrl?, plan, createdAt, updatedAt
Relations: members (OrganizationMember[]), teams (Team[]),
invitations (Invitation[]), roles (OrgRole[])
```

### OrgRole (identity schema)
```
id, organizationId, name, permissions (Json[]), createdAt
Permissions stored as JSON array of permission name strings.
Default roles: OWNER, ADMIN, DEVELOPER, BILLING, VIEWER
```

### Team (identity schema)
```
id, organizationId, name, description?, createdAt, updatedAt
Default roles: LEAD, MEMBER, VIEWER
```

### Project (projects schema)
```
id, name, slug, description?, type (FRONTEND|BACKEND|WORKER|CRON|DOCKER|STATIC),
status, ownerId, region?, subdomain?, customDomains (Json), buildSettings (Json),
deploymentStrategy, sourceProvider?, sourceRepo?, sourceBranch, webhookSecret?,
githubHookId?, autoDeploy, lastDeployAt?, deletedAt?, createdAt, updatedAt
```
Project type enum uses `@@schema("public")`.

### Deployment (projects schema)
```
id, projectId, releaseId?, status (PENDING|QUEUED|BUILDING|DEPLOYING|SUCCESS|FAILED|STOPPED|BLOCKED|ROLLED_BACK),
deploymentUrl?, rolledBackToId?, createdAt, completedAt?
```
Build artifact data lives in `Release`, referenced by `releaseId`.

### EmailDomain (email schema)
```
id, projectId, domain, status, dkimVerified, spfVerified, dmarcVerified, mxVerified,
dkimSelector?, dkimPublicKey?, catchAllTarget?, ownershipToken?, verifiedAt?, createdAt
DKIM public key stored full value: v=DKIM1; k=ed25519; p=...
```

### EmailMailbox (email schema)
```
id, domainId, localPart, name?, quota (default 10GB), isActive,
stalwartAccountId?, createdAt, updatedAt
Relations: messages, members, conversations, legalHolds
```

### EmailMessage (email schema)
```
id, mailboxId?, conversationId?, senderIdentityId?, projectId, from, to, subject,
textBody?, htmlBody?, sizeBytes, isRead, isStarred, isDraft, spamScore?,
status (QUEUED|PROCESSING|SENT|DELIVERED|OPENED|CLICKED|BOUNCED|SOFT_BOUNCE|DEAD|RECEIVED|FAILED),
error?, failureType? (EmailFailureType enum), jmapMessageId?, receivedAt?,
lastAttemptAt?, nextRetryAt?, retryCount, createdAt, archivedAt?, retentionAppliedAt?
```
body is NOT stored — comes from Stalwart via JMAP.

### Domain (projects schema)
```
id, projectId, deploymentId?, dnsConnectionId?, domain, isCustom, isPrimary,
apexDomain, zoneDomain?, wildcardEnabled, wildcardTarget?, type (DomainType[]),
capabilities (Json), dnsMode, redirectMode, sslEnabled, sslStatus, sslMethod,
sslCertArn?, sslExpiresAt?, sslIssuedAt?, sslLastCheckedAt?, sslLastError?,
dnsStatus, dnsVerifiedAt?, routingVerifiedAt?, emailWarning, emailProvider?,
healthStatus, lastVerifiedAt?, nextVerificationAt?, verificationFailures,
lastHealthScore?, priority, lastDnsFingerprint?, createdAt
```

### DomainHealthStatus enum
```
PENDING, HEALTHY (score 80-100), DEGRADED (score 50-79), FAILED (score 0-49)
```

### SslStatus enum
```
PENDING, ISSUING, ACTIVE, FAILED, EXPIRED
```

### DomainType enum (capabilities per domain)
```
DEPLOYMENT, EMAIL, INBOUND_EMAIL, TRACKING, API, REDIRECT, SANDBOX
```

### ManagedDatabase (databases schema)
```
id, projectId, name, environment (production|staging|preview|development),
type (postgresql default), version, size, usedBytes, maxConnections,
status, host?, port?, username?, connectionInfo?, settings (Json),
backupRetentionDays, createdAt, updatedAt, clusterId?, provider
```

### Function (functions schema)
```
id, projectId, name, runtime (nodejs default), entryPoint, memoryMb (256),
timeoutSeconds (30), envVars (Json), settings (Json), currentVersion?,
status, createdAt, updatedAt
```

### Queue (queues schema)
```
id, projectId, name, type (stream), retentionDays (7), maxMessages (100000),
maxBytes (1GB), replicas (1), status, deadLetterQueue?, retryAttempts (3),
retryDelaySeconds (60), createdAt, updatedAt
```

### CronJob (scheduler schema)
```
id, projectId, name, cronExpression, timezone (UTC), endpoint?, functionId?,
payload (Json), enabled, retryAttempts (3), retryDelaySeconds (60),
timeoutSeconds (300), lastRunAt?, nextRunAt?, state (idling|scheduled|running|completed|failed|dead),
createdAt, updatedAt
```

### PlatformEvent (platform schema)
```
id, type, timestamp, actorId?, actorType?, resourceType, resourceId,
projectId?, metadata (Json), ipAddress?, userAgent?
```
`id` matches the event's own UUID (not auto-generated by Prisma).

### InstallationStatus (platform schema)
Singleton: `id = "installation"`. Lifecycle: UNCONFIGURED | CONFIGURING | CONFIGURED | FAILED | DEGRADED | RECONFIGURING.

### InstallationSettings (platform schema)
```
id (singleton), platformName, platformDomain, serverIp, adminEmail,
authMethod (PASSWORD|MAGIC_CODE), dnsMode (cloudflare_auto|manual),
branding (Json?), encryptedCloudflareClientId?, encryptedCloudflareClientSecret?,
cloudflareOAuthEnabled, cloudflareConnectedAt?, cloudflareLastValidatedAt?,
createdAt, updatedAt
```
Cloudflare token lives in `/run/secrets/cf_api_token`, never in DB.
