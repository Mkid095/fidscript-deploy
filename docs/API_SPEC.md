# API Specification

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](./START_HERE.md), [`AUDIT`](./AUDIT.md), and [`AGENT_STATUS`](../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Complete reference for the FIDScript Deploy REST API.

---

## Base URL

```
Production: https://api.fidscript.dev/v1
Development: http://localhost:3001/v1
```

---

## Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer <token>
```

Tokens are obtained via:
- `/auth/login` - Returns JWT token
- `/auth/register` - Returns JWT token
- API Keys in header: `x-api-key: <key>`

---

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-16T12:00:00Z"
  }
}
```

### List Response

```json
{
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-16T12:00:00Z",
    "pagination": {
      "cursor": "eyJpZCI6MTIzfQ==",
      "hasMore": true,
      "limit": 50,
      "total": 1234
    }
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Must be a valid email" }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-16T12:00:00Z"
  }
}
```

---

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (deleted) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Internal error |

---

## Rate Limiting

Requests are rate limited:
- Authenticated: 1000 requests/minute
- API Key: 5000 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1623844800
```

---

## API Endpoints

### Auth Module

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "eyJhbG...",
    "sessionId": "ses_xyz789"
  }
}
```

**Errors:**
- 400: Invalid email format, password too short
- 409: Email already exists

---

#### POST /auth/login
Authenticate user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": { ... },
    "token": "eyJhbG...",
    "sessionId": "ses_xyz789"
  }
}
```

**Errors:**
- 400: Missing fields
- 401: Invalid credentials

---

#### POST /auth/logout
End current session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": { "success": true }
}
```

---

#### GET /auth/me
Get current user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "mfaEnabled": false
    }
  }
}
```

---

#### GET /auth/sessions
List active sessions.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "sessions": [
      {
        "id": "ses_xyz789",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2026-06-16T10:00:00Z",
        "expiresAt": "2026-06-17T10:00:00Z"
      }
    ]
  }
}
```

---

### Projects Module

#### GET /projects
List user's projects.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` - Filter by status (active, suspended, archived)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "data": {
    "projects": [
      {
        "id": "prj_abc123",
        "name": "my-application",
        "slug": "my-application",
        "type": "frontend",
        "status": "active",
        "subdomain": "my-application.fidscript.dev",
        "createdAt": "2026-06-15T10:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "cursor": null,
      "hasMore": false,
      "limit": 20,
      "total": 1
    }
  }
}
```

---

#### POST /projects
Create a new project.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "my-application",
  "type": "frontend",
  "description": "My web application"
}
```

**Response (201):**
```json
{
  "data": {
    "project": {
      "id": "prj_abc123",
      "name": "my-application",
      "slug": "my-application",
      "type": "frontend",
      "status": "creating",
      "subdomain": "my-application.fidscript.dev",
      "createdAt": "2026-06-16T12:00:00Z"
    }
  }
}
```

**Errors:**
- 400: Invalid name (alphanumeric + hyphens only)
- 409: Project slug already exists

---

#### GET /projects/:id
Get project details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "project": {
      "id": "prj_abc123",
      "name": "my-application",
      "slug": "my-application",
      "type": "frontend",
      "status": "active",
      "ownerId": "usr_abc123",
      "subdomain": "my-application.fidscript.dev",
      "customDomains": [],
      "envVars": { "NODE_ENV": "production" },
      "lastDeployAt": "2026-06-16T11:00:00Z",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-16T11:00:00Z"
    }
  }
}
```

**Errors:**
- 404: Project not found

---

#### PATCH /projects/:id
Update project settings.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "new-name",
  "description": "Updated description",
  "envVars": { "NODE_ENV": "production", "NEW_VAR": "value" }
}
```

**Response (200):**
```json
{
  "data": {
    "project": { ... }
  }
}
```

---

#### DELETE /projects/:id
Delete a project.

**Headers:** `Authorization: Bearer <token>`

**Response (204):** No content

**Errors:**
- 404: Project not found
- 403: Not project owner

---

#### POST /projects/:id/deployments
Trigger a deployment.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "branch": "main",
  "strategy": "buildpack"
}
```

**Response (201):**
```json
{
  "data": {
    "deployment": {
      "id": "dpl_abc123",
      "projectId": "prj_abc123",
      "version": "1.0.0",
      "status": "pending",
      "commitSha": "abc123def",
      "createdAt": "2026-06-16T12:00:00Z"
    }
  }
}
```

---

#### GET /projects/:id/deployments/:deploymentId
Get deployment details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "deployment": {
      "id": "dpl_abc123",
      "projectId": "prj_abc123",
      "version": "1.0.0",
      "status": "success",
      "commitSha": "abc123def",
      "commitMessage": "Fix bug",
      "buildDurationMs": 45000,
      "deploymentUrl": "https://my-application.fidscript.dev",
      "createdAt": "2026-06-16T12:00:00Z",
      "completedAt": "2026-06-16T12:00:45Z"
    }
  }
}
```

---

### Storage Module

#### GET /projects/:id/storage/buckets
List storage buckets.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "buckets": [
      {
        "id": "bkt_abc123",
        "name": "assets",
        "provider": "internal",
        "isPublic": false,
        "createdAt": "2026-06-15T10:00:00Z"
      }
    ]
  }
}
```

---

#### POST /projects/:id/storage/buckets
Create a bucket.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "assets",
  "isPublic": false
}
```

