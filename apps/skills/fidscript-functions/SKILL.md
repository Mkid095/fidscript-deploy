---
name: fidscript-functions
description: Author, deploy, invoke, and debug serverless Node.js functions on FIDScript. Includes log retrieval and trigger wiring via cron or events.
allowed-tools:
  - list_functions
  - get_function
  - create_function
  - update_function
  - delete_function
  - deploy_function
  - invoke_function
  - get_function_logs
  - get_function_versions
  - list_cron_jobs
  - create_cron_job
  - trigger_cron_job
version: "1.0.0"
platform-version: ">=1.0.0"
---

# FIDScript Functions Skill

Use this skill to create and manage serverless Node.js functions.

## Create a Function

### Step 1 — Create

```
Use create_function with:
  projectId: <projectId>
  name: <function-name>    # lowercase, hyphens
  runtime: nodejs18
  memoryMb: 256             # optional, default 256
  timeoutSeconds: 30        # optional, default 30
```

### Step 2 — Deploy code

```
Use deploy_function with:
  projectId: <projectId>
  functionId: <from create result>
  code: |
    export async function handler(event) {
      // your function code here
      return { statusCode: 200, body: JSON.stringify({ received: event }) };
    }
  version: v1
```

## Invoke a Function

### Synchronous invoke (HTTP-like)

```
Use invoke_function with:
  projectId: <projectId>
  functionId: <functionId>
  payload:
    key: value
```

The function receives the payload as its `event.body` (parsed JSON if applicable).

### Via cron trigger

```
Use create_cron_job with:
  projectId: <projectId>
  name: <job-name>
  cronExpression: "*/5 * * * *"   # every 5 minutes
  endpoint: functions/<functionId>/invoke
  timezone: UTC
  enabled: true
```

## View Logs

```
Use get_function_logs with:
  projectId: <projectId>
  functionId: <functionId>
  limit: 50
```

## Update Function Config

```
Use update_function with:
  projectId: <projectId>
  functionId: <functionId>
  memoryMb: 512
  timeoutSeconds: 60
```

## Delete

```
Use delete_function with:
  projectId: <projectId>
  functionId: <functionId>
```

## Function Handler Signature

Functions receive a single `event` argument:

```typescript
interface FunctionEvent {
  body: string | null;       // request body
  headers: Record<string, string>;
  method: string;            // GET, POST, etc.
  path: string;              // request path
  query: Record<string, string>;
}
```

Return from your handler:

```typescript
return { statusCode: 200, body: JSON.stringify({ result: "ok" }) };
```
