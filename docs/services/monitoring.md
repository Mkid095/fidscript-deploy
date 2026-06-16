# Monitoring Service

Infrastructure and application metrics collection and visualization.

---

## Purpose

Provides observability through metrics, health checks, and alerting for the platform and deployed applications.

---

## Responsibilities

- Metrics collection (CPU, RAM, disk, network)
- Project-level application metrics
- Health check endpoints
- Alert rule configuration
- Prometheus integration
- Grafana dashboards

---

## Dependencies

- Prometheus (metrics collection)
- Grafana (visualization)
- NATS (event aggregation)

---

## Events Consumed

| Event | Description |
|-------|-------------|
| All events | Aggregated for analytics |

---

## API Endpoints

```
GET /api/v1/projects/:projectId/monitoring/metrics
  Headers: Authorization: Bearer <token>
  Query: ?metrics=cpu,memory&from=&to=
  Response: { metrics: [...] }
  Errors: 401, 404

GET /api/v1/projects/:projectId/monitoring/health
  Headers: Authorization: Bearer <token>
  Response: { status: string, checks: [...] }
  Errors: 401, 404

GET /api/v1/monitoring/platform/metrics
  Headers: Authorization: Bearer <token>
  Response: { metrics: [...] }
  Errors: 401
```

---

## SDK Methods

```typescript
interface MetricDataPoint {
  timestamp: string;
  value: number;
}

interface Metric {
  name: string;
  labels: Record<string, string>;
  points: MetricDataPoint[];
}

platform.monitoring.getMetrics(projectId: string, options?: {
  metrics?: string[];
  from?: string;
  to?: string;
}): Promise<Metric[]>

platform.monitoring.getHealth(projectId: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: string;
    message?: string;
  }>;
}>
```

---

## MCP Tools

```json
{
  "name": "get_metrics",
  "description": "Get project metrics",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "metrics": { "type": "array", "items": { "type": "string" } },
      "from": { "type": "string" },
      "to": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "list_alerts",
  "description": "List configured alerts",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/monitoring` - Metrics overview
- `/projects/:id/monitoring/health` - Health status
- `/platform/monitoring` - Platform-wide metrics
