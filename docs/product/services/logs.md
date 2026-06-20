# Service: Logs

Structured log streams + a viewer (filter, timeline, search, live tail). Typed streams
(application, function, deployment, email, system, audit) and a public-ish ingest endpoint for
customer apps.

## 1. Purpose
Every component writes structured logs to typed streams; the viewer surfaces them with timeline,
filter, and search. The public ingest (`POST /logs/ingest` with `X-API-Key`) lets customer apps
push their logs into the platform too.

## 2. Screens
- **Logs** (sidebar §12): streams list with counts + last-write.
- **Stream viewer**: timeline (histogram), filter (level, search, time range), live tail
  (auto-scroll, pauseable), structured fields.

## 3. Data model
- `LogStream` — id, projectId, name, type (`application|function|deployment|email|system|audit`),
  retentionDays.
- `LogEntry` — id, streamId, level (`debug|info|warn|error`), source, message, metadata
  (Record<string,unknown>), correlationId, timestamp.

## 4. API mapping
- Streams: `LOG-01..04`. Write (single + batch): `LOG-05/06`. Read (filter/timeline/stats):
  `LOG-07/08/09/10`. **Public ingest:** `LOG-11` (`POST /api/v1/logs/ingest`, X-API-Key, no JWT).
  ⚠ `LOG-08` collides with `LOG-03` (same path pattern, declaration order) — backend bug.

## 5. Realtime events
`logs.log.ingested` (sampled), `logs.pruned`, `logs.shipped`, `logs.ship_failed`,
`logs.quota_exceeded`. The viewer subscribes so new entries appear live.

## 6. Settings
- **Stream create:** name, type (preset selector), retentionDays (default 7).
- **Write:** level, message, metadata, optional `correlationId` (link related entries).
- **Shippers** (audit-confirmed): `webhook`, `minio` (gzipped JSONL). Configurable per
  project.

## 7. Automation
- **Retention sweep** runs on a schedule and prunes entries older than `retentionDays`.
- **Quota** is soft-enforced at ingest — exceeding it returns `overQuota: true` per entry, doesn't
  block (the audit confirms graceful behavior).
- **Shippers** are project-configurable; `logs.ship_failed` shows in the activity feed.

## 8. Dependencies
- **Hard:** Redis (sampled-event counter), the event bus.
- **Backend gaps** (from the audit):
  - `LOG-08` (`GET /streams/:streamName`) is **shadowed** by `LOG-03` (`GET /streams/:streamId`) —
    NestJS routes by declaration order. The UI must hit `LOG-03` and treat `streamName` as `streamId`,
    OR the backend must be fixed.
  - Ingest sampling (`logs.log.ingested`) is sampled ~1%; downstream subscribers may miss events.

## 9. Phase
**F11** — pending spec.
