# Component Spec — `AppHeader`

> The global header on every authenticated screen. Logo · project switcher · breadcrumbs ·
> global search · notifications · account menu. Fixed top, 56px tall.

## 1. Purpose
The user's home anchor. Click the logo → `/dashboard`. The header is the same on every
authenticated screen; the user learns it once. The principle: **the chrome is invisible
when it works.**

## 2. Props
```ts
type AppHeaderProps = {
  /** The current project (null on the workspace root). */
  project: Project | null;
  /** The current user's role in the current project (null on the workspace root). */
  role: 'owner' | 'admin' | 'developer' | 'viewer' | null;
  /** The current path (drives the breadcrumbs). */
  pathname: string;
  /** Unread notification count (from realtime subscription). */
  unreadCount: number;
};
```

## 3. Visual anatomy
```
┌──────────────────────────────────────────────────────────────────┐
│ [logo] [Project: my-app ▼]  Projects › my-app › Deployments  ⌘K  │
│                                                              🔔 3 👤│
└──────────────────────────────────────────────────────────────────┘
```

## 4. States (the full matrix)
- **Idle**: full bar; logo + project switcher + breadcrumbs + ⌘K hint + notifications + avatar.
- **Workspace root** (project=null): no project switcher; no breadcrumbs; just the logo.
- **Project shell** (project set): full bar.
- **Loading**: the project switcher shows the previous value (skeleton if first load).
- **Empty**: not applicable (header is always present).
- **Notification badge**: red dot + count when `unreadCount > 0`; grey dot when 0.
- **⌘K hint**: visible on `lg:`; hidden on `md-` (the floating action button replaces it).
- **Avatar**: image if `avatarUrl`; initials fallback.
- **Error**: if the project fails to load, the project switcher shows "—" + a retry icon.

## 5. Variants
- **Theme**: dark (default), light. Auto-resolves from `localStorage` `fidscript.theme`.
- **Density**: comfortable (default). Compact is for logs/messages (not used here).

## 6. Interactions
- **Logo click** → `/dashboard`.
- **Project switcher click** → opens `<ProjectSwitcher>` modal.
- **Breadcrumb segment click** → navigates (the rightmost segment is not clickable).
- **⌘K** (or Ctrl+K) → opens `<CommandPalette>`.
- **🔔 click** → opens notification dropdown.
- **👤 click** → opens `<AccountMenu>` dropdown.
- **Escape** closes any open dropdown.

## 7. Accessibility
- **Landmarks**: `<header>` wraps the bar; `<nav aria-label="Primary">` for breadcrumbs.
- **Focus order**: logo → project switcher → breadcrumbs → ⌘K → notifications → avatar.
- **⌘K**: `aria-keyshortcuts="Meta+K Control+K"`.
- **Notification badge**: `aria-label="<count> unread notifications"`.
- **Avatar**: `aria-haspopup="menu"`, `aria-expanded`.
- **Reduced motion**: no slide-in animations on dropdowns.

## 8. Telemetry / events
- `header.logo_clicked` → `{ userId }`.
- `header.project_switcher_opened` → `{ userId }`.
- `header.command_palette_opened` → `{ userId, shortcut }`.
- `header.notification_bell_clicked` → `{ userId, unreadCount }`.
- `header.account_menu_opened` → `{ userId }`.

## 9. Cross-references
- **Screens**: every authenticated screen (via the F05 shell).
- **Service**: `docs/product/services/projects.md` (project switcher).
- **Journeys**: every persona (the header is universal).

## 10. Acceptance criteria
- The header is 56px tall; full-bleed `bg-ink-900`; fixed top.
- Logo navigates to `/dashboard`.
- Project switcher shows the current project (or "—" on the workspace root).
- Breadcrumbs follow the canonical form (`Projects › project › section › resource`).
- ⌘K opens the command palette; the hint is visible.
- Notification badge shows the unread count; clicking opens the dropdown.
- Account menu shows the avatar + name; clicking opens the dropdown.
- The header is keyboard-accessible end-to-end.
- Reduced-motion preference is respected.
- No emoji; Hugeicons only.