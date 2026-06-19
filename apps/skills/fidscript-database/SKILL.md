---
name: fidscript-database
description: Provision, migrate, back up, and restore managed Postgres databases on FIDScript. Includes credential rotation and connection management.
allowed-tools:
  - list_databases
  - get_database
  - create_database
  - delete_database
  - rotate_database_credentials
  - list_database_backups
  - create_database_backup
  - restore_database_backup
version: "1.0.0"
platform-version: ">=1.0.0"
---

# FIDScript Database Skill

Use this skill to manage Postgres databases on FIDScript.

## Provision a Database

### Step 1 — Create

```
Use create_database with:
  projectId: <projectId>
  name: <db-name>         # alphanumeric, underscores
  type: postgres
  version: "15"           # 13, 14, 15, 16
  size: small             # small | medium | large
```

### Step 2 — Get connection string

```
Use get_database with:
  projectId: <projectId>
  databaseId: <from create result>
```

The response includes `connectionUrl` (or `DATABASE_URL`) — use this as the `DATABASE_URL` in your application's environment variables.

### Step 3 — Inject into project env vars

```
Use set_project_env_vars with:
  projectId: <projectId>
  envVars:
    DATABASE_URL: <connectionUrl from Step 2>
```

## Back Up

### Create a backup

```
Use create_database_backup with:
  projectId: <projectId>
  databaseId: <databaseId>
  description: <optional label>
```

### List backups

```
Use list_database_backups with:
  projectId: <projectId>
  databaseId: <databaseId>
```

## Restore

```
Use restore_database_backup with:
  projectId: <projectId>
  databaseId: <databaseId>
  backupId: <backup-id from list_backups>
```

**Warning**: Restoring from a backup overwrites the current database state. This cannot be undone.

## Rotate Credentials

If `DATABASE_URL` or the underlying credentials have been compromised:

```
Use rotate_database_credentials with:
  projectId: <projectId>
  databaseId: <databaseId>
```

Then retrieve the new connection string and update env vars:

```
Use get_database with:
  projectId: <projectId>
  databaseId: <databaseId>

Use set_project_env_vars with:
  projectId: <projectId>
  envVars:
    DATABASE_URL: <new-connectionUrl>
```

## Delete

```
Use delete_database with:
  projectId: <projectId>
  databaseId: <databaseId>
```

**Warning**: This permanently destroys the database and all data.

## Connection Details

| Field | Description |
|-------|-------------|
| host | Database hostname |
| port | Port (5432 for Postgres) |
| database | Database name |
| username | Database user |
| connectionUrl | Full `postgres://` URL ready to paste into DATABASE_URL |
