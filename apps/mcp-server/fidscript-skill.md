# FIDScript Deploy - Claude Code Skill

## Overview

This skill enables Claude Code to interact with the FIDScript Deploy platform, a self-hosted Developer Operating System. Once installed, Claude Code can manage projects, deployments, databases, serverless functions, queues, cron jobs, email, monitoring, and logging through natural language.

## Installation

To install the FIDScript MCP skill, run this command in your project:

```
/install-fidscript
```

Or add this to your `~/.claude/skills/` directory:

```bash
# Clone the skill
git clone https://github.com/fidscript/skill.git ~/.claude/skills/fidscript
```

## Configuration

Set these environment variables:

```bash
export FIDSCRIPT_API_URL=https://api.your-deployment.com
export FIDSCRIPT_API_KEY=your-api-key-here
```

Or configure in your project `.env` file:

```
FIDSCRIPT_API_URL=https://api.your-deployment.com
FIDSCRIPT_API_KEY=your-api-key-here
```

## Usage

Once installed and configured, you can use natural language to manage your FIDScript platform:

### Authentication
```
"Register a new user"
"Login with email and password"
"Get current session info"
```

### Projects
```
"List all my projects"
"Create a new project called my-app"
"Add user@example.com as developer to my project"
"Set environment variables for production"
```

### Deployments
```
"Deploy the main branch"
"Rollback to previous deployment"
"Check build configuration"
```

### Databases
```
"Create a PostgreSQL database"
"List all databases"
"Rotate database credentials"
"Create a backup"
```

### Functions
```
"Create a Node.js function called process-data"
"Deploy this code to the function"
"Invoke the function with payload {batch: true}"
"Check function logs"
```

### Queues
```
"Create a queue for background jobs"
"Publish a message to the queue"
"Consume messages from queue"
```

### Cron Jobs
```
"Create a cron job that runs every 5 minutes"
"Trigger the job manually"
"Check execution history"
```

### Email
```
"Send email to user@example.com"
"Create a mailbox"
"Verify domain for email"
```

### Monitoring
```
"Record a custom metric"
"Create an alert when error_rate > 5"
"Get active alerts"
```

### Logging
```
"Write a log entry"
"Get recent logs"
"Get log statistics"
```

## Available Tools

The FIDScript skill exposes **80+ tools** organized by module:

| Module | Tools | Description |
|--------|-------|-------------|
| Auth | 6 | User registration, login, magic links |
| Projects | 10 | CRUD, members, environment variables |
| Deployments | 6 | Deploy, rollback, build config |
| Storage | 7 | Buckets, files, signed URLs |
| Databases | 8 | Provision, backups, credentials |
| Email | 8 | Send, mailboxes, aliases, verification |
| Functions | 9 | Create, deploy, invoke, logs |
| Queues | 10 | Create, publish, consume, ack |
| Cron | 8 | Create, trigger, execution history |
| Realtime | 4 | Channels, presence |
| Monitoring | 11 | Metrics, alerts, rules |
| Logging | 6 | Write, query, stats |
| App Auth | 7 | Project-level user auth |

## Examples

### Full Stack App Deployment

```
"Create a new project called my-saas"
"Create a PostgreSQL database called main_db"
"Create a Node.js function for user registration"
"Create a queue for email processing"
"Deploy my application code"
```

### Monitoring Setup

```
"Create an alert rule: alert when error_count > 10"
"Record metrics for response time"
"Get dashboard monitoring stats"
```

### Database Management

```
"Create a Redis database for caching"
"Create a backup of my database"
"Rotate database credentials for security"
```

## Uninstall

```
/uninstall-fidscript
```

## Troubleshooting

If tools are not working:

1. Verify API URL is accessible:
   ```bash
   curl $FIDSCRIPT_API_URL/health
   ```

2. Check API key is valid:
   ```bash
   curl -H "Authorization: Bearer $FIDSCRIPT_API_KEY" \
     $FIDSCRIPT_API_URL/api/v1/auth/session
   ```

3. View available tools:
   ```
   /tools-fidscript
   ```

## Help

- Documentation: https://docs.fidscript.com
- GitHub: https://github.com/fidscript/fidscript
- Support: support@fidscript.com