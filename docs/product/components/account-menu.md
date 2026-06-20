# Component Spec — `AccountMenu`

> The avatar dropdown. Profile · Sessions · API Keys · Theme · Sign out.

## 1. Purpose
The user manages their account from one place. The principle: **the account menu is the
platform's "you" page.**

## 2. Props
```ts
type AccountMenuProps = {
  /** The current user (drives the avatar + name). */
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
};
```

## 3. Visual anatomy
```
       👤 K
       ─────
       Kennedy
       kennedy@acme.com
       ─────
       👤 Profile         → /account/profile
       🛡  Sessions       → /account/sessions
       🛡  MFA            → /account/mfa
       🔑 API Keys        → /account/api-keys
       ─────
       ☀  Theme           → [light|dark|system]
       ⏏  Sign out        → POST /auth/logout
```

## 4. States
- **Idle**: avatar (image or initials).
- **Dropdown open**: name + email header + 6 menu items.
- **Theme submenu**: light | dark | system (the active option is highlighted).
- **Loading**: skeleton (rare).
- **Error**: not applicable.

## 5. Variants
- **Avatar**: image if `avatarUrl`; initials fallback (first letter of name + first
  letter of email).

## 6. Interactions
- **Click avatar** → open dropdown.
- **Click menu item** → navigate.
- **Theme select** → change the theme + persist to `localStorage`.
- **Sign out** → POST `/auth/logout` → redirect to `/login`.
- **Keyboard**: ↑/↓ navigate; Enter activates; Esc closes.

## 7. Accessibility
- **Button**: `aria-haspopup="menu"`, `aria-expanded`.
- **Menu**: `role="menu"`; each item `role="menuitem"`.
- **Theme**: `role="radiogroup"`; each option `role="radio"` with `aria-checked`.

## 8. Telemetry / events
- `account_menu.opened` → `{ userId }`.
- `account_menu.item_clicked` → `{ userId, item }`.
- `account_menu.theme_changed` → `{ userId, theme }`.
- `account_menu.sign_out_clicked` → `{ userId }`.

## 9. Cross-references
- **Screens**: every authenticated screen.
- **Service**: `docs/product/services/auth.md` (sessions, MFA, API keys).

## 10. Acceptance criteria
- The avatar renders (image or initials).
- Click opens the dropdown with name + email + 6 items.
- Each menu item navigates to the correct route.
- Theme change persists to `localStorage` + applies immediately.
- Sign out POSTs `/auth/logout` and redirects to `/login`.
- Keyboard navigation works.