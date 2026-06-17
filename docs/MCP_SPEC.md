# MCP Specification

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](./START_HERE.md), [`AUDIT`](./AUDIT.md), and [`AGENT_STATUS`](../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Model Context Protocol tools for AI agent integration.

---

## Overview

FIDScript Deploy exposes platform capabilities through MCP tools, enabling AI agents to manage the platform through natural language.

---

## Connection

MCP server connection details:

```json
{
  "server": "https://mcp.fidscript.dev",
  "token": "fs_mcp_xxx",
  "transport": "streamable-http"
}
```

---

## Tool Categories

### Authentication Tools

#### create_user

Create a new platform user.

```json
{
  "name": "create_user",
  "description": "Create a new platform user account",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": {
        "type": "string",
        "format": "email",
        "description": "User email address"
      },
      "password": {
        "type": "string",
        "minLength": 8,
        "description": "User password (min 8 characters)"
      },
      "name": {
        "type": "string",
        "description": "User display name"
      }
    },
    "required": ["email", "password"]
  }
}
```

**Example:**
```json
{
  "email": "developer@example.com",
  "password": "securepass123",
  "name": "Developer"
}
```

---

#### verify_user

Verify user credentials.

```json
{
  "name": "verify_user",
  "description": "Authenticate user and verify credentials",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": { "type": "string" },
      "password": { "type": "string" }
    },
    "required": ["email", "password"]
  }
}
```

---

#### list_sessions

List active user sessions.

```json
{
  "name": "list_sessions",
  "description": "List all active sessions for the current user",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

---

#### revoke_session

Revoke a specific session.

```json
{
  "name": "revoke_session",
  "description": "Revoke an active session",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sessionId": { "type": "string" }
    },
    "required": ["sessionId"]
  }
}
```

---

#### create_api_key

Generate a new API key.

```json
{
  "name": "create_api_key",
  "description": "Create a new API key for programmatic access",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "permissions": {
        "type": "array",
        "items": { "type": "string" }
      },
      "expiresAt": { "type": "string" }
    },
    "required": ["name"]
  }
}
```

---

#### revoke_api_key

Revoke an API key.

```json
{
  "name": "revoke_api_key",
  "description": "Revoke an existing API key",
  "inputSchema": {
    "type": "object",
    "properties": {
      "keyId": { "type": "string" }
    },
    "required": ["keyId"]
  }
}
```

---

### Project Tools

#### create_project

Create a new project.

```json
{
  "name": "create_project",
  "description": "Create a new project for hosting applications",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "type": {
        "type": "string",
        "enum": ["frontend", "backend", "worker", "cron", "docker", "static"],
        "description": "Project type"
      },
      "description": { "type": "string" }
    },
    "required": ["name", "type"]
  }
}
```

**Example:**
```json
{
  "name": "my-web-app",
  "type": "frontend"
}
```

---

#### get_project

Get project details.

```json
{
  "name": "get_project",
  "description": "Get detailed information about a project",
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

#### list_projects

List all projects.

```json
{
  "name": "list_projects",
  "description": "List all projects in the platform",
  "inputSchema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["active", "suspended", "archived"]
      }
    }
  }
}
```

---

#### update_project

Update project settings.

```json
{
  "name": "update_project",
  "description": "Update project configuration",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "description": { "type": "string" },
      "envVars": { "type": "object" }
    },
    "required": ["projectId"]
  }
}
```

---

#### delete_project

Delete a project.

```json
{
  "name": "delete_project",
  "description": "Permanently delete a project and all its resources",
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

#### suspend_project

Suspend a project.

```json
{
  "name": "suspend_project",
  "description": "Suspend a project (stops all running instances)",
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

#### clone_project

Clone an existing project.

```json
{
  "name": "clone_project",
  "description": "Create a copy of an existing project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" }
    },
    "required": ["projectId", "name"]
  }
}
```

---

### Deployment Tools

#### create_deployment

Trigger a new deployment.

```json
{
  "name": "create_deployment",
  "description": "Trigger a new deployment for a project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "branch": { "type": "string" },
      "strategy": {
        "type": "string",
        "enum": ["buildpack", "dockerfile"]
      }
    },
    "required": ["projectId"]
  }
}
```

---

#### get_deployment

Get deployment status.

```json
{
  "name": "get_deployment",
  "description": "Get details about a specific deployment",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "deploymentId": { "type": "string" }
    },
    "required": ["projectId", "deploymentId"]
  }
}
```

---

#### list_deployments

List project deployments.

```json
{
  "name": "list_deployments",
  "description": "List all deployments for a project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "limit": { "type": "number" }
    },
    "required": ["projectId"]
  }
}
```

---

#### get_deployment_logs

Stream deployment logs.

```json
{
  "name": "get_deployment_logs",
  "description": "Stream real-time deployment logs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "deploymentId": { "type": "string" }
    },
    "required": ["projectId", "deploymentId"]
  }
}
```

---

#### rollback_deployment

Rollback to a previous deployment.

```json
{
  "name": "rollback_deployment",
  "description": "Rollback to a previous successful deployment",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "deploymentId": { "type": "string" }
    },
    "required": ["projectId", "deploymentId"]
  }
}
```

---

### Storage Tools

#### create_bucket

Create a storage bucket.

```json
{
  "name": "create_bucket",
  "description": "Create a new storage bucket",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "isPublic": { "type": "boolean" }
    },
    "required": ["projectId", "name"]
  }
}
```

---

#### upload_file

Upload a file to storage.

```json
{
  "name": "upload_file",
  "description": "Upload a file to storage bucket",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "key": { "type": "string" },
      "content": { "type": "string" },
      "mimeType": { "type": "string" }
    },
    "required": ["projectId", "bucketId", "key", "content"]
  }
}
```

---

#### list_files

List files in a bucket.

```json
{
  "name": "list_files",
  "description": "List all files in a storage bucket",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "prefix": { "type": "string" }
    },
    "required": ["projectId", "bucketId"]
  }
}
```

---

#### generate_signed_url

Generate a signed URL for private file access.

```json
{
  "name": "generate_signed_url",
  "description": "Generate a time-limited signed URL for file access",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "key": { "type": "string" },
      "expiresIn": { "type": "number" }
    },
    "required": ["projectId", "bucketId", "key"]
  }
}
```

---

### Email Tools

Three products: Hosted Mailboxes (IMAP/SMTP), Email API (Resend-style), Inbox.

#### add_email_domain

Add and configure an email domain.

```json
{
  "name": "add_email_domain",
  "description": "Add an email domain and set up DNS records",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domain": { "type": "string" }
    },
    "required": ["projectId", "domain"]
  }
}
```

#### verify_email_domain

Verify DNS records for a domain (DKIM, SPF, DMARC, MX).

```json
{
  "name": "verify_email_domain",
  "description": "Re-verify domain DNS records",
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

#### create_mailbox

Create a mailbox (IMAP/SMTP account). Returns credentials once — caller should display to user.

```json
{
  "name": "create_mailbox",
  "description": "Create a mailbox account — returns Outlook credentials once",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domain": { "type": "string" },
      "localPart": { "type": "string" },
      "password": { "type": "string" },
      "name": { "type": "string" },
      "quotaMb": { "type": "number" }
    },
    "required": ["projectId", "domain", "localPart", "password"]
  }
}
```

#### suspend_mailbox

Suspend a mailbox (login disabled, emails kept).

```json
{
  "name": "suspend_mailbox",
  "description": "Suspend a mailbox",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "mailboxId": { "type": "string" }
    },
    "required": ["projectId", "mailboxId"]
  }
}
```

#### reset_mailbox_password

Reset a mailbox password. Returns new password once.

```json
{
  "name": "reset_mailbox_password",
  "description": "Reset mailbox password — returns new password once",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "mailboxId": { "type": "string" },
      "newPassword": { "type": "string" }
    },
    "required": ["projectId", "mailboxId", "newPassword"]
  }
}
```

#### create_alias

Create a forwarding alias.

```json
{
  "name": "create_alias",
  "description": "Create a forwarding alias",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domain": { "type": "string" },
      "localPart": { "type": "string" },
      "targets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": { "type": "string", "enum": ["mailbox", "external"] },
            "mailboxId": { "type": "string" },
            "address": { "type": "string" }
          }
        }
      },
      "description": { "type": "string" }
    },
    "required": ["projectId", "domain", "localPart", "targets"]
  }
}
```

#### create_sender_identity

Create a sender identity for API sending (no mailbox required).

```json
{
  "name": "create_sender_identity",
  "description": "Create a sender identity for API-based sending",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domain": { "type": "string" },
      "email": { "type": "string" },
      "name": { "type": "string" }
    },
    "required": ["projectId", "domain", "email"]
  }
}
```

#### create_email_api_key

Create an API key for programmatic email sending. Key shown only once.

```json
{
  "name": "create_email_api_key",
  "description": "Create an email API key — shown only once",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" }
    },
    "required": ["projectId", "name"]
  }
}
```

#### send_email

Send an email via Stalwart SMTP.

```json
{
  "name": "send_email",
  "description": "Send an email",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "from": { "type": "string" },
      "to": { "type": "string" },
      "subject": { "type": "string" },
      "text": { "type": "string" },
      "html": { "type": "string" }
    },
    "required": ["projectId", "to", "subject"]
  }
}
```

#### list_email_messages

List messages (inbox view).

```json
{
  "name": "list_email_messages",
  "description": "List email messages with optional filters",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "mailboxId": { "type": "string" },
      "folder": { "type": "string", "enum": ["inbox", "drafts", "trash", "spam"] },
      "unread": { "type": "boolean" },
      "limit": { "type": "number" },
      "offset": { "type": "number" }
    },
    "required": ["projectId"]
  }
}
```
```

