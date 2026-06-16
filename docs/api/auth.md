# Auth API

Authentication and identity management endpoints.

## Base URL

```
https://api.deploy.fidscript.com/api/v1/auth
```

---

## Authentication Endpoints

### Register

Create a new user account.

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response (201 Created)**

```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "session": {
    "id": "ses_xyz789",
    "expiresAt": "2026-06-23T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors**

| Status | Description |
|--------|-------------|
| 400 | Invalid input data |
| 409 | Email already registered |

---

### Login

Authenticate with email and password.

```http
POST /api/v1/auth/login
Content-Type: application/json
X-Forwarded-For: 203.0.113.1
User-Agent: Mozilla/5.0...

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK)**

```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "session": {
    "id": "ses_xyz789",
    "expiresAt": "2026-06-23T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors**

| Status | Description |
|--------|-------------|
| 400 | Invalid input data |
| 401 | Invalid credentials |

---

### Logout

End the current session.

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

**Response (200 OK)**

```json
{
  "success": true
}
```

---

### Magic Link

Request a passwordless login link via email.

```http
POST /api/v1/auth/magic-link
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK)**

```json
{
  "sent": true
}
```

**Note:** Always returns 200 to prevent email enumeration.

---

### Verify Magic Link

Complete magic link authentication.

```http
POST /api/v1/auth/verify-magic-link
Content-Type: application/json

{
  "token": "abc123def456..."
}
```

**Response (200 OK)**

```json
{
  "user": { ... },
  "session": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## User Endpoints

### Get Profile

Retrieve the authenticated user's profile.

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response (200 OK)**

```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "avatarUrl": null,
  "role": "USER",
  "mfaEnabled": false,
  "lastLoginAt": "2026-06-16T10:00:00.000Z",
  "createdAt": "2026-06-01T00:00:00.000Z"
}
```

---

### Update Profile

Update the authenticated user's profile.

```http
PATCH /api/v1/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response (200 OK)**

```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "role": "USER"
}
```

---

## Session Endpoints

### List Sessions

Get all active sessions for the authenticated user.

```http
GET /api/v1/auth/sessions
Authorization: Bearer <token>
```

**Response (200 OK)**

```json
{
  "sessions": [
    {
      "id": "ses_xyz789",
      "expiresAt": "2026-06-23T12:00:00.000Z",
      "ipAddress": "203.0.113.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-06-16T12:00:00.000Z"
    }
  ]
}
```

---

### Revoke Session

End a specific session.

```http
DELETE /api/v1/auth/sessions/:id
Authorization: Bearer <token>
```

**Response (200 OK)**

```json
{
  "success": true
}
```

---

### Revoke All Sessions

End all sessions for the authenticated user.

```http
DELETE /api/v1/auth/sessions
Authorization: Bearer <token>
```

**Response (200 OK)**

```json
{
  "success": true
}
```

---

## API Key Endpoints

### List API Keys

Get all API keys for the authenticated user.

```http
GET /api/v1/auth/api-keys
Authorization: Bearer <token>
```

**Response (200 OK)**

```json
{
  "apiKeys": [
    {
      "id": "key_abc123",
      "name": "Production API Key",
      "permissions": ["projects:read", "projects:write"],
      "lastUsedAt": "2026-06-16T10:00:00.000Z",
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

---

### Create API Key

Generate a new API key.

```http
POST /api/v1/auth/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "CI/CD Pipeline",
  "permissions": ["projects:read", "deployments:write"],
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

**Response (201 Created)**

```json
{
  "id": "key_xyz789",
  "name": "CI/CD Pipeline",
  "permissions": ["projects:read", "deployments:write"],
  "lastUsedAt": null,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "createdAt": "2026-06-16T12:00:00.000Z",
  "key": "fsk_abc123..."
}
```

**Important:** The `key` field is only returned once at creation time.

---

### Revoke API Key

Delete an API key.

```http
DELETE /api/v1/auth/api-keys/:id
Authorization: Bearer <token>
```

**Response (200 OK)**

```json
{
  "success": true
}
```

---

## Events

Auth endpoints emit the following events:

| Event | Payload |
|-------|---------|
| `user.created` | `{ userId, email }` |
| `user.updated` | `{ userId }` |
| `user.login` | `{ userId, email }` |
| `session.created` | `{ sessionId, userId }` |
| `session.revoked` | `{ sessionId, userId }` |
| `api_key.created` | `{ keyId, userId }` |
| `api_key.revoked` | `{ keyId, userId }` |

---

## Using API Keys

API keys are passed in the `Authorization` header:

```http
Authorization: Bearer fsk_abc123...
```

Or via the `X-API-Key` header:

```http
X-API-Key: fsk_abc123...
```
