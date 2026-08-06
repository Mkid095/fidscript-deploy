# Components

Reusable UI components for the FIDScript dashboard. Every component is **pure
rendering + event emission**: no SDK calls, no API calls, no validation, no
business logic. Data fetching lives in `.ts` hooks (see `use-*.ts` siblings or
`app/(app)/**/use-*.ts`).

## Organization

Each subdirectory is one feature surface, with its own README that documents
the components, props, and composition patterns:

| Directory       | Owns                                               |
| --------------- | -------------------------------------------------- |
| `auth/`         | Login/signup/magic-code UI primitives              |
| `database/`     | SQL editor, connection panel, backups UI           |
| `deployments/`  | Deployment header, log viewer, terminal, timeline  |
| `docs/`         | Public docs sidebar + copy-page UI                 |
| `functions/`    | Function code editor, metrics, invoke modal        |
| `landing/`      | Public-site (marketing) components                 |
| `layout/`       | Sidebar, topbar, project switcher, shells          |
| `projects/`     | Project list/detail UI primitives                  |
| `queues/`       | Queue messages table, stats bar, modals            |
| `storage/`      | Storage buckets UI, banner                         |
| `theme/`        | Theme provider + dark/light toggle                 |
| `ui/`           | Generic primitives (Button, Card, Modal, etc.)     |

Top-level files (`auth-guard.tsx`, `toast-provider.tsx`) are app-shell providers
lived here because they wrap the whole tree.

## Conventions

- **No SDK or fetch calls inside components.** Components receive data via
  props and emit user intents via callbacks. Data hooks (`.ts` files) own
  the side effects.
- **No validation, no business logic.** UI components never validate forms,
  transform API responses, or decide routing.
- **Hugeicons only.** No `@iconify/react`. See
  `apps/dashboard/src/components/ui/` for icon primitives.
- **No hardcoded color tokens** for status (success/warn/error/info). Use the
  shared status-color tokens defined in `theme/` (or CSS variables) so custom
  themes override correctly.
- **150-line file limit.** If a component grows beyond 150 lines, split into
  sub-components + a `.ts` types/hooks file (see `queue-detail/*` for the
  canonical split).

## Adding a new component

1. Create the file under the right subdirectory (or add a new subdir + README).
2. Keep the component to props-in / events-out.
3. If you need data fetching, create a sibling `use-<name>.ts` hook and call it
   from the page, not the component.
4. Update the subdirectory's README with the new component + prop table.
