# Screen Spec — `NewCronJobModal`

> Modal overlay on `/dashboard/projects/:id/scheduler` (F10). Triggered by the "Create job"
> CTA.

## 1. Purpose
The user schedules a cron job — picks a cron expression, a target (function or URL), and
ships. The principle: **a cron is one form; the human hint turns the expression into
plain language.**

## 2. Route + access
- **Route:** overlay on `/dashboard/projects/:id/scheduler`.
- **Permission:** any member (`O/A/D/V`); viewer greys.
- **Project scope:** creates a `CronJob` row.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ New cron job                                                    [X] │
├──────────────────────────────────────────────────────────────────────┤
│ Name *                                                              │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ nightly-cleanup                                                  ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ Cron expression *                                                    │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ 0 2 * * *                                                        ││
│ └──────────────────────────────────────────────────────────────────┘│
│ → Runs every day at 02:00 UTC                                        │
│                                                                      │
│ Timezone: [ UTC ▼ ]                                                  │
│                                                                      │
│ Target *                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐                  │
│ │ ● Function           │  │ ○ Endpoint           │                  │
│ └──────────────────────┘  └──────────────────────┘                  │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ webhook-receiver ▼                                               ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ ▼ Advanced                                                           │
│   Payload (JSON): [ { "action": "cleanup" } ]                        │
│   Retries:        [──●────] 3                                       │
│   Timeout:        [─────●──] 300 s                                  │
│   Enabled:        [✓]                                                │
│                                                                      │
│                                [Cancel]  [ Create job ]              │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Name**: required, slug-style, unique per project.
- **Cron expression**: text input with live human hint (e.g. "every 5 minutes",
  "every day at 02:00 UTC"). Validation inline (the cron library).
- **Timezone**: select (default UTC; common IANA timezones).
- **Target**:
  - *Function*: dropdown of the project's `Function` rows.
  - *Endpoint*: URL field (https:// enforced).
- **Advanced**: payload (JSON), retryAttempts, timeoutSeconds, enabled (toggle).
- **Submit**:
  - *Disabled*: name empty/invalid OR cron invalid OR target empty.
  - *Loading*: spinner.
  - *Error*: modal stays open with inline error.

## 5. Primary + secondary actions
- **Primary**: "Create job" — POST CRON-01.
- **Secondary**: "Cancel" / `[X]`.

## 6. API mapping
- **Create** — `POST /api/v1/projects/:id/cron` (`CRON-01`) with
  `{name, cronExpression, timezone?, endpoint?, functionId?, payload?, enabled?,
  retryAttempts?, retryDelaySeconds?, timeoutSeconds?}`. Server validates the cron
  expression; returns 400 on invalid.

## 7. Forms + validation
- **Name**: required, slug-style, unique per project.
- **Cron expression**: required; client-side validation (cron library); server-side
  validation is the source of truth.
- **Timezone**: optional, IANA; default UTC.
- **Target**: required; either `functionId` (must reference an existing function) or
  `endpoint` (must be a valid https URL).
- **Payload**: optional; valid JSON.
- **Retries**: integer 1–10.
- **Timeout**: integer 1–3600.
- **Enabled**: boolean; default true.

## 8. Accessibility
- **Focus order**: name → cron → timezone → target → advanced → cancel → create.
- **Cron hint**: `aria-live="polite"`; "Runs every day at 02:00 UTC" is announced as
  the user types.
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title.

## 9. Cross-references
- **Phase**: F10 Scheduler UI §6.
- **Service spec**: `docs/product/services/scheduler.md`.
- **Journey**: backend dev's first scheduled job.
- **Navigation**: Scheduler section's "Create job" CTA; ⌘K.
- **Related screens**: Job detail (target after create).

## 10. Acceptance criteria
1. The modal opens from the Scheduler list's "Create job" CTA.
2. Cron expression input shows a live human hint ("Runs every 5 minutes", "Runs every
   day at 02:00 UTC", etc.).
3. Target is a radio (Function | Endpoint); function dropdown shows the project's
   functions; endpoint URL field validates https.
4. Submit is disabled when name/cron/target are invalid.
5. On submit, the modal closes optimistically; the new card appears.
6. On 400 (invalid cron), the modal re-opens with the inline error.
7. On 409 (duplicate name), the modal re-opens with an inline error.
8. Esc / Cancel / [X] close the modal.
