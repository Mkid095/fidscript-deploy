# Component Spec — `ProjectSwitcher`

> Modal overlay triggered from the header's project switcher. Search + role badges +
> "+ New project" footer. Selects a project and navigates client-side.

## 1. Purpose
The user switches between projects without leaving the dashboard. The principle: **switching
projects is one click + one keystroke.**

## 2. Props
```ts
type ProjectSwitcherProps = {
  /** All projects the user is a member of. */
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    role: 'owner' | 'admin' | 'developer' | 'viewer';
    lastActivityAt: string; // ISO
  }>;
  /** The current project ID (highlighted). */
  currentProjectId: string | null;
  /** Close callback. */
  onClose: () => void;
  /** Select callback (navigates to /dashboard/projects/:id). */
  onSelect: (projectId: string) => void;
  /** New-project callback (opens the create-project modal). */
  onNewProject: () => void;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────┐
│ Switch project                                [X] │
├────────────────────────────────────────────────────┤
│ [Search projects...]                                │
│                                                     │
│ Recent                                              │
│ ● my-app      [owner]   last activity 2m ago       │
│   acme-www    [admin]   last activity 1h ago       │
│                                                     │
│ All projects                                        │
│   analytics    [viewer]  last activity 12h ago     │
│   ...                                              │
│                                                     │
├────────────────────────────────────────────────────┤
│ + New project                                       │
└────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: search input + list of projects (Recent at top, then All).
- **Searching**: input focused; list filters live.
- **Empty** (no projects): the list shows "You have no projects yet." + "+ New project"
  CTA as the primary action.
- **No search results**: "No projects match `<query>`."
- **Highlighted**: current project has a fire-red dot + bold.
- **Role badge**: pill (owner red · admin orange · developer blue · viewer gray).
- **Loading**: skeleton list (10 rows).

## 5. Variants
- **Single project**: only the current project + "+ New project" CTA.
- **No projects**: full empty state.

## 6. Interactions
- **Click project** → onSelect → navigates to `/dashboard/projects/:id`.
- **+ New project** → onNewProject → opens create-project modal.
- **Keyboard**: ↑/↓ navigates the list; Enter selects; Esc closes.
- **Search**: focuses on open; clears on Esc.

## 7. Accessibility
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title.
- **List**: `role="listbox"`; each row `role="option"` with `aria-selected` for the current.
- **Search**: `role="searchbox"`, `aria-controls` pointing to the list.
- **Focus trap**: focus is trapped inside the modal; initial focus on the search input.
- **Live region**: `aria-live="polite"` on the list count.

## 8. Telemetry / events
- `project_switcher.opened` → `{ userId, projectCount }`.
- `project_switcher.searched` → `{ userId, query }`.
- `project_switcher.selected` → `{ userId, fromProjectId, toProjectId }`.
- `project_switcher.new_project_clicked` → `{ userId }`.

## 9. Cross-references
- **Screens**: every authenticated screen (via the F05 shell).
- **Service**: `docs/product/services/projects.md`.
- **Journey**: every persona's project-switching flow.

## 10. Acceptance criteria
- Opens from the header's project switcher click.
- Lists the user's projects with role badges + last activity.
- Search filters live.
- Recent projects (top 5) appear above the full list.
- Click navigates client-side (no full reload).
- "+ New project" opens the create-project modal.
- Esc / [X] close.
- Keyboard navigation works (↑/↓/Enter/Esc).
- Focus is trapped; initial focus on the search input.