---

### Function Tools

#### create_function

Create a serverless function.

```json
{
  "name": "create_function",
  "description": "Create a new serverless function",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "runtime": {
        "type": "string",
        "enum": ["nodejs18", "nodejs20", "python311", "python312", "php82", "php83"]
      },
      "description": { "type": "string" }
    },
    "required": ["projectId", "name", "runtime"]
  }
}
```

---

#### deploy_function

Deploy function code.

```json
{
  "name": "deploy_function",
  "description": "Deploy code to a function",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "functionId": { "type": "string" },
      "code": { "type": "string" },
      "environment": { "type": "object" }
    },
    "required": ["projectId", "functionId", "code"]
  }
}
```

---

#### invoke_function

Invoke a function.

```json
{
  "name": "invoke_function",
  "description": "Invoke a serverless function",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "functionId": { "type": "string" },
      "payload": { "type": "object" }
    },
    "required": ["projectId", "functionId"]
  }
}
```

---

### Queue Tools

#### create_queue

Create a message queue.

```json
{
  "name": "create_queue",
  "description": "Create a new message queue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "type": {
        "type": "string",
        "enum": ["work", "stream"]
      },
      "maxRetries": { "type": "number" }
    },
    "required": ["projectId", "name"]
  }
}
```

---

#### publish_message

