# Database Service

Managed PostgreSQL databases for application projects.

---

## Purpose

Provides dedicated PostgreSQL databases per project with automated backups, connection pooling, and management tools.

---

## Responsibilities

- Database provisioning per project
- Connection string management
- Automated backups (daily, configurable)
- Backup restoration
- Connection pooling via PgBouncer
- Database status monitoring
- SSL/TLS for connections

---

## Dependencies

- PostgreSQL (infrastructure schema)
- Storage Service (backup storage)

---

## Database Tables

### infrastructure.databases

```sql
CREATE TABLE infrastructure.databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'provisioning',
  host VARCHAR(255),
  port INTEGER,
  max_connections INTEGER DEFAULT 100,
  storage_gb DECIMAL(10,2),
  backup_enabled BOOLEAN DEFAULT true,
  backup_schedule CRON,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### infrastructure.db_credentials

```sql
CREATE TABLE infrastructure.db_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES infrastructure.databases(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  password_encrypted BYTEA NOT NULL,
  connection_string_encrypted BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### infrastructure.db_backups

```sql
CREATE TABLE infrastructure.db_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES infrastructure.databases(id) ON DELETE CASCADE,
  backup_id VARCHAR(255) NOT NULL,
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Database Statuses

| Status | Description |
|--------|-------------|
| provisioning | Being created |
| active | Running normally |
| suspended | Paused |
| failed | Error state |
| restoring | Restoring from backup |

---

## Events Produced

| Event | Trigger |
|-------|---------|
| database.provisioned | Database created |
| database.updated | Settings changed |
| database.backup_started | Backup initiated |
| database.backup_completed | Backup finished |
| database.restored | Restore finished |
| database.deleted | Database removed |

---

## Events Consumed

None.

---

## API Endpoints

```
GET /api/v1/projects/:projectId/databases
  Headers: Authorization: Bearer <token>
  Response: { databases: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/databases
  Headers: Authorization: Bearer <token>
  Body: {
    name: string,
    type?: 'postgres',
    maxConnections?: number,
    storageGb?: number
  }
  Response: { database, connectionInfo }
  Errors: 401, 404

GET /api/v1/projects/:projectId/databases/:id
  Headers: Authorization: Bearer <token>
  Response: { database }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/databases/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

GET /api/v1/projects/:projectId/databases/:id/credentials
  Headers: Authorization: Bearer <token>
  Response: { connectionString } // Encrypted
  Errors: 401, 404

POST /api/v1/projects/:projectId/databases/:id/rotate-credentials
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

GET /api/v1/projects/:projectId/databases/:id/backups
  Headers: Authorization: Bearer <token>
  Response: { backups: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/databases/:id/backup
  Headers: Authorization: Bearer <token>
  Response: { backup }
  Errors: 401, 404

POST /api/v1/projects/:projectId/databases/:id/restore
  Headers: Authorization: Bearer <token>
  Body: { backupId: string }
  Response: { database }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface ManagedDatabase {
  id: string;
  projectId: string;
  name: string;
  type: 'postgres';
  status: 'provisioning' | 'active' | 'suspended' | 'failed';
  host: string;
  port: number;
  maxConnections: number;
  storageGb: number;
  backupEnabled: boolean;
  createdAt: string;
}

interface DatabaseBackup {
  id: string;
  databaseId: string;
  backupId: string;
  sizeBytes: number;
  status: 'in_progress' | 'completed' | 'failed';
  completedAt: string | null;
  createdAt: string;
}

platform.databases.list(projectId: string): Promise<ManagedDatabase[]>

platform.databases.create(projectId: string, data: {
  name: string;
  maxConnections?: number;
  storageGb?: number;
}): Promise<{ database: ManagedDatabase; connectionInfo: string }>

platform.databases.get(projectId: string, databaseId: string): Promise<ManagedDatabase>

platform.databases.delete(projectId: string, databaseId: string): Promise<void>

platform.databases.getCredentials(projectId: string, databaseId: string): Promise<{ connectionString: string }>

platform.databases.rotateCredentials(projectId: string, databaseId: string): Promise<void>

platform.databases.backups.list(projectId: string, databaseId: string): Promise<DatabaseBackup[]>

platform.databases.backups.create(projectId: string, databaseId: string): Promise<DatabaseBackup>

platform.databases.restore(projectId: string, databaseId: string, backupId: string): Promise<ManagedDatabase>
```

---

## MCP Tools

```json
{
  "name": "create_database",
  "description": "Provision a managed database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "maxConnections": { "type": "number" },
      "storageGb": { "type": "number" }
    },
    "required": ["projectId", "name"]
  }
}

{
  "name": "get_database",
  "description": "Get database details",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "databaseId": { "type": "string" }
    },
    "required": ["projectId", "databaseId"]
  }
}

{
  "name": "list_databases",
  "description": "List project databases",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "delete_database",
  "description": "Delete a managed database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "databaseId": { "type": "string" }
    },
    "required": ["projectId", "databaseId"]
  }
}

{
  "name": "trigger_backup",
  "description": "Trigger a database backup",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "databaseId": { "type": "string" }
    },
    "required": ["projectId", "databaseId"]
  }
}

{
  "name": "list_backups",
  "description": "List database backups",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "databaseId": { "type": "string" }
    },
    "required": ["projectId", "databaseId"]
  }
}

{
  "name": "restore_backup",
  "description": "Restore database from backup",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "databaseId": { "type": "string" },
      "backupId": { "type": "string" }
    },
    "required": ["projectId", "databaseId", "backupId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/databases` - Database list
- `/projects/:id/databases/new` - Create database
- `/projects/:id/databases/:id` - Database detail
- `/projects/:id/databases/:id/backups` - Backup management
- `/projects/:id/settings/database` - Default database settings

---

## Security Considerations

1. **Encrypted credentials** - Passwords encrypted at rest
2. **SSL connections** - TLS for all connections
3. **Connection pooling** - PgBouncer prevents overload
4. **Read-only users** - Optional restricted access
5. **IP allowlisting** - Optional IP restrictions

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Accidental data loss | Restore from latest backup |
| Disk full | Expand storage |
| Connection overload | PgBouncer queuing |
| Database crash | Auto-restart, restore if needed |

---

## Future Extensions

- Database branching (preview environments)
- Point-in-time recovery
- Multi-region replication
- Database migrations tooling
- Query performance insights
