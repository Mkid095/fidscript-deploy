import type { Project } from '@/types';

export function buildFullSetupGuide(
  project: Project,
  apiKey: { id: string; key: string },
  apiBase: string,
): string {
  return `# FIDScript Deploy — AI Agent Setup Guide

## Your Project Context
- **Platform**: ${apiBase}
- **Project ID**: ${project.id}
- **Project Name**: ${project.name}
- **Project Slug**: ${project.slug || 'N/A'}

---

## Step 1 — Install the FIDScript CLI
\`\`\`bash
npm install -g @fidscript-deploy/cli
\`\`\`

## Step 2 — Authenticate
\`\`\`bash
fidscript login ${apiKey.key}
\`\`\`

## Step 3 — Verify Auth
\`\`\`bash
fidscript whoami -p ${project.id}
\`\`\`

---

## Step 4 — Install the MCP Server (for AI agents)

If using **Claude Desktop**, add to \`~/.claude/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_KEY": "${apiKey.key}",
        "FIDSCRIPT_API_URL": "${apiBase}"
      }
    }
  }
}
\`\`\`

For **Cursor**: Settings → AI → MCP Servers → Add (same JSON).
For **Windsurf** or other MCP clients: use the same JSON config.
Restart your AI client after adding the config.

---

## Step 5 — Install the SDK (for programmatic access)
\`\`\`bash
npm install @fidscript-deploy/sdk
\`\`\`

\`\`\`typescript
import { FidscriptClient } from '@fidscript-deploy/sdk';

const sdk = new FidscriptClient({
  apiKey: '${apiKey.key}',
  baseURL: '${apiBase}',
});

const projects = await sdk.projects.list();
const deployments = await sdk.deployments.list('${project.id}');
\`\`\`

---

## Working with Projects

Most CLI commands accept \`-p <project-id>\` to scope to a project:

\`\`\`bash
# List all projects
fidscript projects list

# Get your current project
fidscript whoami -p ${project.id}

# Target a specific project for all commands
fidscript deployments list -p ${project.id}
fidscript databases list -p ${project.id}
fidscript cron list -p ${project.id}
\`\`\`

---

## Available Tools

### Projects
| Tool | Description |
|------|-------------|
| \`project_list\` | List all your projects |
| \`project_create\` | Create a new project |
| \`project_get\` | Get project details |

### Deployments
| Tool | Description |
|------|-------------|
| \`deployments_list\` | List deployments for a project |
| \`deployments_get\` | Get deployment status and logs |
| \`deployments_getLogs\` | Stream live build/runtime logs |
| \`deployments_create\` | Trigger a deployment from a Git branch |
| \`deployments_stop\` | Stop a running deployment |
| \`deployments_restart\` | Restart a deployment |
| \`deployments_rollback\` | Rollback to a previous deployment |
| \`deployments_destroy\` | Permanently destroy a deployment |

### Functions
| Tool | Description |
|------|-------------|
| \`functions_list\` | List all functions in a project |
| \`functions_get\` | Get function details and invocations |
| \`functions_create\` | Create a new function |
| \`functions_deploy\` | Deploy code to a function |
| \`functions_delete\` | Delete a function |
| \`functions_invoke\` | Invoke a function synchronously |

### Databases
| Tool | Description |
|------|-------------|
| \`databases_list\` | List all databases |
| \`databases_get\` | Get database connection details |
| \`databases_create\` | Create a new database |
| \`databases_delete\` | Delete a database permanently |
| \`databases_backup\` | Trigger a manual backup |
| \`databases_listBackups\` | List available backups |
| \`databases_restore\` | Restore from a backup |

### Storage
| Tool | Description |
|------|-------------|
| \`storage_listBuckets\` | List all storage buckets |
| \`storage_createBucket\` | Create a storage bucket |
| \`storage_deleteBucket\` | Delete a bucket and all contents |
| \`storage_listFiles\` | List files in a bucket |
| \`storage_uploadFile\` | Upload a file to a bucket |
| \`storage_deleteFile\` | Delete a file from a bucket |
| \`storage_getSignedUrl\` | Generate a time-limited signed URL |

### Queues
| Tool | Description |
|------|-------------|
| \`queues_list\` | List all queues |
| \`queues_get\` | Get queue stats and configuration |
| \`queues_create\` | Create a new queue |
| \`queues_delete\` | Delete a queue and all messages |
| \`queues_publish\` | Publish a message to a queue |
| \`queues_getMessages\` | Consume messages (auto-acks on success) |

### Scheduler (Cron)
| Tool | Description |
|------|-------------|
| \`cron_list\` | List all cron jobs |
| \`cron_get\` | Get a cron job with schedule and recent runs |
| \`cron_create\` | Create a cron job |
| \`cron_update\` | Update schedule or endpoint |
| \`cron_delete\` | Delete a cron job |
| \`cron_trigger\` | Fire a cron job immediately |
| \`cron_getNextRun\` | Preview next N scheduled executions |

### Email
| Tool | Description |
|------|-------------|
| \`email_status\` | Get email domain verification status |
| \`email_domains\` | List connected email domains |
| \`email_send\` | Send a transactional email |
| \`email_send_template\` | Send using a saved template |
| \`email_templates\` | List saved email templates |
| \`email_inbox\` | List messages in an inbox |
| \`email_analytics\` | Get delivery statistics |

### Domains
| Tool | Description |
|------|-------------|
| \`domain_list\` | List all domains |
| \`domain_add\` | Add a custom domain |
| \`domain_verify\` | Verify domain DNS configuration |

### Realtime
| Tool | Description |
|------|-------------|
| \`realtime_listChannels\` | List all active channels |
| \`realtime_createChannel\` | Create a named channel |
| \`realtime_deleteChannel\` | Delete a channel and subscribers |
| \`realtime_setPresence\` | Broadcast a presence update |

### Monitoring
| Tool | Description |
|------|-------------|
| \`monitoring_getActiveAlerts\` | List currently firing alerts |
| \`monitoring_listAlertRules\` | List all alert rules |
| \`monitoring_createAlertRule\` | Create an alert rule |
| \`monitoring_acknowledgeAlert\` | Acknowledge an active alert |
| \`monitoring_resolveAlert\` | Manually resolve an alert |
| \`monitoring_getMetrics\` | Query metric time series data |
| \`monitoring_getUptime\` | Get uptime percentage |

### Logging
| Tool | Description |
|------|-------------|
| \`logging_listLogStreams\` | List all log streams |
| \`logging_queryLogs\` | Query logs with a filter |
| \`logging_tailLogs\` | Stream new log entries |
| \`logging_getLogEvents\` | Fetch log events for a stream |
| \`logging_ingestLogs\` | Ingest raw log lines via HTTP |

### AI
| Tool | Description |
|------|-------------|
| \`ai_assistDeployment\` | Get AI assistance while deploying |
| \`ai_diagnoseIssue\` | Get root cause analysis for an error |
| \`ai_explainError\` | Plain-English explanation of a runtime error |
| \`ai_generateTemplate\` | Generate project scaffolding |
| \`ai_listConversations\` | List AI diagnostic conversations |
| \`ai_sendChatMessage\` | Send a message in an AI conversation |

### Marketplace
| Tool | Description |
|------|-------------|
| \`marketplace_browse\` | Browse available templates |
| \`marketplace_search\` | Search templates by keyword |
| \`marketplace_getTemplateDetails\` | Get template README and stack |
| \`marketplace_submitItem\` | Submit a project as a template |

### Auth & Sessions
| Tool | Description |
|------|-------------|
| \`auth_list_sessions\` | List all active sessions |
| \`auth_revoke_session\` | Revoke a specific session |
| \`auth_list_organizations\` | List organizations you belong to |
| \`auth_create_organization\` | Create a new organization |
| \`auth_invite_user\` | Invite a user to an organization |

### Environment Variables
| Tool | Description |
|------|-------------|
| \`env_var_list\` | List all environment variables |
| \`env_var_set\` | Set or update an environment variable |
| \`env_var_delete\` | Delete an environment variable |

---

## Example: Full Deployment Flow
\`\`\`bash
fidscript projects list
fidscript deployments list -p ${project.id}
fidscript deployments create -p ${project.id} --branch main
fidscript deployments logs <deployment-id> -p ${project.id}
\`\`\`

---

**Your API key is scoped to project "${project.name}" (${project.id}).**
All operations target this project automatically. To switch projects, pass \`-p <project-id>\` to any command.
`;
}
