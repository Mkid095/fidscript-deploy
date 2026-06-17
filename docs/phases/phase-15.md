# Phase 15: Logging Platform

> **Status:** Planned  |  **Track:** Observability  |  **Depends on:** Phase 02, Phase 05, Phase 12

## Objective

Logs that **ingest, query with filters, age out per retention, and ship to an external sink.** The query path already works well; this phase adds the missing half — **enforced retention** and **log shipping** — so logs don't grow unbounded and can feed external observability stacks.

## Current State

**PARTIAL.** See `docs/AUDIT.md` §C (Logging). Specific defects:

- Real ingestion + genuinely good cursor-paginated query — the read path is solid.
- **`retentionDays` is never enforced**; there is **no retention sweep** → logs grow forever.
- **No log shipping** to external sinks.

## Dependencies

- **Phase 02** (a `logs.ingested` event; structured ingest pipeline).
- **Phase 05** (object storage as a ship/export target).
- **Phase 12** (scheduler runs the retention sweep + batched shipper flush).

## Deliverables

- [ ] **Retention enforcement.** A scheduled sweep (Phase 12) deletes logs older than the project's `retentionDays`. Bounded, batched deletes; runs on a cadence.
- [ ] **Log shipping.** Ship project logs to an external sink via a pluggable `LogShipper` interface: **webhook** (batched HTTP POST), **object storage** (batched gzipped files to Phase 05), **Loki/HTTP-basic** (future-ready). Per-project enable + config.
- [ ] **Structured ingest.** Accept structured JSON logs from deployed apps (Phase 06), the platform, functions (10), and queues (11): `{ level, message, source, ts, fields, correlationId, projectId }`.
- [ ] **Query with filters.** Keep the good cursor pagination; add filters: level, time range, source, free-text search, correlation ID.
- [ ] **Levels, sources, correlation IDs.** Consistent taxonomy; correlation IDs thread a request/function/queue job across services for tracing-lite.
- [ ] **Volume/quota per project.** Soft quota with a metric + alert hook (Phase 14) so a chatty app can't drown the platform.
- [ ] **Export.** Download a filtered window as JSON/CSV (via Phase 05 presigned URL for large ranges).

## Technical Design

- **Storage:** time-ordered logs table; indexed on `(projectId, ts)` + level/source for the filter path. Large deployments move to time-partitioned tables or an external store (documented).
- **Retention sweep:** a Phase 12 job `DELETE FROM logs WHERE projectId=? AND ts < now() - retentionDays` in batches (e.g. 5k rows) to avoid long locks; records `logs.pruned` counts.
- **Shipper:** a buffer (in-process/Redis) flushed on size-or-time by a scheduler tick → `LogShipper.deliver(batch)` to the configured sink; on failure, retry with backoff and drop after N (never block ingest). Webhook sink signs batches with HMAC.
- **Ingest path:** logs from apps arrive at `POST /logs/ingest` (project API key) → validated → written → `logs.ingested` event (optional) → buffered for shipping.

## Integration Points

- **Events emitted:** `logs.log.ingested` (sampled), `logs.pruned`, `logs.shipped/failed`. Consumed by audit (02), Monitoring (14, volume alerts).
- **Service registry:** registers `logs`.
- **SDK (16):** `logs.ingest`, `logs.query`, `logs.export`.
- **CLI (18):** `fidscript logs tail/query`.
- **Dashboard (19):** log viewer with filters + streaming tail (Phase 13).
- **Consumers:** Functions (10), Queues (11), Deployments (06) all write here.

## Verification (VPS)

```bash
# Ingest structured logs from an app:
curl -fsS -X POST .../api/v1/logs/ingest -H "X-API-Key: <project-key>" \
  -d '[{"level":"info","source":"web","message":"hello","ts":"..."}]'

# Query with filters + cursor pagination:
curl -fsS ".../logs?q=hello&level=info&from=...&to=..." | jq '.items, .nextCursor'

# Retention: set retentionDays=1, backdate some logs, run sweep → old logs gone:
docker compose exec postgres psql ... -c "select count(*) from logs.logs where ts < now()-interval '2 days';"  # 0 after sweep

# Shipping: point a webhook sink at webhook.site, ingest logs → batched POST received (HMAC-signed)
```

**Exit criterion:** structured logs ingest and query with filters; logs older than `retentionDays` are swept away by the scheduled job; a configured shipper delivers batches to an external sink (verified received). No unbounded growth.

## Out of Scope / Future

- Full-text search engine (OpenSearch) backend — future (interface-ready).
- OpenTelemetry/tracing ingestion — future (alongside Phase 14 tracing).
- Log anomaly detection — future.

## Risks

- High-volume ingest can saturate Postgres → enforce ingest rate limits + the volume quota + consider the object-store sink for firehose apps.
- Batched deletes on large tables can lock → always batch with `LIMIT` loops, run off-peak.

## Files you'll touch (precision map)

- Partial at: `apps/api/src/modules/logging/logging.service.ts` (real ingestion + genuinely good cursor-paginated query — but `retentionDays` never enforced; no retention sweep; no shipping).
- Prisma: `LogStream`, `LogEntry`.
- Add: a retention sweep as a Phase 12 scheduler job (batched deletes); a pluggable `LogShipper` (webhook / object storage to Phase 05 / Loki); structured ingest from deployments(06)/functions(10)/queues(11).

## Next Phase

[Phase 16: SDK Platform](./phase-16.md)
