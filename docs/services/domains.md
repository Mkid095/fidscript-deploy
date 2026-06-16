# Domain Service

Domain registration, DNS validation, and SSL certificate management.

---

## Purpose

Provides automatic domain management with DNS validation and SSL/TLS provisioning via Let's Encrypt.

---

## Responsibilities

- Automatic subdomain assignment
- Custom domain registration
- DNS A-record validation
- Automatic SSL/TLS provisioning
- Multi-region DNS propagation checking
- Domain status monitoring

---

## Dependencies

- PostgreSQL (projects schema)
- Traefik (ACME integration)

---

## Database Tables

### projects.domains

```sql
CREATE TABLE projects.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  ssl_enabled BOOLEAN DEFAULT true,
  ssl_cert_arn VARCHAR(255),
  dns_status VARCHAR(50) DEFAULT 'pending',
  dns_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Events Produced

| Event | Trigger |
|-------|---------|
| domain.added | Domain registered |
| domain.verified | DNS validation passed |
| domain.failed | DNS validation failed |
| domain.ssl_enabled | SSL certificate provisioned |
| domain.deleted | Domain removed |

---

## API Endpoints

```
GET /api/v1/projects/:projectId/domains
  Headers: Authorization: Bearer <token>
  Response: { domains: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/domains
  Headers: Authorization: Bearer <token>
  Body: { domain: string }
  Response: { domain, dnsConfig }
  Errors: 401, 404, 409

DELETE /api/v1/projects/:projectId/domains/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:projectId/domains/:id/verify
  Headers: Authorization: Bearer <token>
  Response: { domain }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface ProjectDomain {
  id: string;
  projectId: string;
  domain: string;
  isCustom: boolean;
  sslEnabled: boolean;
  dnsStatus: 'pending' | 'valid' | 'failed';
  dnsVerifiedAt: string | null;
  createdAt: string;
}

platform.domains.list(projectId: string): Promise<ProjectDomain[]>

platform.domains.add(projectId: string, domain: string): Promise<{
  domain: ProjectDomain;
  dnsConfig: { type: string; name: string; value: string };
}>

platform.domains.delete(projectId: string, domainId: string): Promise<void>

platform.domains.verify(projectId: string, domainId: string): Promise<ProjectDomain>
```

---

## MCP Tools

```json
{
  "name": "add_domain",
  "description": "Add a custom domain",
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
  "name": "verify_domain",
  "description": "Verify domain DNS configuration",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domainId": { "type": "string" }
    },
    "required": ["projectId", "domainId"]
  }
}

{
  "name": "delete_domain",
  "description": "Remove a domain",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domainId": { "type": "string" }
    },
    "required": ["projectId", "domainId"]
  }
}

{
  "name": "list_domains",
  "description": "List project domains",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "get_domain_status",
  "description": "Get domain verification status",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domainId": { "type": "string" }
    },
    "required": ["projectId", "domainId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/domains` - Domain list
- `/projects/:id/domains/new` - Add domain
- `/projects/:id/settings/domains` - Domain settings
