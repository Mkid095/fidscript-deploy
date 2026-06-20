# Component Spec — `Toggle`

> On/off switch. Used by Settings (isPublic, isPrivate, isVerified), Monitoring (channel
> enabled), and per-section toggles.

## 1. Purpose
The user flips a setting on or off. The principle: **a toggle is a promise — what
changes when you flip it is explicit.**

## 2. Props
```ts
type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
};
```

## 3. Visual anatomy
```
[ ●━━━━ ] Require SSL
            Encrypt traffic between the dashboard and the database.
```

## 4. States
- **Off**: switch to the left; gray track.
- **On**: switch to the right; fire-red track + thumb.
- **Hover**: subtle thumb shadow.
- **Focused**: fire-red ring.
- **Disabled**: greyed; not focusable; tooltip explains why.
- **Loading**: skeleton.

## 5. Variants
- **Size**: sm (default), md.
- **Theme**: dark/light.

## 6. Interactions
- **Click**: toggle.
- **Space**: toggle (keyboard).
- **Enter**: toggle (keyboard).

## 7. Accessibility
- **Role**: `role="switch"` with `aria-checked`.
- **Label**: linked via `htmlFor`/`id`.
- **Disabled**: `aria-disabled="true"` + tooltip.

## 8. Telemetry / events
- `toggle.changed` → `{ fieldId, from, to }`.

## 9. Cross-references
- **Screens**: Settings (isPublic, SSL), Monitoring (channel enabled), Cron (enabled).

## 10. Acceptance criteria
- Toggle works on click + keyboard (Space/Enter).
- Visual state is clear (left = off, right = on).
- Disabled state shows a tooltip.
- Keyboard navigation works.
- Theme-aware.