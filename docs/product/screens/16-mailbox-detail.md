# Screen Spec — `MailboxDetail`

> Per-mailbox detail at `/dashboard/projects/:id/email/mailboxes/:m` (F11). The operator's
> console for one mailbox: status, IMAP/SMTP credentials, settings, audit gap note.

## 1. Purpose
The user inspects one mailbox — sees its IMAP/SMTP credentials, quota, status, and the
audit gap note. The principle: **a mailbox is a long-lived identity; the UI surfaces its
state without hiding the audit gap.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/email/mailboxes/:m`.
- **Permission:** any member (`O/A/D/V`); viewer greys Reset password / Suspend / Delete.
- **Project scope:** the mailbox belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Email › Mailboxes › info@mail.acme.com             │
├──────────────────────────────────────────────────────────────────────┤
│ info@mail.acme.com  [● active]  quota 10 GB                           │
│ [Reset password] [Suspend] [Delete]                                  │
├──────────────────────────────────────────────────────────────────────┤
│ IMAP                                                                 │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Host: fidscript_stalwart  Port: 993  SSL: TLS                    ││
│ │ Username: info@mail.acme.com                                      ││
│ │ Password: ●●●●●●●●●●●●●  [Reveal once]                            ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ SMTP                                                                 │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Host: fidscript_stalwart  Port: 587  STARTTLS                     ││
│ │ Username: info@mail.acme.com                                      ││
│ │ Password: ●●●●●●●●●●●●●  [Reveal once]                            ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ ⚠ Stalwart v0.15.5: suspend is a DB flag only — Stalwart login is   │
│   NOT disabled. Plan to upgrade Stalwart or rotate credentials.      │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: email, status badge, quota, kebab actions.
- **IMAP block**: host, port, SSL, username, password (masked; "Reveal once" button).
- **SMTP block**: host, port, STARTTLS, username, password (masked; "Reveal once" button).
- **Audit gap note** — always-visible banner explaining the Stalwart suspend limitation.
- **Actions**:
  - **Reset password** (MAIL-12) → confirm dialog → new password in a one-time toast.
  - **Suspend** (MAIL-10) → confirm dialog (with audit-gap note).
  - **Activate** (MAIL-11) — visible when status=inactive.
  - **Delete** (MAIL-13) → type-to-confirm with the email address.

## 5. Primary + secondary actions
- **Primary**: "Reset password" (most common action).
- **Secondary**: Suspend / Activate, Delete (Danger Zone).

## 6. API mapping
- **Get mailbox** — `GET /api/v1/email/mailboxes/:id` (`MAIL-08`).
- **Reset password** — `POST /api/v1/email/mailboxes/:id/reset-password` (`MAIL-12`).
  Returns the new password (one-time).
- **Suspend** — `POST /api/v1/email/mailboxes/:id/suspend` (`MAIL-10`).
- **Activate** — `POST /api/v1/email/mailboxes/:id/activate` (`MAIL-11`).
- **Update** — `PATCH /api/v1/email/mailboxes/:id` (`MAIL-09`) for quota + name.
- **Delete** — `DELETE /api/v1/email/mailboxes/:id` (`MAIL-13`).
- **Realtime** — `email.mailbox_created`, `email.mailbox_deleted`, and a (future)
  `email.mailbox_status_changed`.

## 7. Forms + validation
- **Quota slider**: 1 MB – 100 GB.
- **Display name**: text input.
- **Delete**: type-to-confirm with the email address.

## 8. Accessibility
- **Focus order**: header → IMAP block → SMTP block → actions.
- **Password reveal**: `aria-pressed` indicates the reveal state; the password is
  announced when revealed.
- **Audit gap banner**: `role="alert"` with `aria-live="polite"`.
- **Confirm dialogs**: `role="alertdialog"` with the action's consequence in the
  description.

## 9. Cross-references
- **Phase**: F11 Email UI §6.
- **Service spec**: `docs/product/services/email.md`.
- **Journey**: backend dev's mailbox setup + maintenance.
- **Navigation**: Email → Mailboxes → click a row.
- **Related screens**: Add email domain wizard (sibling), Messages (filtered to mailbox).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/email/mailboxes/:m`; the IMAP and
   SMTP blocks are visible.
2. The audit-gap banner ("Stalwart v0.15.5: suspend is a DB flag only") is always
   visible — the UI surfaces the gap honestly.
3. Passwords are masked by default; "Reveal once" shows the password (session-scoped);
   the reveal is audit-logged.
4. Reset password opens a confirm dialog; the new password is in a one-time toast.
5. Suspend opens a confirm dialog that explicitly mentions the audit gap.
6. Delete is in Danger Zone; type-to-confirm with the email address.
7. Email services lack project-access checks per the audit; the UI greys for non-members.