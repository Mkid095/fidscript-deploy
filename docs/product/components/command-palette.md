# Component Spec — `CommandPalette`

> Global ⌘K / Ctrl+K launcher. Jump to any project/screen, run frequent actions.
> Permission-aware; entries grey when the user lacks the role.

## 1. Purpose
The user can do anything from one keystroke. The principle: **⌘K is the dashboard's "go
anywhere, do anything" — the user learns it once.**

## 2. Props
```ts
type CommandPaletteProps = {
  /** All available commands (project-aware + global). */
  commands: Command[];
  /** Close callback. */
  onClose: () => void;
};

type Command = {
  id: string;
  group: 'navigate' | 'create' | 'run' | 'invite' | 'settings';
  label: string;
  hint?: string;
  icon: HugeIcon;
  shortcut?: string; // e.g. 'g d' for "Go to Deployments"
  requires?: { role: 'admin' | 'owner' }[];
  action: () => void;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────┐
│ [Type a command or search...]                [Esc]│
├────────────────────────────────────────────────────┤
│ Navigate                                           │
│   Go to Deployments                         g d    │
│   Go to Functions                           g f    │
│   ...                                              │
│ Create                                             │
│   Create new deployment                            │
│   Create new function                              │
│   ...                                              │
│ Run                                                │
│   Deploy this branch                               │
│   Roll back to last success                        │
│   ...                                              │
└────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: empty input; the recent + suggested commands show.
- **Searching**: input focused; results filter live.
- **Empty**: "No commands match `<query>`."
- **Greysed**: permission-gated entries are visible but greyed with a tooltip
  ("requires admin"); not selectable.
- **Loading**: skeleton (rare; commands are loaded with the shell).

## 5. Variants
- **Theme**: dark (default), light.
- **Mobile**: bottom-sheet style on `md-`.

## 6. Interactions
- **Keyboard**:
  - ⌘K / Ctrl+K → open.
  - ↑/↓ → navigate the results.
  - Enter → run the highlighted command.
  - Esc → close.
  - `g d` / `g f` / `g b` → jump to Deployments / Functions / Databases.
- **Mouse**: click a result to run.
- **Search**: live filter; debounced 100ms.

## 7. Accessibility
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title.
- **List**: `role="listbox"`; each row `role="option"` with `aria-selected`.
- **Search**: `role="searchbox"`, `aria-controls` pointing to the list.
- **Live region**: `aria-live="polite"` on the result count.
- **Focus trap**: focus is trapped; initial focus on the search input.

## 8. Telemetry / events
- `command_palette.opened` → `{ userId, shortcut }`.
- `command_palette.searched` → `{ userId, query }`.
- `command_palette.command_run` → `{ userId, commandId, group }`.

## 9. Cross-references
- **Screens**: every authenticated screen.
- **Service**: `docs/product/navigation.md` §"Command palette (⌘K) — action inventory".
- **Journey**: every persona's "fast path."

## 10. Acceptance criteria
- Opens via ⌘K / Ctrl+K.
- Lists commands grouped by intent (navigate / create / run / invite / settings).
- Search filters live.
- Permission-gated entries are greyed with a tooltip.
- ↑/↓ navigate; Enter runs; Esc closes.
- The shortcut hints (`g d`, `g f`, `g b`) work from the empty input.
- Closing returns focus to the previously focused element.
- Reduced-motion preference is respected.