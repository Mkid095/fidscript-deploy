# Integration Hub

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](./START_HERE.md), [`AUDIT`](./AUDIT.md), and [`AGENT_STATUS`](../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Centralized provider management for all external service integrations.

---

## Overview

The Integration Hub provides a unified interface for configuring, managing, and switching between external service providers. Rather than hardcoding provider logic throughout the platform, all integrations flow through this centralized system.

### Design Principles

1. **Adapter Pattern** - All providers implement a common interface
2. **Failover Support** - Automatic fallback when a provider fails
3. **Unified Configuration** - Single source of truth for provider credentials
4. **Health Monitoring** - Continuous provider availability checks
5. **Transparent Switching** - Change providers without code changes

---

## Provider Categories

### Storage Providers

| Provider | Type | Status |
|----------|------|--------|
| MinIO | internal | default |
| Cloudinary | external | available |
| Telegram | external | available |
| S3-Compatible | external | configurable |

### Email Providers

| Provider | Type | Status |
|----------|------|--------|
| Stalwart | internal | default |
| Resend | external | available |
| SMTP | external | configurable |

### Git Providers

| Provider | Type | Status |
|----------|------|--------|
| GitHub | external | available |
| GitLab | external | available |
| Bitbucket | external | available |

### AI Providers

| Provider | Type | Status |
|----------|------|--------|
| Gemini | external | available |
| OpenAI | external | available |
| Anthropic | external | available |

---

## Architecture

### Integration Config Schema

```typescript
interface IntegrationConfig {
  id: string;
  category: 'storage' | 'email' | 'git' | 'ai';
  provider: string;
  name: string;
  isDefault: boolean;
  isHealthy: boolean;
  config: Record<string, string>;  // Encrypted values
  healthCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Adapter Interface

```typescript
interface StorageAdapter {
  readonly name: string;
  readonly displayName: string;

  upload(key: string, body: Buffer, options?: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  getPublicUrl(key: string): string;

  listBuckets(): Promise<Bucket[]>;
  createBucket(bucket: string): Promise<void>;
  deleteBucket(bucket: string): Promise<void>;

  healthCheck(): Promise<HealthResult>;
}
```

---

## Storage Provider Adapters

### MinIO Adapter

**Configuration:**
```json
{
  "endpoint": "localhost:9000",
  "accessKey": "minioadmin",
  "secretKey": "minioadmin",
  "bucket": "fidscript",
  "region": "us-east-1"
}
```

**Implementation Notes:**
- Default storage for self-hosted installations
- S3-compatible API
- No external dependencies

### Cloudinary Adapter

**Configuration:**
```json
{
  "cloudName": "your-cloud-name",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret",
  "folder": "fidscript"
}
```

**Features:**
- Image optimization on upload
- Automatic format conversion
- CDN delivery
- Transformation presets

**Implementation:**
```typescript
class CloudinaryAdapter implements StorageAdapter {
  readonly name = 'cloudinary';
  readonly displayName = 'Cloudinary';

  async upload(key: string, body: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const result = await cloudinary.uploader.upload(body, {
      public_id: key,
      folder: this.config.folder,
      resource_type: options?.mimeType?.startsWith('image/') ? 'image' : 'raw'
    });

    return {
      key,
      url: result.secure_url,
      etag: result.etag,
      sizeBytes: result.bytes
    };
  }

  // ... other methods
}
```

### Telegram Adapter

**Configuration:**
```json
{
  "botToken": "123456:ABC-DEF...",
  "chatId": "-1001234567890"
}
```

**Features:**
- Unlimited storage via Telegram channels
- Direct file access via bot API
- No bandwidth costs

**Implementation Notes:**
- Files stored as Telegram message documents
- Channel ID used as bucket identifier
- Requires bot to be member of channel

---

## Email Provider Adapters

### Stalwart Adapter

**Configuration:**
```json
{
  "host": "localhost",
  "port": 587,
  "username": "noreply@fidscript.dev",
  "password": "smtp-password",
  "fromAddress": "no-reply@fidscript.dev"
}
```

**Features:**
- Default email for self-hosted
- DKIM/SPF/DMARC support built-in
- Webmail interface
- SMTP and IMAP

### Resend Adapter

**Configuration:**
```json
{
  "apiKey": "re_123456789",
  "fromAddress": "no-reply@yourdomain.com",
  "fromName": "FIDScript"
}
```

**Features:**
- High deliverability
- Analytics and tracking
- Template support
- React Email integration

**Implementation:**
```typescript
class ResendAdapter implements EmailAdapter {
  readonly name = 'resend';
  readonly displayName = 'Resend';

  async send(email: EmailMessage): Promise<SendResult> {
    const result = await resend.emails.send({
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.body
    });

    return {
      messageId: result.data?.id,
      provider: 'resend'
    };
  }

  // ... other methods
}
```

### SMTP Adapter

**Configuration:**
```json
{
  "host": "smtp.example.com",
  "port": 587,
  "secure": true,
  "username": "user@example.com",
  "password": "password",
  "fromAddress": "no-reply@example.com"
}
```

**Features:**
- Works with any SMTP server
- Standard protocol support
- TLS/SSL support

---

## Git Provider Adapters

### GitHub Adapter

**Configuration:**
```json
{
  "personalAccessToken": "ghp_xxxxx"
}
```

**Features:**
- Repository listing
- Branch management
- Commit access
- Webhook configuration
- Actions integration

**Implementation:**
```typescript
class GitHubAdapter implements GitAdapter {
  readonly name = 'github';
  readonly displayName = 'GitHub';

  async listRepos(): Promise<Repo[]> {
    const { data } = await this.client.repos.listForAuthenticatedUser();
    return data.map(r => ({
      id: r.id.toString(),
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      defaultBranch: r.default_branch
    }));
  }

  async getCommits(owner: string, repo: string, branch: string): Promise<Commit[]> {
    const { data } = await this.client.repos.listCommits({
      owner, repo, sha: branch
    });
    return data.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name,
      timestamp: c.commit.author?.date
    }));
  }

  async downloadArchive(owner: string, repo: string, ref: string): Promise<Buffer> {
    const { data } = await this.client.repos.downloadTarballArchive({
      owner, repo, ref
    });
    return Buffer.from(data as any);
  }

  async setupWebhook(owner: string, repo: string, webhook: Webhook): Promise<void> {
    await this.client.repos.createWebhook({
      owner, repo,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      contentType: 'json'
    });
  }
}
```

### GitLab Adapter

**Configuration:**
```json
{
  "personalAccessToken": "glpat-xxxxx",
  "baseUrl": "https://gitlab.com"  // Optional for self-hosted
}
```

### Bitbucket Adapter

**Configuration:**
```json
{
  "workspaceId": "workspace-id",
  "appPassword": "xxxx"
}
```

---

## AI Provider Adapters

### Gemini Adapter

**Configuration:**
```json
{
  "apiKey": "AIza..."
}
```

**Features:**
- Text generation
- Code generation
- Error diagnosis
- Project scaffolding

### OpenAI Adapter

**Configuration:**
```json
{
  "apiKey": "sk-xxxxx"
}
```

### Anthropic Adapter

**Configuration:**
```json
{
  "apiKey": "sk-ant-xxxxx"
}
```

---

## Provider Health Monitoring

### Health Check Protocol

Each adapter implements:
```typescript
async healthCheck(): Promise<HealthResult> {
  return {
    provider: this.name,
    status: 'healthy' | 'degraded' | 'down',
    latencyMs: 0,
    checkedAt: new Date().toISOString(),
    error: null
  };
}
```

### Health Check Schedule

| Provider Type | Frequency |
|---------------|-----------|
| Storage | Every 5 minutes |
| Email | Every 5 minutes |
| Git | Every 15 minutes |
| AI | Every 15 minutes |

### Failover Behavior

```typescript
class IntegrationHub {
  async getStorageAdapter(projectId: string): Promise<StorageAdapter> {
    const primary = await this.getDefaultProvider('storage');

    const health = await primary.healthCheck();
    if (health.status === 'healthy') {
      return primary;
    }

    // Try fallback providers
    const fallbacks = await this.getFallbackProviders('storage');
    for (const fallback of fallbacks) {
      const fallbackHealth = await fallback.healthCheck();
      if (fallbackHealth.status === 'healthy') {
        return fallback;
      }
    }

    // Last resort: return primary even if unhealthy
    return primary;
  }
}
```

---

## Dashboard Interface

### Integration Settings Page

**Sections:**
1. Provider overview cards
2. Active provider configuration
3. Add new provider
4. Set default provider
5. Health status indicators
6. Test connection button

### Provider Configuration Form

**Fields:**
- Provider type (dropdown)
- Provider name (text)
- Credentials (secure inputs)
- Additional config (varies by provider)
- Set as default (checkbox)

**Validation:**
- Test connection before saving
- Show required fields
- Display provider-specific requirements

---

## SDK Integration

### Storage Usage

```typescript
import { createClient } from '@fidscript/sdk';

