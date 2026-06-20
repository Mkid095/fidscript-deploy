# Component Spec — `Sidebar`

> Per-project sidebar (14 items per `docs/product/navigation.md`). Fixed left, 240px
> (collapsible to 64px icons). Drawer on mobile.

## 1. Purpose
The user navigates between the 14 sections of the active project. The principle: **the
sidebar is the project's map; the user always knows where they are.**

## 2. Props
```ts
type SidebarProps = {
  /** The current project (drives the section URLs). */
  project: Project;
  /** The current user's role in the project (drives the per-role chrome). */
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  /** The current pathname (drives the active highlight). */
  pathname: string;
  /** The project health (drives the footer dot). */
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
};
```

## 3. Visual anatomy
```
┌─────────────────┐
│ ▣ Projects      │  ← back to workspace
├─────────────────┤
│ ▣ Deployments ● │  ← active
│ ▣ Functions     │
│ ▣ Databases     │
│ ▣ Storage       │
│ ▣ Realtime      │
│ ▣ Queues        │
│ ▣ Scheduler     │
│ ▣ Email         │
│ ▣ Domains       │
│ ▣ Monitoring    │
│ ▣ Logs          │
│ ▣ Settings      │
│ ▣ MCP           │
├─────────────────┤
│ ● healthy       │  ← footer health dot
└─────────────────┘
```

## 4. States
- **Idle**: full sidebar; active section highlighted.
- **Collapsed** (icons only, 64px): same items, just icons; tooltips on hover.
- **Mobile** (drawer): same items in a bottom-anchored drawer; closes on navigation.
- **Loading**: skeleton (the items appear after `PROJ-03` resolves).
- **Empty**: not applicable (the sidebar always has 14 items).
- **Permission greys**: Settings/MCP keys are greyed for developer/viewer; tooltip
  "requires admin/owner."
- **Health footer**:
  - *Healthy*: green dot.
  - *Degraded*: yellow dot.
  - *Unhealthy*: red dot.
  - *Unknown*: gray dot.

## 5. Variants
- **Density**: comfortable (default); compact (P1 follow-up).
- **Theme**: dark (default), light.

## 6. Interactions
- **Click item** → navigate client-side to `…/<item>`.
- **Click "Projects"** → navigate to `/dashboard`.
- **Collapse toggle** (top-right of sidebar): toggles expanded ↔ icons.
- **Keyboard**: Tab navigates items; Enter activates; arrow keys navigate.
- **Persistence**: collapse state in `localStorage` `fidscript.sidebarCollapsed`.

## 7. Accessibility
- **Landmark**: `<aside aria-label="Project navigation">`.
- **Nav**: `<nav>` inside the aside.
- **List**: `<ul role="list">`; each item is `<li>` with `<a>`.
- **Active**: `aria-current="page"` on the active item.
- **Greysed**: `aria-disabled="true"` on permission-gated items; tooltip explains.
- **Focus**: focus ring visible on every item.
- **Skip link**: "Skip to content" link before the sidebar (visible on focus).

## 8. Telemetry / events
- `sidebar.item_clicked` → `{ userId, projectId, section, role }`.
- `sidebar.collapsed` / `sidebar.expanded` → `{ userId }`.

## 9. Cross-references
- **Screens**: every per-project screen (via the F05 shell).
- **Service**: `docs/product/navigation.md` §"Project dashboard sidebar".
- **Journey**: every persona's per-project navigation.

## 10. Acceptance criteria
- The sidebar shows 14 items in the documented order, plus the "Projects" back-link.
- The active section is highlighted (fire-red accent + bold + `aria-current="page"`).
- Settings + MCP keys are greys for developer/viewer with a tooltip.
- The collapse toggle persists in `localStorage`.
- The footer health dot reflects `SVC-03`; turns red on degradation.
- Mobile: the sidebar becomes a drawer; closes on navigation.
- Keyboard navigation works end-to-end.
- Focus ring is visible on every item.