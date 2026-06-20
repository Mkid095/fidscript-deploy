# Screen Spec — `NewDatabaseModal`

> Modal overlay on `/dashboard/projects/:id/databases` (F08). Triggered by the "Create
> database" CTA.

## 1. Purpose
The user provisions a managed Postgres — picks a name, an environment, a size, and ships.
The principle: **a database is one form; the credentials arrive in a toast 5–30s later.**

## 2. Route + access
- **Route:** overlay on `/dashboard/projects/:id/databases`.
- **Permission:** any member (`O/A/D/V`); viewer sees the modal but Create is greys.
- **Project scope:** creates a `ManagedDatabase` row in the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ New database                                                    [X] │
├──────────────────────────────────────────────────────────────────────┤
│ Name *                                                              │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ primary                                                          ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ Environment *                                                        │
│ ┌──────────────────────┐  ┌──────────────────────┐                  │
│ │ ● Production (default)│  │ ○ Staging            │                  │
│ └──────────────────────┘  └──────────────────────┘                  │
│ ┌──────────────────────┐  ┌──────────────────────┐                  │
│ │ ○ Preview            │  │ ○ Development        │                  │
│ └──────────────────────┘  └──────────────────────┘                  │
│                                                                      │
│ Type                                                                 │
│ ● PostgreSQL 15 (default)                                            │
│ ⊘ MySQL (coming soon) ⊘ Redis (coming soon)                          │
│                                                                      │
│ ▼ Advanced                                                           │
│   Size:              [ small ▼ ]                                     │
│   Max connections:   [─────●──────] 20                               │
│                                                                      │
│                                [Cancel]  [ Create database ]         │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Name**: required, slug-style, unique per (project, environment).
- **Environment**: 4 radio cards (Production | Staging | Preview | Development); default
  Production.
- **Type**: pg enabled (default); mysql + redis greys with "not yet available" (audit gap).
- **Advanced**: size (small | medium | large), maxConnections (slider 5–100).
- **Submit**:
  - *Disabled*: name empty/invalid, or type is greyed.
  - *Loading*: spinner; "Provisioning…".
  - *Error*: modal stays open with inline error.

## 5. Primary + secondary actions
- **Primary**: "Create database" — POST DB-01 (async).
- **Secondary**: "Cancel" / `[X]`.

## 6. API mapping
- **Create** — `POST /api/v1/projects/:id/databases` (`DB-01`). Payload:
  `{name, environment?, type?, version?, size?, maxConnections?, provider?}`. Returns
  `{id, projectId, name, status: 'provisioning'}` (async; creds are NOT in the response).
- **Realtime** — `database.provisioned` event delivers the one-time credentials; the
  toast shows them with a "Copy all" button.
- **One-time credentials** — the toast includes host, port, username, password,
  connectionString. After dismissal, the password is **not re-displayed**.

## 7. Forms + validation
- **Name**: required, slug-style, unique per (project, environment).
- **Environment**: required, enum.
- **Type**: required, must be `pg` (UI constrains; backend DTO is loose per the audit).
- **Version**: defaults to `15`.
- **Size**: enum `small|medium|large`.
- **Max connections**: integer 5–100.

## 8. Accessibility
- **Focus order**: name → environment → type → advanced → cancel → create.
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title.
- **Greying**: `aria-disabled="true"` on greys; tooltip explains "not yet available."

## 9. Cross-references
- **Phase**: F08 Databases UI §6.
- **Service spec**: `docs/product/services/databases.md`.
- **Journey**: solo dev's first DB; team's per-environment DBs.
- **Navigation**: Databases section's "Create database" CTA; ⌘K.
- **Related screens**: Database detail (target after create).

## 10. Acceptance criteria
1. The modal opens from the Databases list's "Create database" CTA.
2. Name is required, slug-style, unique per (project, environment).
3. Environment is a 4-card radio; default is Production.
4. Type picker shows `pg` enabled and `mysql`/`redis` greys with "not yet available."
5. Advanced reveals size + maxConnections.
6. Submit is disabled when name is empty/invalid or type is greyed.
7. On submit, the modal closes optimistically; the new card appears with `provisioning`
   status.
8. When `database.provisioned` arrives, the card transitions to `ready` and a toast shows
   the one-time credentials with a "Copy all" button.
9. On 409 (duplicate name), the modal re-opens with an inline error.
10. Esc / Cancel / [X] close the modal.
