---
name: fidscript-deploy
description: Scaffold, configure, and deploy a full-stack application on FIDScript. Creates a project, provisions infrastructure (database, storage, queues), configures environment variables, and deploys from a Git source.
allowed-tools:
  - list_projects
  - get_project
  - create_project
  - update_project
  - delete_project
  - get_project_env_vars
  - set_project_env_vars
  - list_deployments
  - get_deployment
  - create_deployment
  - rollback_deployment
  - get_build_config
  - update_build_config
version: "1.0.0"
platform-version: ">=1.0.0"
---

# FIDScript Deploy Skill

Use this skill to take an application from zero to live on FIDScript Deploy.

## Prerequisites

- FIDScript MCP server configured and connected (Phase 17)
- A Git repository with source code for the application
- FIDScript CLI installed (`fidscript login` completed)

## Workflow

### Step 1 — Create the project

```
Use create_project with:
  name: <slug-name>     # lowercase, hyphens allowed
  type: frontend | backend | fullstack
  description: <optional>
```

### Step 2 — Get the project ID

```
Use get_project with:
  projectId: <from Step 1 result>
```

Record the `projectId`. You will need it for all subsequent steps.

### Step 3 — Provision infrastructure

**Database (Postgres)**:
```
Use create_database with:
  projectId: <projectId>
  name: appdb
  type: postgres
  version: "15"
  size: small   # small | medium | large
```

**Object Storage**:
```
Use create_storage_bucket (check storageTools for exact name) with:
  projectId: <projectId>
  name: assets
```

### Step 4 — Configure environment variables

```
Use set_project_env_vars with:
  projectId: <projectId>
  envVars:
    DATABASE_URL: <from get_database result — connection string>
    NODE_ENV: production
    # Add any other vars the app requires
```

### Step 5 — Set build configuration

```
Use get_build_config with:
  projectId: <projectId>
```

Then update if needed:
```
Use update_build_config with:
  projectId: <projectId>
  buildCommand: npm run build   # adjust for the framework
  outputDirectory: dist
```

### Step 6 — Create deployment

```
Use create_deployment with:
  projectId: <projectId>
  sourceRepo: https://github.com/<owner>/<repo>
  sourceBranch: main
```

### Step 7 — Monitor deployment

```
Use get_deployment with:
  projectId: <projectId>
  deploymentId: <from create_deployment result>
```

Poll until status is SUCCESS or FAILED. The URL will be available in the response when successful.

## Rollback

If a deployment fails or you need to revert:
```
Use rollback_deployment with:
  projectId: <projectId>
  deploymentId: <previous-working-deployment-id>
```

## Verification

```bash
# After deployment succeeds:
curl -fsS https://<deployment-url>/ | head -20

# Check deployment status via CLI:
fidscript deployments list --project <projectId> -o json
```

## Error Handling

- If `create_deployment` returns an error about missing env vars, set them in Step 4 and retry.
- If `DATABASE_URL` is not available from the database create response, use `get_database` to retrieve connection details.
- Build failures: check `get_build_config` output matches the repository structure.
