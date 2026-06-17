# Integration Hub Service

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](../START_HERE.md), [`AUDIT`](../AUDIT.md), and [`AGENT_STATUS`](../../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Centralized external provider configuration.

---

## Purpose

Provides unified management of external service providers for storage, email, git, and AI.

---

## Responsibilities

- Provider configuration management
- Provider health monitoring
- Automatic failover
- Credential management
- Provider discovery

---

## Dependencies

- PostgreSQL (platform schema)

---

## API Endpoints

```
GET /api/v1/integrations
  Headers: Authorization: Bearer <token>
  Response: { integrations: [...] }
  Errors: 401

GET /api/v1/integrations/:category
  Headers: Authorization: Bearer <token>
  Response: { integrations: [...] }
  Errors: 401

POST /api/v1/integrations
  Headers: Authorization: Bearer <token>
  Body: {
    category: string,
    provider: string,
    name: string,
    config: object
  }
  Response: { integration }
  Errors: 401, 400

GET /api/v1/integrations/:id
  Headers: Authorization: Bearer <token>
  Response: { integration }
  Errors: 401, 404

PATCH /api/v1/integrations/:id
  Headers: Authorization: Bearer <token>
  Body: { config: object }
  Response: { integration }
  Errors: 401, 404

DELETE /api/v1/integrations/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/integrations/:id/test
  Headers: Authorization: Bearer <token>
  Response: { success: boolean, error?: string }
  Errors: 401, 404

POST /api/v1/integrations/:id/set-default
  Headers: Authorization: Bearer <token>
  Response: { integration }
  Errors: 401, 404

GET /api/v1/integrations/health
  Headers: Authorization: Bearer <token>
  Response: { providers: [...] }
  Errors: 401
```

---

## SDK Methods

```typescript
interface Integration {
  id: string;
  category: 'storage' | 'email' | 'git' | 'ai';
  provider: string;
  name: string;
  isDefault: boolean;
  isHealthy: boolean;
  config: Record<string, string>;
  checkedAt: string | null;
  createdAt: string;
}

platform.integrations.list(): Promise<Integration[]>

platform.integrations.listByCategory(category: Integration['category']): Promise<Integration[]>

platform.integrations.create(data: {
  category: Integration['category'];
  provider: string;
  name: string;
  config: Record<string, string>;
}): Promise<Integration>

platform.integrations.get(integrationId: string): Promise<Integration>

platform.integrations.update(integrationId: string, config: Record<string, string>): Promise<Integration>

platform.integrations.delete(integrationId: string): Promise<void>

platform.integrations.test(integrationId: string): Promise<{ success: boolean; error?: string }>

platform.integrations.setDefault(integrationId: string): Promise<Integration>

platform.integrations.getHealth(): Promise<Array<{
  category: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
}>>
```

---

## MCP Tools

```json
{
  "name": "configure_provider",
  "description": "Configure an integration provider",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": { "type": "string" },
      "provider": { "type": "string" },
      "name": { "type": "string" },
      "config": { "type": "object" }
    },
    "required": ["category", "provider", "name", "config"]
  }
}

{
  "name": "get_provider_status",
  "description": "Check provider health status",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": { "type": "string" }
    }
  }
}

{
  "name": "list_providers",
  "description": "List configured providers",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": { "type": "string" }
    }
  }
}
```

---

## Dashboard Screens

- `/settings/integrations` - Integration overview
- `/settings/integrations/:id` - Provider detail
- `/settings/integrations/new` - Add provider
