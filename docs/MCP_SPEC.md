# MCP Specification

> **Status: Implemented.** `@fidscript-deploy/mcp-server@1.0.6` is published to npm and runs on Node 20.

Model Context Protocol tools for AI agent integration. Exposes the full FIDScript platform surface as MCP tools so AI agents (Claude Desktop, Cursor, etc.) can manage projects, deployments, email, databases, and more through natural language.

---

## Installation

```bash
npm install -g @fidscript-deploy/mcp-server
```

Requires `FIDSCRIPT_API_KEY` and `FIDSCRIPT_API_URL` environment variables.

---

## Server Configuration (Claude Desktop)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_KEY": "fpk_xxx",
        "FIDSCRIPT_API_URL": "https://deploy.fidscript.com/api/v1"
      }
    }
  }
}
```

Generate an API key at [deploy.fidscript.com/mcp](https://deploy.fidscript.com/mcp).

---

## CLI

The FIDScript CLI is a separate package:

```bash
npm install -g @fidscript/cli
fidscript login
fidscript init --project-id <id>
```

Full command reference: `fidscript --help`

---

## Tool Categories

### Projects (`project_*`)

| Tool | Description |
|------|-------------|
| `project_list` | List all projects |
| `project_create` | Create a new project |

### Deployments (`deployments_*`)

| Tool | Description |
|------|-------------|
| `deployments_create` | Trigger a new deployment |
| `deployments_list` | List project deployments |
| `deployments_get` | Get deployment details |
| `deployments_getLogs` | Stream deployment logs |
| `deployments_stop` | Stop a running deployment |
| `deployments_restart` | Restart a deployment |
| `deployments_rollback` | Rollback to a previous deployment |
| `deployments_destroy` | Destroy a deployment |

### Functions (`functions_*`)

| Tool | Description |
|------|-------------|
| `functions_create` | Create a serverless function |
| `functions_list` | List project functions |
| `functions_get` | Get function details |
| `functions_deploy` | Deploy function code |
| `functions_update` | Update function config |
| `functions_delete` | Delete a function |
| `functions_invoke` | Invoke a function |

### Databases (`databases_*`)

| Tool | Description |
|------|-------------|
| `databases_list` | List project databases |
| `databases_get` | Get database details |
| `databases_create` | Create a database |
| `databases_delete` | Delete a database |
| `databases_backup` | Create a manual backup |
| `databases_listBackups` | List available backups |
| `databases_restore` | Restore from a backup |

### Storage (`storage_*`)

| Tool | Description |
|------|-------------|
| `storage_listBuckets` | List storage buckets |
| `storage_createBucket` | Create a bucket |
| `storage_deleteBucket` | Delete a bucket |
| `storage_listFiles` | List files in a bucket |
| `storage_uploadFile` | Upload a file |
| `storage_deleteFile` | Delete a file |
| `storage_getSignedUrl` | Generate a signed URL |

### Queues (`queues_*`)

| Tool | Description |
|------|-------------|
| `queues_list` | List project queues |
| `queues_get` | Get queue details |
| `queues_create` | Create a queue |
| `queues_delete` | Delete a queue |
| `queues_publish` | Publish a message |
| `queues_getMessages` | Consume messages |

### Scheduler (`cron_*`)

| Tool | Description |
|------|-------------|
| `cron_list` | List cron jobs |
| `cron_get` | Get cron job details |
| `cron_create` | Create a cron job |
| `cron_update` | Update a cron job |
| `cron_delete` | Delete a cron job |
| `cron_trigger` | Trigger a job immediately |
| `cron_getNextRun` | Get next run time |

### Email (`email_*`)

| Tool | Description |
|------|-------------|
| `email_status` | Get email domain verification status |
| `email_domains` | List email domains |
| `email_send` | Send an email |
| `email_send_template` | Send a templated email |
| `email_templates` | List email templates |
| `email_inbox` | List inbox messages |
| `email_analytics` | Get email analytics |
| `email_suppressions` | List suppressions |

### Domains (`domain_*`)

| Tool | Description |
|------|-------------|
| `domain_list` | List project domains |
| `domain_add` | Add a custom domain |
| `domain_verify` | Verify domain DNS |

### Realtime (`realtime_*`)

| Tool | Description |
|------|-------------|
| `realtime_listChannels` | List channels |
| `realtime_createChannel` | Create a channel |
| `realtime_deleteChannel` | Delete a channel |
| `realtime_setPresence` | Set presence |

### Monitoring (`monitoring_*`)

| Tool | Description |
|------|-------------|
| `monitoring_getActiveAlerts` | Get active alerts |
| `monitoring_listAlertRules` | List alert rules |
| `monitoring_getAlertRule` | Get alert rule details |
| `monitoring_createAlertRule` | Create an alert rule |
| `monitoring_updateAlertRule` | Update an alert rule |
| `monitoring_deleteAlertRule` | Delete an alert rule |
| `monitoring_acknowledgeAlert` | Acknowledge an alert |
| `monitoring_resolveAlert` | Resolve an alert |
| `monitoring_getMetricSeries` | Get metric series |
| `monitoring_getMetrics` | Get metrics data |
| `monitoring_getMetricsStats` | Get metric statistics |
| `monitoring_listDashboards` | List dashboards |
| `monitoring_createDashboard` | Create a dashboard |
| `monitoring_getUptime` | Get uptime info |
| `monitoring_listNotificationChannels` | List notification channels |
| `monitoring_createNotificationChannel` | Create a channel |
| `monitoring_getNotificationChannel` | Get channel details |
| `monitoring_updateNotificationChannel` | Update a channel |
| `monitoring_deleteNotificationChannel` | Delete a channel |
| `monitoring_testNotificationChannel` | Test a channel |
| `monitoring_listIntegrationConfigs` | List integrations |
| `monitoring_updateIntegrationConfig` | Update an integration |
| `monitoring_getIncident` | Get incident details |
| `monitoring_recordMetric` | Record a custom metric |

### Logging (`logging_*`)

| Tool | Description |
|------|-------------|
| `logging_listLogStreams` | List log streams |
| `logging_getLogStream` | Get stream details |
| `logging_createLogStream` | Create a log stream |
| `logging_deleteLogStream` | Delete a log stream |
| `logging_getLogEvents` | Get log events |
| `logging_queryLogs` | Query logs |
| `logging_tailLogs` | Tail logs in realtime |
| `logging_getLogStats` | Get log statistics |
| `logging_getLogTimeline` | Get log timeline |
| `logging_ingestLogs` | Ingest logs |
| `logging_createLogIngester` | Create an ingester |
| `logging_updateLogIngester` | Update an ingester |
| `logging_deleteLogIngester` | Delete an ingester |

### AI (`ai_*`)

| Tool | Description |
|------|-------------|
| `ai_assistDeployment` | AI assist with deployment |
| `ai_diagnoseIssue` | Diagnose an issue |
| `ai_explainError` | Explain an error |
| `ai_generateTemplate` | Generate a template |
| `ai_listConversations` | List AI conversations |
| `ai_getConversation` | Get conversation details |
| `ai_createConversation` | Create a conversation |
| `ai_sendChatMessage` | Send a chat message |
| `ai_recommendSolution` | Get solution recommendations |
| `ai_suggestFix` | Suggest a code fix |

### Marketplace (`marketplace_*`)

| Tool | Description |
|------|-------------|
| `marketplace_browse` | Browse templates |
| `marketplace_search` | Search templates |
| `marketplace_getTemplateDetails` | Get template details |
| `marketplace_getFeatured` | Get featured templates |
| `marketplace_listCategories` | List categories |
| `marketplace_listMySubmissions` | List user's submissions |
| `marketplace_getSubmissionStatus` | Get submission status |
| `marketplace_submitItem` | Submit a template |
| `marketplace_updateSubmission` | Update a submission |
| `marketplace_submitReview` | Submit a review |
| `marketplace_approveSubmission` | Approve a submission (admin) |
| `marketplace_rejectSubmission` | Reject a submission (admin) |
| `marketplace_featureTemplate` | Feature a template (admin) |

### Auth (`auth_*`)

| Tool | Description |
|------|-------------|
| `auth_verify_email` | Verify email address |
| `auth_send_verification` | Send verification email |
| `auth_reset_password` | Reset password |
| `auth_list_sessions` | List active sessions |
| `auth_revoke_session` | Revoke a session |
| `auth_revoke_all_sessions` | Revoke all sessions |
| `auth_list_organizations` | List organizations |
| `auth_create_organization` | Create an organization |
| `auth_get_organization` | Get organization details |
| `auth_list_org_members` | List org members |
| `auth_list_org_teams` | List org teams |
| `auth_create_team` | Create a team |
| `auth_invite_user` | Invite a user |
| `auth_accept_invitation` | Accept an invitation |

### Environment Variables (`env_var_*`)

| Tool | Description |
|------|-------------|
| `env_var_list` | List environment variables |
| `env_var_set` | Set an environment variable |
| `env_var_delete` | Delete an environment variable |

---

## Error Handling

Tools return errors in standard format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Something went wrong"
    }
  ],
  "isError": true
}
```

---

## Permissions

Tools require appropriate project-scoped API keys with the relevant scopes. Generate keys at `/mcp` in the dashboard. Scopes map to the tool category (e.g. `email.send` for `email_send`, `deployments.write` for `deployments_create`).
