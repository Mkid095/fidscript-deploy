# Component Spec — `MailboxStatusPill`

> The mailbox status pill that surfaces the Stalwart v0.15.5 suspend limitation
> honestly. Used by the Mailbox detail header.

## 1. Purpose
The user knows the mailbox is suspended but can still log in to Stalwart. The principle:
**the audit gap is surfaced, not hidden.**

## 2. Props
```ts
type MailboxStatusPillProps = {
  status: 'active' | 'suspended' | 'inactive';
};
```

## 3. Visual anatomy
```
[ ⊘ Suspended ]   ⚠ Stalwart v0.15.5: suspend is a DB flag only —
                    Stalwart login is NOT disabled. Plan to upgrade Stalwart
                    or rotate credentials.
```

## 4. States
- **active**: green dot + "active" label.
- **suspended**: yellow dot + "suspended" label + the always-visible audit note.
- **inactive**: gray dot + "inactive" label.

## 5. Variants
- **Theme**: dark/light.

## 6. Interactions
- **Hover**: tooltip with the Stalwart note.
- **Click**: navigates to the docs (F11 §16 — when the docs exist).

## 7. Accessibility
- **Pill**: `role="status"` with `aria-label="Mailbox status: <status>"`.
- **Audit note**: `role="alert"` with `aria-live="polite"` — announced on focus.

## 8. Telemetry / events
- (none — the pill is a leaf).

## 9. Cross-references
- **Screens**: Mailbox detail.

## 10. Acceptance criteria
- Renders the status + the audit note.
- The audit note is always visible (not behind a disclosure).
- Theme-aware.