**Response (201):**
```json
{
  "data": {
    "bucket": { ... }
  }
}
```

---

#### POST /projects/:id/storage/buckets/:bucketId/files
Upload a file.

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` - The file content
- `key` - Object key (optional, defaults to filename)

**Response (201):**
```json
{
  "data": {
    "file": {
      "id": "file_xyz789",
      "bucketId": "bkt_abc123",
      "key": "images/logo.png",
      "originalName": "logo.png",
      "mimeType": "image/png",
      "sizeBytes": 15234,
      "etag": "abc123",
      "createdAt": "2026-06-16T12:00:00Z"
    }
  }
}
```

---

### Email Module

#### POST /projects/:id/email/send
Send an email.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "from": "noreply@myapp.com",
  "to": ["user@example.com"],
  "subject": "Welcome!",
  "htmlBody": "<h1>Welcome!</h1>",
  "textBody": "Welcome!"
}
```

**Response (201):**
```json
{
  "data": {
    "email": {
      "id": "eml_abc123",
      "from": "noreply@myapp.com",
      "to": ["user@example.com"],
      "subject": "Welcome!",
      "status": "sent",
      "messageId": "abc123@provider.com"
    }
  }
}
```

---

#### GET /projects/:id/email/logs
List email logs.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` - Filter by status
- `page` - Page number
- `limit` - Items per page

**Response (200):**
```json
{
  "data": {
    "logs": [
      {
        "id": "eml_abc123",
        "from": "noreply@myapp.com",
        "to": ["user@example.com"],
        "subject": "Welcome!",
        "status": "delivered",
        "createdAt": "2026-06-16T12:00:00Z"
      }
    ]
  }
}
```

---

### Functions Module

#### POST /projects/:id/functions
Create a function.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "processPayment",
  "runtime": "nodejs18",
  "description": "Processes payments"
}
```

**Response (201):**
```json
{
  "data": {
    "function": {
      "id": "fn_abc123",
      "name": "processPayment",
      "runtime": "nodejs18",
      "status": "active",
      "memoryMb": 256,
      "timeoutSeconds": 30,
      "createdAt": "2026-06-16T12:00:00Z"
    }
  }
}
```

---

#### POST /projects/:id/functions/:id/invoke
Invoke a function.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "payload": { "orderId": "ord_123", "amount": 99.99 }
}
```

**Response (200):**
```json
{
  "data": {
    "result": { "success": true, "transactionId": "txn_xyz" },
    "logs": {
      "durationMs": 145,
      "memoryUsedMb": 64
    }
  }
}
```

---

### Queues Module

#### POST /projects/:id/queues
Create a queue.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "order-notifications",
  "type": "work",
  "maxRetries": 3
}
```

**Response (201):**
```json
{
  "data": {
    "queue": {
      "id": "q_abc123",
      "name": "order-notifications",
      "type": "work",
      "maxRetries": 3,
      "createdAt": "2026-06-16T12:00:00Z"
    }
  }
}
```

---

#### POST /projects/:id/queues/:id/messages
Publish a message.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "payload": { "orderId": "ord_123", "type": "confirmation" },
  "delayMs": 5000
}
```

**Response (201):**
```json
{
  "data": {
    "message": {
      "id": "msg_xyz789",
      "messageId": "msg_abc123",
      "status": "pending",
      "createdAt": "2026-06-16T12:00:00Z"
    }
  }
}
```

---

### Cron Module

#### POST /projects/:id/cron
Create a cron job.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "daily-report",
  "cronExpression": "0 9 * * *",
  "endpoint": "https://myapp.com/api/reports",
  "method": "POST",
  "timezone": "America/New_York"
}
```

**Response (201):**
```json
{
  "data": {
    "job": {
      "id": "cj_abc123",
      "name": "daily-report",
      "cronExpression": "0 9 * * *",
      "endpoint": "https://myapp.com/api/reports",
      "isActive": true,
      "nextRunAt": "2026-06-17T09:00:00-04:00",
      "createdAt": "2026-06-16T12:00:00Z"
    }
  }
}
```

---

## Common Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Request validation failed |
| AUTHENTICATION_REQUIRED | No valid auth token |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| CONFLICT | Resource already exists |
| RATE_LIMITED | Too many requests |
| INTERNAL_ERROR | Server error |

---

## Pagination

List endpoints use cursor-based pagination.

**Request with cursor:**
```
GET /projects?cursor=eyJpZCI6MTIzfQ==&limit=20
```

**Response includes pagination info:**
```json
{
  "data": { ... },
  "meta": {
    "pagination": {
      "cursor": "eyJpZCI6MTU1fQ==",
      "hasMore": true,
      "limit": 20,
      "total": 150
    }
  }
}
```

---

## Filtering

Filter query parameters use `filter[field]` syntax:

```
GET /projects?filter[status]=active
GET /projects?filter[type]=frontend&filter[status]=active
```

---

## Sorting

Sort parameters use `sort` with `-` prefix for descending:

```
GET /projects?sort=created_at        # ascending
GET /projects?sort=-created_at       # descending
GET /projects?sort=name,-created_at # multi-sort
```
