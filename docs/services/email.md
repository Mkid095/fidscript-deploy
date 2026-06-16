# Email Service

Transactional email sending and domain management.

---

## Purpose

Provides reliable email delivery with support for multiple providers (Stalwart, Resend, SMTP). Handles domain verification (DKIM, SPF, DMARC) and mailbox management.

---

## Responsibilities

- Email domain verification
- DKIM, SPF, DMARC configuration
- Mailbox creation and management
- Alias handling
- Email sending via SMTP/API
- Delivery tracking
- Bounce handling
- Provider abstraction

---

## Dependencies

- PostgreSQL (email schema)
- Integration Hub (provider configuration)

---

## Database Tables

### email.domains

```sql
CREATE TABLE email.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  dkim_verified BOOLEAN DEFAULT false,
  spf_verified BOOLEAN DEFAULT false,
  dmarc_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### email.mailboxes

```sql
CREATE TABLE email.mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES email.domains(id) ON DELETE CASCADE,
  local_part VARCHAR(255) NOT NULL,
  password_encrypted BYTEA NOT NULL,
  quota_mb INTEGER DEFAULT 1024,
  is_alias BOOLEAN DEFAULT false,
  forwards_to TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### email.logs

```sql
CREATE TABLE email.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  from_address VARCHAR(500) NOT NULL,
  to_address TEXT[] NOT NULL,
  subject VARCHAR(500),
  status VARCHAR(50) DEFAULT 'sent',
  provider VARCHAR(50) DEFAULT 'internal',
  message_id VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Email Statuses

| Status | Description |
|--------|-------------|
| pending | Queued for sending |
| sent | Submitted to provider |
| delivered | Confirmed delivery |
| bounced | Delivery failed permanently |
| failed | Send error |

---

## Events Produced

| Event | Trigger |
|-------|---------|
| email.sent | Email submitted |
| email.delivered | Confirmed delivery |
| email.bounced | Permanent failure |
| email.domain_added | Domain registered |
| email.mailbox_created | Mailbox created |

---

## Events Consumed

None.

---

## API Endpoints

### Domains

```
GET /api/v1/projects/:projectId/email/domains
  Headers: Authorization: Bearer <token>
  Response: { domains: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/email/domains
  Headers: Authorization: Bearer <token>
  Body: { domain: string }
  Response: { domain, dkimRecord, spfRecord }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/email/domains/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:projectId/email/domains/:id/verify
  Headers: Authorization: Bearer <token>
  Response: { domain }
  Errors: 401, 404
```

### Mailboxes

```
GET /api/v1/projects/:projectId/email/domains/:domainId/mailboxes
  Headers: Authorization: Bearer <token>
  Response: { mailboxes: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/email/domains/:domainId/mailboxes
  Headers: Authorization: Bearer <token>
  Body: { localPart: string, password: string, quotaMb?: number }
  Response: { mailbox }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/email/mailboxes/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404
```

### Sending

```
POST /api/v1/projects/:projectId/email/send
  Headers: Authorization: Bearer <token>
  Body: {
    from: string,
    to: string[],
    subject: string,
    body: string,
    textBody?: string,
    htmlBody?: string,
    attachments?: Attachment[]
  }
  Response: { email, messageId }
  Errors: 401, 400, 404
```

### Logs

```
GET /api/v1/projects/:projectId/email/logs
  Headers: Authorization: Bearer <token>
  Query: ?status=&page=1&limit=50
  Response: { logs: [...], pagination }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface EmailDomain {
  id: string;
  projectId: string;
  domain: string;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  createdAt: string;
}

interface EmailMailbox {
  id: string;
  domainId: string;
  localPart: string;
  quotaMb: number;
  isAlias: boolean;
  forwardsTo: string[];
  createdAt: string;
}

interface EmailLog {
  id: string;
  projectId: string;
  fromAddress: string;
  toAddress: string[];
  subject: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  provider: string;
  messageId: string;
  createdAt: string;
}

platform.email.domains.list(projectId: string): Promise<EmailDomain[]>

platform.email.domains.add(projectId: string, domain: string): Promise<{
  domain: EmailDomain;
  dkimRecord: { name: string; value: string };
  spfRecord: { name: string; value: string };
}>

platform.email.domains.delete(projectId: string, domainId: string): Promise<void>

platform.email.domains.verify(projectId: string, domainId: string): Promise<EmailDomain>

platform.email.mailboxes.list(projectId: string, domainId: string): Promise<EmailMailbox[]>

platform.email.mailboxes.create(projectId: string, domainId: string, data: {
  localPart: string;
  password: string;
  quotaMb?: number;
}): Promise<EmailMailbox>

platform.email.mailboxes.delete(projectId: string, mailboxId: string): Promise<void>

platform.email.send(projectId: string, data: {
  from: string;
  to: string[];
  subject: string;
  body?: string;
  textBody?: string;
  htmlBody?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}): Promise<{ email: EmailLog; messageId: string }>

platform.email.logs.list(projectId: string, options?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: EmailLog[], pagination }>
```

---

## MCP Tools

```json
{
  "name": "add_email_domain",
  "description": "Add an email domain for sending",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domain": { "type": "string" }
    },
    "required": ["projectId", "domain"]
  }
}

{
  "name": "create_mailbox",
  "description": "Create a mailbox",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domainId": { "type": "string" },
      "localPart": { "type": "string" },
      "password": { "type": "string" }
    },
    "required": ["projectId", "domainId", "localPart", "password"]
  }
}

{
  "name": "delete_mailbox",
  "description": "Delete a mailbox",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "mailboxId": { "type": "string" }
    },
    "required": ["projectId", "mailboxId"]
  }
}

{
  "name": "send_email",
  "description": "Send an email",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "to": { "type": "array", "items": { "type": "string" } },
      "subject": { "type": "string" },
      "body": { "type": "string" },
      "from": { "type": "string" }
    },
    "required": ["projectId", "to", "subject"]
  }
}

{
  "name": "list_email_logs",
  "description": "List email delivery logs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "status": { "type": "string" }
    },
    "required": ["projectId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/email` - Email overview
- `/projects/:id/email/domains` - Domain management
- `/projects/:id/email/domains/:id` - Domain detail (DKIM, SPF)
- `/projects/:id/email/mailboxes` - Mailbox management
- `/projects/:id/email/logs` - Delivery logs
- `/projects/:id/settings/email` - Email provider configuration

---

## Security Considerations

1. **Domain verification** - Prevent email spoofing
2. **Rate limiting** - Prevent abuse
3. **DKIM signing** - Authenticated email delivery
4. **SPF validation** - Sender policy enforcement
5. **DMARC alignment** - Domain policy enforcement

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Provider outage | Automatic failover to backup provider |
| Bounce handling | Mark recipient, stop sending to invalid |
| Rate limit exceeded | Queue and retry with backoff |

---

## Future Extensions

- Email templates with variables
- A/B testing for subject lines
- Click and open tracking
- Unsubscribe management
- Email preview
