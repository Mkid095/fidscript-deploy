# Component Spec — `EntityCard`

> Parameterized card row for every entity list. Used by Project, Deployment, Function,
> Database, Bucket, Queue, CronJob, EmailDomain, Mailbox, Alert, Channel, Stream, etc.

## 1. Purpose
The user scans a list of cards, each summarizing one entity. The principle: **the card is
the entity's billboard; one glance = status + key fields + action.**

## 2. Props
```ts
type EntityCardProps<T> = {
  /** The entity. */
  entity: T;
  /** The renderer for the entity's name. */
  name: (entity: T) => string;
  /** The renderer for the badge row (status, type, etc.). */
  badges?: (entity: T) => ReactNode;
  /** The renderer for the secondary metadata row. */
  meta?: (entity: T) => ReactNode;
  /** The renderer for the action kebab. */
  actions?: (entity: T) => ReactNode;
  /** The href (if click navigates). */
  href?: string;
  /** The selection state (if multi-select). */
  selected?: boolean;
  /** The onSelect callback (if multi-select). */
  onSelect?: (selected: boolean) => void;
};
```

## 3. Visual anatomy
```
┌─────────────────────────────────────────────────────────────┐
│ ● my-app      [FRONTEND] [ACTIVE]      2m ago · last deploy│
│  ⌐ 4 members ⌐ 12 services                                  │
│                                                  [kebab]    │
└─────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: full card; name + badges + meta + kebab.
- **Hover**: subtle elevation + the kebab becomes more prominent.
- **Selected**: card has a fire-red border (when multi-select is active).
- **Loading**: skeleton.
- **Empty**: not applicable.
- **Disabled** (grey): not applicable.
- **Error**: red border + error reason.
- **Real-time update**: the card pulses briefly when the entity changes via realtime.

## 5. Variants
- **Density**: comfortable (default); compact (for dense lists).
- **With selection**: adds a checkbox.
- **Theme**: dark/light.

## 6. Interactions
- **Click card body** → navigate to `href` (if present).
- **Click kebab** → open action menu.
- **Click checkbox** → toggle selection (if multi-select).
- **Keyboard**: Tab to card; Enter activates; arrow keys navigate within the list.

## 7. Accessibility
- **Card**: `role="article"` (or `role="button"` if `href` is present).
- **Link semantics**: if `href`, the card is a link with `aria-label="<name>"`.
- **Selection**: checkbox with `aria-checked`.
- **Live region**: `aria-live="polite"` for realtime updates.

## 8. Telemetry / events
- `entity_card.clicked` → `{ userId, entityType, entityId }`.
- `entity_card.action_clicked` → `{ userId, entityType, entityId, action }`.

## 9. Cross-references
- **Screens**: every entity list (per `docs/product/screens/index.md`).

## 10. Acceptance criteria
- The card renders name + badges + meta + kebab for any entity shape.
- Click navigates (if `href`).
- Realtime updates pulse briefly.
- Multi-select mode shows a checkbox.
- Keyboard navigation works.
- Live region announces realtime updates.
- Theme-aware.