# @fidscript-deploy/mcp-server

The FIDScript platform as Model Context Protocol tools — for an AI agent that
should be able to run a deployment, read a function's logs, or list a
project's databases without a person in the loop.

Published from this repository to the FIDScript registry.

## Install and run

```bash
npm install --registry=https://registry.fidscript.com -g @fidscript-deploy/mcp-server

export FIDSCRIPT_API_URL=https://api.fidscript.com
export FIDSCRIPT_API_KEY=<your API key>

fidscript-mcp
```

## Configure it in an MCP client

```json
{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_URL": "https://api.fidscript.com",
        "FIDSCRIPT_API_KEY": "<your API key>"
      }
    }
  }
}
```

## The tools

| Domain | Tools |
|---|---|
| Projects | `project_list`, `project_create` |
| Deployments | `deployments_list`, `deployments_get`, `deployments_create`, `deployments_stop`, `deployments_restart`, `deployments_rollback`, `deployments_destroy` |
| Functions | `functions_list`, `functions_get`, `functions_create`, `functions_update`, `functions_delete`, `functions_deploy`, `functions_invoke` |
| Databases | `databases_list`, `databases_get`, `databases_create`, `databases_delete`, `databases_backup`, `databases_restore` |
| Storage | `storage_list`, `storage_get`, `storage_create`, `storage_upload`, `storage_delete` |
| Queues | `queues_list`, `queues_get`, `queues_create`, `queues_delete`, `queues_publish` |
| Realtime | `realtime_list`, `realtime_set`, `realtime_create`, `realtime_delete` |
| Scheduler | `cron_list`, `cron_get`, `cron_create`, `cron_update`, `cron_delete`, `cron_trigger` |
| Email | `email_domains`, `email_status`, `email_send`, `email_send_template`, `email_inbox`, `email_templates`, `email_suppressions`, `email_analytics` |
| Domains | `domain_list`, `domain_add`, `domain_verify` |
| Environment | `env_var_list`, `env_var_set`, `env_var_delete` |
| Monitoring | `monitoring_list`, `monitoring_get`, `monitoring_create`, `monitoring_update`, `monitoring_delete`, `monitoring_acknowledge`, `monitoring_resolve`, `monitoring_record`, `monitoring_test` |
| Logging | `logging_query`, `logging_get`, `logging_tail`, `logging_list`, `logging_create`, `logging_delete`, `logging_ingest`, `logging_update` |
| Marketplace | `marketplace_browse`, `marketplace_search`, `marketplace_list`, `marketplace_get`, `marketplace_submit` |
| AI | `ai_send`, `ai_list`, `ai_get`, `ai_create`, `ai_assist`, `ai_diagnose`, `ai_explain`, `ai_generate`, `ai_recommend`, `ai_suggest` |
| Instant | `instant_provision`, `instant_status`, `instant_config`, `instant_delete` |
| Auth | `auth_send_verification`, `auth_verify_email`, `auth_reset_password`, `auth_list_sessions`, `auth_revoke_session`, `auth_revoke_all_sessions`, `auth_list_organizations`, `auth_create_organization`, `auth_get_organization`, `auth_invite_user`, `auth_list_org_members`, `auth_list_org_teams`, `auth_create_team`, `auth_accept_invitation` |

Every tool is a thin call into `@fidscript-deploy/sdk` — the MCP server
holds no business logic of its own, so the agent and the CLI cannot drift
apart.
