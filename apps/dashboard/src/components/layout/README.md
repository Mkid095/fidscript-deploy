# Layout Components

The dashboard chrome: sidebar (expanded + collapsed + mobile), project switcher, avatar dropdown, notification bell, mobile tab bar.

## Sidebar
| File | Purpose |
|------|---------|
| `project-sidebar.tsx` | Container — selects expanded vs collapsed based on width. |
| `sidebar-expanded-nav.tsx` | Wide sidebar with full nav + footer. |
| `sidebar-collapsed-nav.tsx` | Rail with icons only. |
| `sidebar-nav-items.tsx` | The shared nav items list. |
| `sidebar-footer.tsx` | Footer (theme toggle + user). |
| `sidebar-hooks.ts` | `getStatusColor`, `isCreating`, `getProjectRole`, `getFilteredNavGroups` — pure helpers. |

## Project switcher
| File | Purpose |
|------|---------|
| `project-switcher-modal.tsx` | Searchable project picker. |

## Account
| File | Purpose |
|------|---------|
| `avatar-dropdown.tsx` | Avatar menu (account, theme, sign-out). |

## Notifications
| File | Purpose |
|------|---------|
| `notification-bell.tsx` | Bell + unread count badge. |
| `notification-bell-hooks.ts` | `useNotificationBell(projectId, sdk)` — polls unread count every 30s. |
| `notification-dropdown.tsx` | Dropdown with the last 20 notifications. |
| `notification-item.tsx` | Single row. |
| `notification-types.ts` | `SEVERITY_COLORS`, `formatTime`, `isUnread`, `NotificationBellProps`. |

## Mobile
| File | Purpose |
|------|---------|
| `mobile-tab-bar.tsx` | Bottom tab bar. |
| `mobile-tab-bar-sheet.tsx` | Sheet that opens from the tab bar (e.g. switch project). |

## Conventions
- Role-based filtering: `sidebar-hooks.ts: getFilteredNavGroups(mode, role)` removes `adminOnly` items for non-admins.
- Notification bell hooks are best-effort: failures swallowed (silent) so they never break the chrome.

## Files
- 15 files (all under `src/components/layout/`)