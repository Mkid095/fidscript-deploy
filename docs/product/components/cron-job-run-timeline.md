# Component Spec — `CronJobRunTimeline`

> Per-run history for the CronJob detail → Runs tab. Status badge + duration + error +
> click → modal with full output.

## 1. Purpose
The user sees the run history of a cron job. The principle: **every run is a story;
the timeline is the log.**

## 2. Props
```ts
type CronJobRunTimelineProps = {
  runs: Array<{
    id: string;
    status: 'running' | 'succeeded' | 'failed';
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
  onRunClick: (runId: string) => void;
  loading?: boolean;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────────────┐
│ 2m ago    ●  succeeded   duration 1.2s                    │
│ 12m ago   ●  succeeded   duration 0.8s                    │
│ 22m ago   ⊘  failed      duration 0.5s   err: timeout     │
│ 32m ago   ●  succeeded   duration 1.1s                    │
└────────────────────────────────────────────────────────────┘
   ↑ click row → modal with full payload + response
```

## 4. States (per row)
- **running**: spinner; duration ticks live.
- **succeeded**: green check.
- **failed**: red x + error message.
- **Loading**: skeleton.

## 5. Variants
- **Density**: comfortable (default); compact.

## 6. Interactions
- **Click row**: opens the run-detail modal.
- **Realtime**: new runs animate in.

## 7. Accessibility
- **List**: `role="list"`; each row `role="listitem"`.
- **Live region**: `aria-live="polite"`; "New run" announced.

## 8. Telemetry / events
- `cron_job_run_timeline.run_clicked` → `{ runId }`.

## 9. Cross-references
- **Screens**: CronJob detail → Runs.

## 10. Acceptance criteria
- Renders run history.
- Click row → modal with full payload + response.
- Realtime updates animate in.
- Live region announces changes.
- Theme-aware.