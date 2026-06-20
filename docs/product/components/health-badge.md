# Component Spec — `HealthBadge`

> The "service is up / degraded / down" indicator used by Onboarding, Project Health, and
> service probes.

## 1. Purpose
The user sees the platform's health at a glance. The principle: **the health badge is the
first signal of trouble.**

## 2. Props
```ts
type HealthBadgeProps = {
  /** The health status. */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  /** The label override (default = the status capitalized). */
  label?: string;
  /** Optional reason (e.g. "DNS not configured"). */
  reason?: string;
  /** Optional Fix action (link or callback). */
  fixHref?: string;
};
```

## 3. Visual anatomy
```
[ ● Healthy     ]     ← green dot + label
[ ◐ Degraded    ]     ← yellow dot + label
[ ● Unhealthy   ]     ← red dot + label
[ ? Unknown     ]     ← gray dot + label
[ ● Unhealthy    Fix ] ← with the Fix action
```

## 4. States
- **Healthy**: green dot; label "Healthy."
- **Degraded**: yellow dot; label "Degraded"; optional reason.
- **Unhealthy**: red dot; label "Unhealthy"; optional reason + Fix action.
- **Unknown**: gray dot; label "Unknown" (e.g. service not yet probed).
- **Loading**: skeleton (the dot pulses gray).
- **With Fix**: a "Fix" link/button next to the badge.

## 5. Variants
- **Size**: `sm` (default for inline use), `md` (for the onboarding screen).
- **Theme**: dark/light; colors are theme-aware.

## 6. Interactions
- **Hover**: tooltip with the reason.
- **Click Fix**: navigate to the docs page or the relevant Settings tab.

## 7. Accessibility
- **Label**: `aria-label="Health: <status>"`.
- **Reason**: `aria-describedby` if a reason is present.
- **Color + icon**: green check, yellow triangle, red x, gray question — meaning is in
  the icon, not just the color.

## 8. Telemetry / events
- `health_badge.fix_clicked` → `{ userId, status, fixHref }`.

## 9. Cross-references
- **Screens**: `/onboarding`, Project Health, Service probes, Sidebar footer dot.

## 10. Acceptance criteria
- Renders dot + label + icon for each status.
- Optional reason tooltip on hover.
- Optional Fix action navigates to the right page.
- Color + icon carry meaning (not just color).
- Theme-aware.