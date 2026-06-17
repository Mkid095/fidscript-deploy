# Logging Service

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](../START_HERE.md), [`AUDIT`](../AUDIT.md), and [`AGENT_STATUS`](../../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Centralized log aggregation and search.

---

## Purpose

Provides centralized logging for applications with full-text search, filtering, and retention policies.

---

## Responsibilities

- Log ingestion from applications
- Deployment log storage
- Function log aggregation
- Email log storage
- Full-text search
- Log filtering by project, service, severity
- Log retention policies

---

## Dependencies

- Loki (log storage)
- Vector (log shipping)

---

## Events Consumed

All platform events for log generation.

---

## API Endpoints

```
GET /api/v1/projects/:projectId/logs
  Headers: Authorization: Bearer <token>
  Query: ?service=&severity=&search=&from=&to=&limit=100
  Response: { logs: [...] }
  Errors: 401, 404

GET /api/v1/projects/:projectId/logs/services
  Headers: Authorization: Bearer <token>
  Response: { services: [...] }
  Errors: 401, 404

GET /api/v1/projects/:projectId/logs/stream
  Headers: Authorization: Bearer <token>
  Response: SSE stream of logs
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface LogEntry {
  timestamp: string;
  service: string;
  severity: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown>;
}

platform.logs.search(projectId: string, options?: {
  service?: string;
  severity?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<LogEntry[]>

platform.logs.getServices(projectId: string): Promise<string[]>

platform.logs.stream(projectId: string, options?: {
  service?: string;
  severity?: string;
}): AsyncIterable<LogEntry>
```

---

## MCP Tools

```json
{
  "name": "search_logs",
  "description": "Search application logs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "search": { "type": "string" },
      "service": { "type": "string" },
      "severity": { "type": "string" },
      "limit": { "type": "number" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "get_log_stream",
  "description": "Stream live logs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "service": { "type": "string" }
    },
    "required": ["projectId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/logs` - Log explorer
- `/projects/:id/logs/search` - Advanced search
- `/projects/:id/logs/stream` - Live log stream
