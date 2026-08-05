# Functions Components

UI for the per-function operator console: list, header, tabs (code / settings / versions / logs / invoke), code editor, settings, and modals.

## Sub-areas

### Header & Status
| File | Purpose |
|------|---------|
| `function-header.tsx` | Title, runtime badge, status, action buttons. |
| `function-status-badge.tsx` | Status pill (active / building / error). |
| `function-tabs.tsx` | Tab strip (Code / Settings / Versions / Logs / Invoke). |

### List
| File | Purpose |
|------|---------|
| `function-list.tsx` | Grid of function cards. |
| `function-card.tsx` | Single function card. |

### Code Editor
| File | Purpose |
|------|---------|
| `function-code.tsx` | Container. |
| `function-code-header.tsx` | Runtime selector + deploy button. |
| `function-code-toolbar.tsx` | Reset, save draft, deploy. |
| `function-code-editor.tsx` | Monaco wrapper. |
| `function-code-metrics.tsx` | Build / deploy metrics. |
| `function-code-constants.ts` | `RUNTIME_LANG`, `STARTER_CODE`, `getStarterCode()`. |
| `function-code-state.ts` | `useFunctionCodeState` — load / edit / save draft / reset. |

### Settings
| File | Purpose |
|------|---------|
| `function-settings.tsx` | Env vars + delete form. |
| `function-settings-hooks.ts` | `useFunctionSettings` — add/remove/save env vars, delete. |
| `function-settings-types.ts` | Props + `RUNTIME_LABELS`. |
| `function-env-vars.tsx` | Env var key/value rows. |

### Versions
| File | Purpose |
|------|---------|
| `function-versions.tsx` | Versions container. |
| `function-versions-list.tsx` | List of versions. |
| `function-version-row.tsx` | One row. |
| `function-versions-diff-view.tsx` | Diff between two versions. |
| `diff-view.tsx` | Generic diff renderer. |

### Logs & Invoke
| File | Purpose |
|------|---------|
| `function-logs.tsx` | Live + history logs. |
| `function-invoke.tsx` | Test invoker. |

### Modals
| File | Purpose |
|------|---------|
| `create-function-modal.tsx` | New-function flow. |

### Misc
| File | Purpose |
|------|---------|
| `index.ts` | Barrel export. |

## Conventions
- Hooks (`*-hooks.ts`, `*-state.ts`, `*-handlers.ts`) own SDK calls + state.
- Components import hooks and render only.
- Monorepo barrel via `index.ts`.

## Files
- 25 files (all under `src/components/functions/`)