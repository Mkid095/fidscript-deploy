# Component Spec — `StatusBadge`

> Color-coded status pill used by every entity list (Deployment, Function, Database,
> Queue, Cron, Email, Monitoring). Carries the meaning via label + icon + color (never
> color alone).

## 1. Purpose
The user sees an entity's state at a glance. The principle: **color is never the only
carrier of meaning.**

## 2. Props
```ts
type StatusBadgeProps = {
  /** The status key. */
  status: string;
  /** Optional icon override (default = the status's icon). */
  icon?: HugeIcon;
  /** Size. */
  size?: 'sm' | 'md';
};
```

## 3. Visual anatomy
```
[ ● SUCCEEDED ]    ← green dot + green label + check icon
[ ⊘ FAILED     ]    ← red dot + red label + x icon
[ ◐ BUILDING   ]    ← yellow dot + yellow label + spinner icon
```

## 4. States
The badge supports any status; the canonical mappings (driven by a single constant per
service):

| Service | Statuses |
|---|---|
| Deployment | PENDING · QUEUED · BUILDING · DEPLOYING · SUCCESS · FAILED · STOPPED · BLOCKED · ROLLED_BACK |
| Function | created · building · active · error |
| Database | provisioning · ready · unhealthy · unknown |
| Queue | active · paused |
| Cron | enabled · disabled |
| Email | PENDING · VERIFIED · ACTIVE · FAILED |
| Alert | pending · firing · resolved |

- **Idle**: pill with dot + label + icon.
- **Hover**: subtle tooltip with the absolute timestamp (if available via context).
- **Loading**: not applicable (the badge is a leaf component).
- **Empty**: not applicable.
- **Disabled**: not applicable.

## 5. Variants
- **Size**: `sm` (default for list rows), `md` (for detail headers).
- **Theme**: dark (default), light; colors are theme-aware.

## 6. Interactions
- **Click** (optional): navigate to the resource.
- **Hover**: tooltip with the timestamp.

## 7. Accessibility
- **Label**: `aria-label="Status: <status>"`.
- **Color**: the label + icon carry meaning, not just color.
- **Tooltip**: `role="tooltip"`.

## 8. Telemetry / events
- (none — the badge is a leaf).

## 9. Cross-references
- **Screens**: every entity list + detail (Deployment, Function, Database, Queue, Cron,
  Email, Monitoring).

## 10. Acceptance criteria
- The badge renders dot + label + icon for every status.
- Color is theme-aware (dark/light).
- The label + icon carry meaning (not just color).
- The optional tooltip works on hover.