# Service: Monitoring

Metrics + alert rules + notification channels. Background evaluator fires notifications when rules
trip; alerts have a full ack/resolve lifecycle.

## 1. Purpose
Know when something breaks **before** a user tells you. Default rules per project (deploy success
rate, function error rate, queue depth, email bounce rate, domain SSL expiry) — surfaced via the
channels the admin configures.

## 2. Screens
- **Monitoring** (sidebar §11): tabs *Metrics / Alerts / Channels*.
- **Alert detail**: timeline, rule, status, ack/resolve actions.
- **Public scrape** at `GET /metrics` (Prometheus exposition) for the platform operator's own
  Grafana/Prometheus stack.

## 3. Data model
- `Metric` — id, projectId, name (label), value, labels (Record<string,string>), timestamp.
- `AlertRule` — id, projectId, name, metric, condition (`above|below|equals`), threshold,
  durationSeconds, severity, channels (string[] of channelIds), enabled.
- `Alert` — id, projectId, ruleId, status (`firing|resolved|pending`), value, severity,
  startedAt, resolvedAt, acknowledgedAt.
- `NotificationChannel` — id, projectId, name, type (`email|slack|webhook|pagerduty`), config
  (Record<string,string>; per-type fields). Slack/PagerDuty are aspirational per the audit.

## 4. API mapping
- Metrics (record/list/summary/stats): `MON-01..04`. Alert rules (CRUD): `MON-05..09`. Alerts
  (list/get/ack/resolve): `MON-10..13`. Channels (CRUD + test): `MON-14..19`. Public Prometheus:
  `MON-20` (`GET /metrics`, **outside** `/api/v1`).

## 5. Realtime events
`monitoring.alert.firing`, `monitoring.alert.resolved`, `monitoring.notification.sent`,
`monitoring.notification.failed` — the Alerts tab subscribes so firings appear live.

## 6. Settings
- **Rule:** name, metric (selector — the metric must be recorded), condition, threshold,
  durationSeconds (must hold for N seconds before firing), severity, channels.
- **Channel:** name, type, config (per type — e.g. webhook URL + headers, email to, slack
  webhook URL).
- **Public scrape** is read-only; the operator's scraper configures Prometheus/Grafana.

## 7. Automation
- **Evaluator** runs in the background; on threshold breach + duration → fires an alert →
  resolves `pending` → `firing` → sends to all `channels` for the rule.
- **Test channel** (`MON-19`) sends a synthetic message to verify the channel config.
- **Default rules per project** are auto-created with sensible thresholds (the spec
  for F11 will define them).

## 8. Dependencies
- **Hard:** `AlertEvaluatorService` (background), the event bus.
- **Soft:** Prometheus (only if the operator wants to scrape — `MON-20` is independent).
- **Backend gaps** (from the audit):
  - `slack` and `pagerduty` channel types are declared but unimplemented (the audit confirms
    `MON-19 test` will fail for these). UI must grey them with "not yet available."
  - `monitoring.controller.ts` is dead code (4-line comment file) — do not import.

## 9. Phase
**F11** — pending spec.
