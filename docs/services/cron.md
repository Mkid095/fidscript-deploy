# Cron Service

Scheduled job management and execution.

---

## Purpose

Provides cron job scheduling with execution tracking, retry logic, and timezone support.

---

## Responsibilities

- Cron expression parsing and validation
- Scheduled execution
- Manual job triggering
- Execution history
- Retry logic on failure
- Timezone configuration

---

## Dependencies

- NATS (scheduling engine)
- PostgreSQL (cron schema)

---

## Database Tables

### cron.jobs

```sql
CREATE TABLE cron.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cron_expression VARCHAR(100) NOT NULL,
  endpoint VARCHAR(1024) NOT NULL,
  method VARCHAR(10) DEFAULT 'POST',
  headers JSONB DEFAULT '{}',
  body TEXT,
  timezone VARCHAR(100) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### cron.executions

```sql
CREATE TABLE cron.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES cron.jobs(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  duration_ms INTEGER,
  response_code INTEGER,
  response_body TEXT,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
```

---

## Execution Statuses

| Status | Description |
|--------|-------------|
| running | Currently executing |
| success | Completed successfully |
| failed | Execution failed |

---

## Events Produced

| Event | Trigger |
|-------|---------|
| cron.job_created | Job registered |
| cron.job_updated | Job settings changed |
| cron.job_deleted | Job removed |
| cron.job_run_started | Execution started |
| cron.job_run_completed | Execution finished |
| cron.job_run_failed | Execution failed |

---

## API Endpoints

```
GET /api/v1/projects/:projectId/cron
  Headers: Authorization: Bearer <token>
  Response: { jobs: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/cron
  Headers: Authorization: Bearer <token>
  Body: {
    name: string,
    cronExpression: string,
    endpoint: string,
    method?: string,
    headers?: object,
    body?: string,
    timezone?: string
  }
  Response: { job }
  Errors: 401, 404, 400 (invalid cron)

GET /api/v1/projects/:projectId/cron/:id
  Headers: Authorization: Bearer <token>
  Response: { job }
  Errors: 401, 404

PATCH /api/v1/projects/:projectId/cron/:id
  Headers: Authorization: Bearer <token>
  Body: {
    name?: string,
    cronExpression?: string,
    endpoint?: string,
    isActive?: boolean
  }
  Response: { job }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/cron/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:projectId/cron/:id/run
  Headers: Authorization: Bearer <token>
  Response: { execution }
  Errors: 401, 404

GET /api/v1/projects/:projectId/cron/:id/executions
  Headers: Authorization: Bearer <token>
  Query: ?page=1&limit=50
  Response: { executions: [...] }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface CronJob {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  cronExpression: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body: string | null;
  timezone: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface CronExecution {
  id: string;
  jobId: string;
  status: 'running' | 'success' | 'failed';
  durationMs: number | null;
  responseCode: number | null;
  responseBody: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

platform.cron.list(projectId: string): Promise<CronJob[]>

platform.cron.create(projectId: string, data: {
  name: string;
  cronExpression: string;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timezone?: string;
}): Promise<CronJob>

platform.cron.get(projectId: string, jobId: string): Promise<CronJob>

platform.cron.update(projectId: string, jobId: string, data: {
  name?: string;
  cronExpression?: string;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timezone?: string;
  isActive?: boolean;
}): Promise<CronJob>

platform.cron.delete(projectId: string, jobId: string): Promise<void>

platform.cron.run(projectId: string, jobId: string): Promise<CronExecution>

platform.cron.getExecutions(projectId: string, jobId: string, options?: {
  page?: number;
  limit?: number;
}): Promise<{ executions: CronExecution[], pagination }>
```

---

## MCP Tools

```json
{
  "name": "create_cron_job",
  "description": "Create a cron job",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "cronExpression": { "type": "string" },
      "endpoint": { "type": "string" },
      "method": { "type": "string" },
      "timezone": { "type": "string" }
    },
    "required": ["projectId", "name", "cronExpression", "endpoint"]
  }
}

{
  "name": "update_cron_job",
  "description": "Update a cron job",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "jobId": { "type": "string" },
      "name": { "type": "string" },
      "cronExpression": { "type": "string" },
      "isActive": { "type": "boolean" }
    },
    "required": ["projectId", "jobId"]
  }
}

{
  "name": "delete_cron_job",
  "description": "Delete a cron job",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "jobId": { "type": "string" }
    },
    "required": ["projectId", "jobId"]
  }
}

{
  "name": "run_cron_job",
  "description": "Trigger a cron job immediately",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "jobId": { "type": "string" }
    },
    "required": ["projectId", "jobId"]
  }
}

{
  "name": "list_cron_executions",
  "description": "Get cron job execution history",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "jobId": { "type": "string" },
      "limit": { "type": "number" }
    },
    "required": ["projectId", "jobId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/cron` - Cron job list
- `/projects/:id/cron/new` - Create cron job
- `/projects/:id/cron/:id` - Job detail
- `/projects/:id/cron/:id/history` - Execution history
