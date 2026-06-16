# Auth Service

Platform authentication and identity management.

---

## Purpose

Provides secure user authentication, session management, and role-based access control for the FIDScript Deploy platform itself (distinct from Application Auth which is for projects).

---

## Responsibilities

- User registration and credential management
- Session lifecycle (create, validate, revoke)
- JWT token generation and validation
- Role and permission management
- API key management
- MFA support (TOTP)
- Audit logging of all auth events

---

## Dependencies

- PostgreSQL (identity schema)
- Redis (session cache)

---

## Database Tables

### identity.users

```sql
CREATE TABLE identity.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### identity.sessions

```sql
CREATE TABLE identity.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### identity.api_keys

```sql
CREATE TABLE identity.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### identity.audit_logs

```sql
CREATE TABLE identity.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES identity.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Events Produced

| Event | Trigger |
|-------|---------|
| user.created | New user registration |
| user.updated | Profile change |
| user.deleted | Account deletion |
| user.login | Successful login |
| user.logout | Session end |
| session.created | Session established |
| session.revoked | Force logout |
| api_key.created | Key generated |
| api_key.revoked | Key deleted |
| mfa.enabled | MFA activated |
| mfa.disabled | MFA deactivated |

---

## Events Consumed

None.

---

## API Endpoints

### Authentication

```
POST /api/v1/auth/register
  Body: { email, password, name? }
  Response: { user, session, token }
  Errors: 400 (validation), 409 (email exists)

POST /api/v1/auth/login
  Body: { email, password }
  Response: { user, session, token }
  Errors: 400, 401 (invalid credentials)

POST /api/v1/auth/logout
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401

POST /api/v1/auth/magic-link
  Body: { email }
  Response: { sent: true }
  Errors: 404 (user not found)

POST /api/v1/auth/verify-magic-link
  Body: { token }
  Response: { user, session, token }
  Errors: 400 (invalid/expired)

POST /api/v1/auth/mfa/setup
  Headers: Authorization: Bearer <token>
  Response: { secret, qrCode }
  Errors: 401

POST /api/v1/auth/mfa/verify
  Headers: Authorization: Bearer <token>
  Body: { code }
  Response: { enabled: true }
  Errors: 401, 400 (invalid code)

POST /api/v1/auth/mfa/disable
  Headers: Authorization: Bearer <token>
  Body: { code }
  Response: { disabled: true }
  Errors: 401, 400
```

### User Management

```
GET /api/v1/auth/me
  Headers: Authorization: Bearer <token>
  Response: { user }
  Errors: 401

PATCH /api/v1/auth/me
  Headers: Authorization: Bearer <token>
  Body: { name?, avatar_url? }
  Response: { user }
  Errors: 401, 400

GET /api/v1/auth/sessions
  Headers: Authorization: Bearer <token>
  Response: { sessions: [...] }
  Errors: 401

DELETE /api/v1/auth/sessions/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

DELETE /api/v1/auth/sessions
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401
```

### API Keys

```
GET /api/v1/auth/api-keys
  Headers: Authorization: Bearer <token>
  Response: { apiKeys: [...] }
  Errors: 401

POST /api/v1/auth/api-keys
  Headers: Authorization: Bearer <token>
  Body: { name, permissions?, expires_at? }
  Response: { apiKey, key } // key only shown once
  Errors: 401, 400

DELETE /api/v1/auth/api-keys/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
// Authentication
platform.auth.register(email: string, password: string, name?: string): Promise<AuthResponse>
platform.auth.login(email: string, password: string): Promise<AuthResponse>
platform.auth.logout(): Promise<void>
platform.auth.magicLink(email: string): Promise<void>
platform.auth.verifyMagicLink(token: string): Promise<AuthResponse>

// MFA
platform.auth.mfa.setup(): Promise<{ secret: string, qrCode: string }>
platform.auth.mfa.verify(code: string): Promise<boolean>
platform.auth.mfa.disable(code: string): Promise<void>

// User
platform.auth.me(): Promise<User>
platform.auth.updateProfile(data: { name?: string, avatar_url?: string }): Promise<User>

// Sessions
platform.auth.sessions.list(): Promise<Session[]>
platform.auth.sessions.revoke(id: string): Promise<void>
platform.auth.sessions.revokeAll(): Promise<void>

// API Keys
platform.auth.apiKeys.list(): Promise<ApiKey[]>
platform.auth.apiKeys.create(data: { name: string, permissions?: string[], expires_at?: string }): Promise<{ apiKey: ApiKey, key: string }>
platform.auth.apiKeys.revoke(id: string): Promise<void>
```

---

## MCP Tools

```json
{
  "name": "create_user",
  "description": "Create a new platform user",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": { "type": "string", "format": "email" },
      "password": { "type": "string", "minLength": 8 },
      "name": { "type": "string" }
    },
    "required": ["email", "password"]
  }
}

{
  "name": "verify_user",
  "description": "Verify user credentials",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": { "type": "string" },
      "password": { "type": "string" }
    },
    "required": ["email", "password"]
  }
}

{
  "name": "list_sessions",
  "description": "List active user sessions",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}

{
  "name": "revoke_session",
  "description": "Revoke a specific session",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sessionId": { "type": "string" }
    },
    "required": ["sessionId"]
  }
}

{
  "name": "create_api_key",
  "description": "Generate a new API key",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "permissions": { "type": "array", "items": { "type": "string" } },
      "expiresAt": { "type": "string" }
    },
    "required": ["name"]
  }
}

{
  "name": "revoke_api_key",
  "description": "Revoke an API key",
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

## Dashboard Screens

### Auth Pages

- `/login` - Email/password login
- `/register` - User registration
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/mfa-setup` - MFA configuration

### Settings Pages

- `/settings/profile` - Profile editing
- `/settings/security` - Password change, MFA
- `/settings/sessions` - Active sessions
- `/settings/api-keys` - API key management
- `/settings/audit-log` - Auth audit trail

---

## Security Considerations

1. **Password Storage** - bcrypt with cost factor 12
2. **Session Tokens** - Cryptographically random, hashed in database
3. **JWT** - Short-lived (1 hour), refresh token rotation
4. **Rate Limiting** - Login attempts limited per IP/email
5. **Audit Logging** - All auth events logged with IP
6. **MFA** - TOTP with recovery codes

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Lost MFA device | Use recovery codes, contact admin |
| Lost API key | Revoke and regenerate |
| Compromised session | Revoke all sessions |
| Database failure | Sessions in Redis, users in Postgres |

---

## Future Extensions

- OAuth providers (Google, GitHub)
- Passwordless authentication (WebAuthn)
- Session federation
- LDAP/Active Directory integration
