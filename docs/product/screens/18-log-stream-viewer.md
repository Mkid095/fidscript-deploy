# Screen Spec — `LogStreamViewer`

> Per-stream viewer at `/dashboard/projects/:id/logs/streams/:s` (F11). The canonical log
> viewer — shared across Deployments, Functions, Queues, Realtime, and Logs.

## 1. Purpose
The user inspects one log stream — filters, searches, tails live. The principle: **logs are
the source of truth for "what happened?"; the viewer makes the answer one keystroke away.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/logs/streams/:s`.
- **Permission:** any member (`O/A/D/V`); read-only.
- **Project scope:** the stream belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Logs › application                                │
├──────────────────────────────────────────────────────────────────────┤
│ application  [● tailing]  last write 12s ago  retention 30d          │
│ Ingest API key: ●●●●●●●●●●●●●● [Copy]                                │
├──────────────────────────────────────────────────────────────────────┤
│ Filter:  Level: [info][warn][error][debug]   Search: [/regex/]       │
│ Range:   [Last 1h ▼]                                                  │
├──────────────────────────────────────────────────────────────────────┤
│  ▇▆▅▇▆▇▆▅▇▆▇▆▅▇▇▆▅▆▇▆▇▆▅▇▆▇▆▅▇▆▆▅▇▇▆▅▆▇▆▇▆▅▇▆▆▆▅▇▆▆▆▅▇▆▆▆▅▇▆▆▆▅│
│  ↑ histogram by level over the time range                            │
├──────────────────────────────────────────────────────────────────────┤
│ 12:42:13  INFO  request 200 GET /api/v1/projects                     │
│ 12:42:13  WARN  retrying external call                              │
│ 12:42:13  ERROR upstream timeout                                     │
│ ...                                                                  │
│                                                     [Pause] [Latest] │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: stream name, type pill, "tailing" badge (live), last write (relative),
  retention, Ingest API key (copyable).
- **Filter bar**:
  - Level multi-select (info | warn | error | debug).
  - Search (regex, live count).
  - Time range (Last 1h | 24h | 7d | 30d | Custom).
- **Timeline histogram** (LOG-09): stacked bars by level over the time range; click a
  bar → drill into that bucket.
- **Log list**: per-row — timestamp (ms), level badge, message, metadata (collapsible).
- **Live tail**: auto-scrolls; pauseable; "Jump to latest" button when scrolled away.
- **Toolbar**: "Wrap lines" toggle, "Copy all" button, "Download .log" button.

## 5. Primary + secondary actions
- **Primary** (top-right): "Pause" / "Resume" (live tail control).
- **Secondary**: "Wrap lines", "Copy all", "Download .log", per-row "Show metadata".

## 6. API mapping
- **Get stream** — `GET /api/v1/logs/streams/:streamId` (`LOG-03`).
- **List entries** — `GET /api/v1/logs?stream=&level=&search=&time=&limit=&cursor=`
  (`LOG-07`).
- **Timeline** — `GET /api/v1/logs/streams/:streamName/timeline?interval=` (`LOG-09`).
- **Stats** — `GET /api/v1/logs/stats?stream=` (`LOG-10`).
- **Ingest** — `POST /api/v1/logs/ingest` (`LOG-11`, X-API-Key, PUBLIC).
- **Realtime** — the dashboard subscribes to `log:<stream>` for the live tail.

## 7. Forms + validation
- **No data-entry forms.** The screen is read-mostly; the only inputs are the filter
  controls + the search regex.

## 8. Accessibility
- **Focus order**: filter bar → timeline → log list → toolbar.
- **Live region**: `aria-live="polite"` on the log list; "New entry" announced.
- **Pause/Resume**: standard button pattern; `aria-pressed` indicates state.
- **Level filter**: checkboxes with `aria-label` per level.
- **Histogram**: `role="img"` with `aria-label` describing the distribution.

## 9. Cross-references
- **Phase**: F11 Logs UI §6.
- **Service spec**: `docs/product/services/logs.md`.
- **Journey**: on-call's "what happened?" flow.
- **Navigation**: Logs list → click a stream.
- **Related screens**: Deployments logs, Function logs, Queue messages, Realtime messages
  (all use the same LogViewer).

## 10. Acceptance criteria
1. The viewer opens at `/dashboard/projects/:id/logs/streams/:s`; the filter bar is at
   the top; the timeline histogram is below; the log list is below.
2. The level multi-select filters entries live; the search regex filters live with a
   count.
3. The time range selector updates the list + the histogram.
4. The live tail auto-scrolls; "Pause" stops the WS subscription; "Resume" reconnects
   and jumps to latest.
5. "Jump to latest" appears when scrolled away.
6. "Copy all" copies the rendered log entries as plain text.
7. "Download .log" downloads the entries as a .log file.
8. Per-row click expands the metadata JSON.
9. The Ingest API key is copyable (the runtime uses it to write to this stream).
10. Realtime updates: entries arrive via WS; the list updates without page reload.