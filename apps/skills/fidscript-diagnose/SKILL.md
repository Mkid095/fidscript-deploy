---
name: fidscript-diagnose
description: Inspect logs, metrics, alerts, and queue depth to debug issues on FIDScript. Use after encountering errors or unexpected behavior.
allowed-tools:
  - list_deployments
  - get_deployment
  - get_function_logs
  - list_cron_jobs
  - get_cron_job_runs
  - get_queue_stats
  - list_databases
  - get_database
version: "1.0.0"
platform-version: ">=1.0.0"
---

# FIDScript Diagnose Skill

Use this skill to diagnose issues with FIDScript-hosted services.

## Diagnostic Checklist

Run through these steps in order:

### 1 — Check deployment health

```
Use list_deployments with:
  projectId: <projectId>

Use get_deployment with:
  projectId: <projectId>
  deploymentId: <deploymentId>
```

Look for: `status` field (SUCCESS/FAILED/BUILDING). A FAILED status means the build or startup failed.

### 2 — Check build logs

For BUILDING or FAILED deployments:

```
Use get_deployment with:
  projectId: <projectId>
  deploymentId: <deploymentId>
```

Response includes `buildLogUrl` or `buildLogs`. Review the last 50 lines for the first error.

### 3 — Check function logs

```
Use get_function_logs with:
  projectId: <projectId>
  functionId: <functionId>
  limit: 50
```

Look for: ERROR level entries, unhandled exceptions, function timeout messages.

### 4 — Check cron job failures

```
Use list_cron_jobs with:
  projectId: <projectId>

For each failed-looking job:
Use get_cron_job_runs with:
  projectId: <projectId>
  jobId: <jobId>
  limit: 10
```

Look for: last run status (SUCCESS/FAILED), response codes, error messages.

### 5 — Check queue depth

```
Use get_queue_stats with:
  projectId: <projectId>
  queueId: <queueId>
```

Look for: `depth` (messages waiting), `dlqDepth` (dead-letter queue size). High depth means consumers are not keeping up.

### 6 — Check database connectivity

```
Use list_databases with:
  projectId: <projectId>

Use get_database with:
  projectId: <projectId>
  databaseId: <databaseId>
```

Look for: `status` (should be ACTIVE), `connections` (should be below `connectionLimit`).

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Deployment FAILED | Build error, missing env vars | Check build logs; verify DATABASE_URL set |
| Function timeout | `timeoutSeconds` too low | Update function with higher timeout |
| Queue depth growing | Consumer down or slow | Restart consumer; check function logs |
| Cron job missed | Expression wrong; disabled | Verify cron expression; check enabled: true |
| DB connection error | `DATABASE_URL` stale | Rotate credentials + update env vars |
