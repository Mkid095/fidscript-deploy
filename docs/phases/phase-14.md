# Phase 14: Monitoring Platform

> **Status:** Planned  |  **Track:** Observability  |  **Depends on:** Phase 02, Phase 05, Phase 09

## Objective

Metrics, alerts that **actually fire after the configured duration**, and notifications that **actually reach a channel**. An alert goes from condition-true → persisted-for-`durationSeconds` → `FIRING` → email/webhook/Slack delivered. Today a firing alert produces only a database row and a debug log.

## Current State

**PARTIAL.** See `docs/AUDIT.md` §C (Monitoring). Specific defects:

- Real metric rows + alert rule evaluation exist — but **no `/metrics` Prometheus endpoint**.
- `durationSeconds` is **ignored** (alerts fire instantly on the first true sample).
- **Notification channels are never dispatched** — a firing alert writes a row and a debug log, nothing else.

## Dependencies

- **Phase 02** (alert lifecycle events).
- **Phase 05** (object storage for metric export/archival).
- **Phase 09** (email as a notification channel).
- **Phase 12** (scheduler for periodic rule evaluation + downsampling — wired when 12 lands).

## Deliverables

- [ ] **`/metrics` Prometheus endpoint.** Expose platform and per-project metrics in Prometheus exposition format, scrapeable by Prometheus (or the platform's own scraper). Metric families: request rate/latency, deployment health, queue depth, function invocations/errors, DB/storage usage.
- [ ] **Metric ingestion from deployed apps.** Scrape metrics from Phase 06 deployments (a `/metrics` convention) and persist time-series; downsample for long retention.
- [ ] **`durationSeconds` honored.** A rule only transitions `OK → PENDING → FIRING` when its condition has held continuously for `durationSeconds`. Instant blips no longer fire alerts.
- [ ] **Real notification dispatch.** On `FIRING`, dispatch to the project's configured channels: **email** (Phase 09), **webhook** (HTTP POST), **Slack/incoming-webhook**. Real sends, with retry and a delivery record.
- [ ] **Alert states.** `OK | PENDING | FIRING | RESOLVED` with timestamps; `RESOLVED` when the condition clears (after an optional `resolveDuration`).
- [ ] **Channels config.** Per-project notification channels (create/test/delete; test sends a verification message).
- [ ] **Dashboards/query.** Query metrics by name/labels/window for the dashboard and SDK; threshold annotations.
- [ ] **Silencing/maintenance windows.** Suppress alerts during a window.

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

## Next Phase

[Phase 15: Logging Platform](./phase-15.md)
