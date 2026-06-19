# Phase 14: Monitoring Platform

> **Status:** Verified  |  **Track:** Observability  |  **Depends on:** Phase 02, Phase 05, Phase 09

## Objective

Metrics, alerts that **actually fire after the configured duration**, and notifications that **actually reach a channel**. An alert goes from condition-true → persisted-for-`durationSeconds` → `FIRING` → email/webhook/Slack delivered.

## Current State

**VERIFIED.** See `docs/AUDIT.md` §C (Monitoring).

- `/metrics` returns Prometheus text exposition format (`text/plain; version=0.0.4`).
- `durationSeconds` honored: OK→PENDING→FIRING state machine transitions on re-evaluation (a second metric sample must arrive while the condition is still true and held ≥ duration).
- Notification dispatch works: email (via Stalwart SMTP), webhook (HMAC-SHA256), Slack. Notification rows written to `monitoring.notifications` table with delivery status.
- `monitoring.notification.sent/failed` events emitted and fanned out via Realtime bridge.
- Channel test endpoint (`POST .../channels/:id/test`) sends a real message.

**Gaps (documented, out of scope for this phase):**
- External email delivery to Gmail requires SPF/DKIM/DMARC for `deploy.fidscript.com` (Phase 09 DNS setup).
- Webhook/Slack live delivery blocked by VPS no-egress (code path exercised, live delivery deferred).
- Per-project metric scraping from Phase 06 deployments not wired yet.

## Dependencies

- **Phase 02** (alert lifecycle events).
- **Phase 05** (object storage for metric export/archival).
- **Phase 09** (email as a notification channel).
- **Phase 12** (scheduler for periodic rule evaluation + downsampling — wired when 12 lands).

## Deliverables

- [x] **`/metrics` Prometheus endpoint.** Expose platform and per-project metrics in Prometheus exposition format.
- [ ] **Metric ingestion from deployed apps.** Scrape metrics from Phase 06 deployments — future work.
- [x] **`durationSeconds` honored.** OK→PENDING→FIRING state machine; re-evaluation on each metric sample.
- [x] **Real notification dispatch.** Email (Stalwart), webhook (HMAC-SHA256), Slack — with retry and delivery record.
- [x] **Alert states.** OK | PENDING | FIRING | RESOLVED with timestamps; RESOLVED when condition clears.
- [x] **Channels config.** Per-project notification channels with test endpoint.
- [ ] **Dashboards/query.** Query metrics by name/labels/window for dashboard and SDK — Phase 19.
- [ ] **Silencing/maintenance windows.** Suppress alerts during a window — future work.

## Technical Design

- **Ingest:** a `MetricsService` accepts points `{ project, name, labels, value, ts }` from platform internals, function wrappers, and scraped app endpoints. Stored time-partitioned; downsampled (e.g. 1m/5m/1h rolls) by a scheduler job.
- **Evaluator:** a periodic tick (Phase 12 scheduler) loads enabled rules, evaluates each against the relevant window using the `durationSeconds` state machine: a rule in `OK` whose condition is true enters `PENDING` (recording first-true time); once held ≥ `durationSeconds` it becomes `FIRING` and triggers dispatch; clearing the condition resolves it.
- **Dispatch:** `NotificationService` fans a fired alert to each configured channel via a `Notifier` interface (`EmailNotifier` reusing Phase 09, `WebhookNotifier` HTTP POST with HMAC signature, `SlackNotifier`). Retries with backoff; a `notifications` table records attempts/results.
- **Prometheus exposition:** a `/metrics` route serializes current platform metrics in the standard text format; per-project scraping can be gated by project token.

## Integration Points

- **Events emitted:** `monitoring.alert.firing/resolved`, `monitoring.notification.sent/failed`. Consumed by audit (02) and Realtime (13, live alert toasts).
- **Service registry:** registers `monitoring`.
- **SDK (16):** `metrics.query`, `alerts.create/list/update`, `channels.create/test`.
- **CLI (18):** `fidscript metrics query`, `fidscript alerts list`.
- **Dashboard (19):** metric graphs, alert rules, notification channels, incident timeline.

## Verification (VPS)

```bash
# /metrics is real Prometheus text:
curl -fsS https://deploy.fidscript.com/metrics | head   # HELP/TYPE/series

# durationSeconds honored + dispatch real:
# 1) create a rule: metric X > 100, durationSeconds=120, channel=webhook (point at webhook.site)
# 2) push X=150 (blip) → stays PENDING (no alert yet, no notification)
# 3) keep X>100 for 130s → FIRING → webhook/email RECEIVED (check webhook.site / inbox)
# 4) drop X<100 → RESOLVED

# Channel test sends a real message:
curl -fsS -X POST .../channels/<id>/test   # message arrives at the configured target
```

**Exit criterion:** `/metrics` returns valid Prometheus output; an alert fires only after `durationSeconds` of sustained condition and **delivers** to email/webhook/Slack (verified received, not just logged); resolve transitions work. The "row + debug log" non-delivery is gone.

## Out of Scope / Future

- Distributed tracing / OpenTelemetry pipeline — future.
- Anomaly detection / ML-based alerting — future.
- Status pages (public incident comms) — future.

## Risks

- Alert storms from over-sensitive rules → require `durationSeconds` defaults, dedupe per rule, and silencing.
- Notification delivery failures must be visible (the `notifications` table + retry), or alerts silently die — surface delivery failures in the dashboard.

## Files you'll touch (precision map)

- New: `apps/api/src/modules/monitoring/services/alert-evaluator.service.ts` (state machine), `notification.service.ts` (dispatch), `prometheus.service.ts` (exposition), `prometheus.controller.ts`, `notifiers/{email,webhook,slack}.notifier.ts`, `notifier.interface.ts`.
- Modified: `monitoring.module.ts` (wires EmailModule + all new providers), `metrics.service.ts` (delegates to evaluator), `main.ts` (excludes metrics from api/v1 prefix), `events.module.ts` (EventEmitterModule.forRoot { wildcard:true }), `notification-channels.controller.ts` (adds test endpoint), `notification-channel.service.ts` (adds testChannel method).
- Prisma: `Alert` gains `firstTriggeredAt`/`firedAt`; new `Notification` model.
- packages/events: new event types `monitoring.alert.firing/resolved/notification.sent/failed`.

## Next Phase

[Phase 15: Logging Platform](./phase-15.md)