const client = createClient({ apiKey: '...' });

// Storage automatically uses project's configured provider
const upload = await client.storage.upload({
  bucket: 'assets',
  key: 'images/logo.png',
  body: fs.createReadStream('./logo.png')
});
```

### Email Usage

```typescript
// Automatically uses project's configured email provider
await client.email.send({
  to: ['user@example.com'],
  subject: 'Welcome',
  body: 'Hello!'
});
```

---

## Migration Between Providers

### Data Transfer

Storage providers support migration:
```typescript
await integrationHub.migrateStorage({
  from: 'minio',
  to: 'cloudinary',
  bucket: 'assets'
});
```

### Email Provider Switch

Email history preserved in platform logs. New emails use new provider immediately upon switch.

---

## Configuration API

### Endpoints

```
GET    /api/v1/integrations                    # List all integrations
GET    /api/v1/integrations/:category          # List by category
POST   /api/v1/integrations                    # Create integration
GET    /api/v1/integrations/:id                # Get integration
PATCH  /api/v1/integrations/:id                # Update integration
DELETE /api/v1/integrations/:id                # Delete integration
POST   /api/v1/integrations/:id/test           # Test connection
POST   /api/v1/integrations/:id/set-default    # Set as default
GET    /api/v1/integrations/health             # Check all health
```

---

## Security Considerations

1. **Encrypted at Rest** - All credentials encrypted with AES-256-GCM
2. **No Plaintext Logs** - Credentials never logged
3. **Scoped Tokens** - Use minimum required permissions
4. **Rotation Support** - APIs to rotate credentials
5. **Access Audit** - All provider config changes logged