Publish a message to a queue.

```json
{
  "name": "publish_message",
  "description": "Publish a message to a queue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "queueId": { "type": "string" },
      "payload": { "type": "object" },
      "delayMs": { "type": "number" }
    },
    "required": ["projectId", "queueId", "payload"]
  }
}
```

---

### Cron Tools

#### create_cron_job

Create a cron job.

```json
{
  "name": "create_cron_job",
  "description": "Create a scheduled cron job",
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
```

---

#### run_cron_job

Trigger a cron job immediately.

```json
{
  "name": "run_cron_job",
  "description": "Execute a cron job immediately",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "jobId": { "type": "string" }
    },
    "required": ["projectId", "jobId"]
  }
}
```

---

### Domain Tools

#### add_domain

Add a custom domain.

```json
{
  "name": "add_domain",
  "description": "Add a custom domain to a project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "domain": { "type": "string" }
    },
    "required": ["projectId", "domain"]
  }
}
```

---

#### verify_domain

Verify domain DNS configuration.

```json
{
  "name": "verify_domain",
  "description": "Check and verify domain DNS records",
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

### AI Tools

#### ai_assist

Get AI assistance for platform management.

```json
{
  "name": "ai_assist",
  "description": "Get AI-powered assistance for platform operations",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "query": { "type": "string" },
      "context": { "type": "object" }
    },
    "required": ["query"]
  }
}
```

---

#### diagnose_error

Diagnose deployment or runtime errors.

```json
{
  "name": "diagnose_error",
  "description": "Analyze error logs and provide solutions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "errorLogs": { "type": "string" },
      "deploymentId": { "type": "string" }
    },
    "required": ["projectId", "errorLogs"]
  }
}
```

---

## MCP Server Configuration

```json
{
  "mcpServers": {
    "fidscript": {
      "command": "npx",
      "args": ["@fidscript/mcp", "start"],
      "env": {
        "FIDSCRIPT_API_KEY": "fs_mcp_xxx"
      }
    }
  }
}
```

---

## Error Handling

MCP tools return errors in standard format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found",
    "details": {
      "projectId": "prj_xxx"
    }
  }
}
```

---

## Permissions

Tools require appropriate permissions:

| Tool | Required Permission |
|------|-------------------|
| create_user | admin |
| list_projects | projects:read |
| create_project | projects:write |
| delete_project | projects:delete |
| create_deployment | deployments:write |
| upload_file | storage:write |
| send_email | email:send |
