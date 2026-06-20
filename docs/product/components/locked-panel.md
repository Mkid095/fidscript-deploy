# Component Spec — `LockedPanel`

> Renders a "you need admin/owner" panel for screens where the current role can't act.

## 1. Purpose
The user understands they don't have permission. The principle: **a locked panel is a
hint, not a wall — it tells the user what role would unlock the action.**

## 2. Props
```ts
type LockedPanelProps = {
  /** The required role to act. */
  requiredRole: 'admin' | 'owner';
  /** The current role. */
  currentRole: 'owner' | 'admin' | 'developer' | 'viewer';
  /** The action that would be unlocked. */
  action: string;
  /** The owner's contact (optional — for the "ask the owner" CTA). */
  ownerContact?: { name: string; email: string };
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────────────┐
│ 🔒 Admin required to rotate credentials                   │
│                                                            │
│ You're a <role>; only admins can rotate credentials.      │
│ Ask <owner name> (<owner email>) to grant you admin,      │
│ or to rotate the credentials for you.                     │
└────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: full message + (optional) "Ask the owner" CTA.
- **Loading**: not applicable.

## 5. Variants
- **Required**: admin · owner.

## 6. Interactions
- **Click "Ask the owner"** (optional): opens an email to the owner.
- Otherwise: passive.

## 7. Accessibility
- **Role**: `role="note"` with `aria-label="Action requires <role>"`.
- **Email link**: standard `<a href="mailto:…">`.

## 8. Telemetry / events
- `locked_panel.owner_contact_clicked` → `{ requiredRole, action }`.

## 9. Cross-references
- **Screens**: every screen where the current role can't act.

## 10. Acceptance criteria
- Renders the lock + the required role + the current role.
- Optional "Ask the owner" CTA opens the email client.
- Screen-reader announcements are correct.
- Theme-aware.