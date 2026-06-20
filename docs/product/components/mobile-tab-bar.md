# Component Spec — `MobileTabBar`

> Bottom-anchored tab bar for the project dashboard on mobile. The sidebar's mobile
> replacement.

## 1. Purpose
The user navigates between the most-used sections of the project on mobile. The principle:
**the sidebar becomes a tab bar on small screens.**

## 2. Props
```ts
type MobileTabBarProps = {
  /** The current project. */
  project: Project;
  /** The current pathname (drives the active highlight). */
  pathname: string;
};
```

## 3. Visual anatomy
```
┌─────────────────────────────────────────────────────────┐
│                                  ⌘K (FAB)               │
├─────────────────────────────────────────────────────────┤
│ ▣ Projects │ ▣ Deployments ● │ ▣ Functions │ ▣ More     │
└─────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: 4 tabs (Projects · Deployments · Functions · More).
- **Active**: fire-red icon + label.
- **"More" opens a sheet** with the remaining 11 sections (Databases · Storage · Realtime ·
  Queues · Scheduler · Email · Domains · Monitoring · Logs · Settings · MCP).
- **Loading**: skeleton.

## 5. Variants
- **Theme**: dark (default), light.

## 6. Interactions
- **Tap tab** → navigate.
- **Tap "More"** → opens a bottom-sheet with the remaining sections.
- **Swipe up on the FAB** → opens the command palette.

## 7. Accessibility
- **Landmark**: `<nav aria-label="Primary">`.
- **Tab bar**: `role="tablist"`; each tab `role="tab"` with `aria-selected`.
- **FAB**: `aria-label="Open command palette"`.

## 8. Telemetry / events
- `mobile_tab_bar.tab_clicked` → `{ userId, section }`.
- `mobile_tab_bar.more_opened` → `{ userId }`.

## 9. Cross-references
- **Screens**: every per-project screen on mobile.
- **Service**: `docs/product/navigation.md` §"Project dashboard sidebar".

## 10. Acceptance criteria
- Renders on `md-` viewports; hidden on `lg:` (the sidebar takes over).
- 4 tabs: Projects · Deployments · Functions · More.
- "More" opens a bottom-sheet with the remaining 11 sections.
- The FAB opens the command palette.
- The active tab is highlighted.
- Keyboard / screen-reader navigation works.