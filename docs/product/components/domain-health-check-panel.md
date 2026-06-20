# Component Spec — `DomainHealthCheckPanel`

> DNS / HTTP / SSL rows for the Domain detail → Health tab and the Onboarding screen.

## 1. Purpose
The user sees the domain's health in one glance. The principle: **a domain is a contract
between the user's DNS and the platform; the panel shows both sides.**

## 2. Props
```ts
type DomainHealthCheckPanelProps = {
  /** The recent health checks (or live probes). */
  checks: Array<{
    checkedAt: string;
    dnsOk: boolean;
    routingOk: boolean;
    sslOk: boolean;
    responseTimeMs: number | null;
    sslExpiresInDays: number | null;
    status: 'ok' | 'degraded' | 'broken';
    errorMessage: string | null;
  }>;
  /** Optional live probe (for onboarding). */
  liveProbe?: () => Promise<ProbeResult>;
  /** Loading state. */
  loading?: boolean;
};
```

## 3. Visual anatomy
```
DNS        ●  OK           verified 2d ago
Routing    ●  OK           verified 2d ago
SSL        ●  OK           cert expires in 87 days

Recent checks (last 10):
┌────────────────────────────────────────────────────────────┐
│ 2m ago   ●  ok   123ms   ssl 87d                          │
│ 12m ago  ●  ok   118ms   ssl 87d                          │
│ 22m ago  ◐  degraded  200ms   ssl 30d (renewal in flight)│
└────────────────────────────────────────────────────────────┘
```

## 4. States (per row)
- **OK**: green dot; "OK" + timestamp.
- **Degraded**: yellow dot; reason.
- **Broken**: red dot; reason + Fix action.
- **Unknown**: gray dot; "Probing…"

## 5. Variants
- **Onboarding**: live probe (per-row spinner).
- **Domain detail**: historical (last 10 checks).

## 6. Interactions
- **Click row**: expand technical detail.
- **Live probe** (onboarding): re-runs the probe on click.

## 7. Accessibility
- **Rows**: `role="list"`; each row `role="listitem"` with `aria-label="<check>: <status>"`.

## 8. Telemetry / events
- `domain_health_check_panel.probe_clicked` → `{ domain }`.

## 9. Cross-references
- **Screens**: Domain detail → Health, Onboarding.

## 10. Acceptance criteria
- Renders DNS / Routing / SSL rows.
- Recent checks table is sortable.
- Live probe runs on click (onboarding).
- Theme-aware.