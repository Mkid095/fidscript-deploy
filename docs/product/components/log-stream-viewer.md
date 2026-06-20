# Component Spec — `LogStreamViewer`

> Timeline + filter + live tail. The canonical log viewer — shared across Deployments
> logs, Function logs, Queue messages, Realtime messages, and the Logs section.

## 1. Purpose
The user inspects one log stream — filters, searches, tails live. The principle: **logs
are the source of truth for "what happened?"; the viewer makes the answer one keystroke
away.**

## 2. Props
```ts
type LogStreamViewerProps = {
  /** The stream ID (drives the WS subscription). */
  streamId: string;
  /** Initial entries (from the API). */
  initialEntries: LogEntry[];
  /** The fetch callback (for pagination). */
  onFetch: (cursor: string | null) => Promise<{ entries: LogEntry[]; nextCursor: string | null }>;
  /** The WS subscription factory (for live tail). */
  onSubscribe: (onEntry: (entry: LogEntry) => void) => () => void;
  /** Optional title (default: stream name). */
  title?: string;
  /** Show the Ingest API key (default true for stream owners). */
  showIngestKey?: boolean;
  /** The Ingest API key (when showIngestKey). */
  ingestKey?: string;
};
```

## 3. Visual anatomy
```
application  [● tailing]  last write 12s ago  retention 30d
Ingest API key: ●●●●●●●●●●●●●● [Copy]
─────────────────────────────────────────────────────────
Filter:  Level: [info][warn][error][debug]   Search: [/regex/]
Range:   [Last 1h ▼]
─────────────────────────────────────────────────────────
▇▆▅▇▆▇▆▅▇▆▇▆▅▇▇▆▅▆▇▆▇▆▅▇▆▇▆▅▇▆▆▅▇▇▆▅▆▇▆▇▆▅▇▆▆▆▅▇▆▆▆▅▇▆▆▆▅
─────────────────────────────────────────────────────────
12:42:13  INFO  request 200 GET /api/v1/projects
12:42:13  WARN  retrying external call
12:42:13  ERROR upstream timeout
...
                                                     [Pause] [Latest]
```

## 4. States
- **Idle**: initial entries render; auto-tailing.
- **Searching**: input focused; results filter live.
- **Live**: auto-scrolls; pauseable; "Jump to latest" button when scrolled away.
- **Paused**: WS subscription paused; "Resume" button.
- **Loading**: skeleton.
- **Empty**: "No entries yet."
- **Filter chips**: active filters appear as chips with × to remove.

## 5. Variants
- **Density**: comfortable (default); compact.
- **Wrap / no-wrap**.

## 6. Interactions
- **Click row**: expand metadata JSON.
- **Click Pause / Resume**: control the live tail.
- **Click "Jump to latest"**: scroll to the bottom.
- **Click level chip**: toggle.
- **Click time range**: open dropdown.
- **Search**: live filter with regex.

## 7. Accessibility
- **List**: `role="log"`; each entry `role="listitem"`.
- **Live region**: `aria-live="polite"`; "New entry" announced.
- **Histogram**: `role="img"` with `aria-label` describing the distribution.
- **Pause/Resume**: `aria-pressed` indicates state.
- **Level filter**: checkboxes with `aria-label` per level.

## 8. Telemetry / events
- `log_stream_viewer.filter_changed` → `{ level, search, timeRange }`.
- `log_stream_viewer.pause_clicked` / `resume_clicked` → `{ streamId }`.
- `log_stream_viewer.entry_clicked` → `{ entryId }`.
- `log_stream_viewer.copy_clicked` / `download_clicked` → `{ streamId }`.

## 9. Cross-references
- **Screens**: Logs viewer, Deployments logs, Function logs, Queue messages, Realtime
  messages.

## 10. Acceptance criteria
- Renders entries + filter + timeline + live tail.
- Filter chips work.
- Live tail auto-scrolls; pause stops the WS; resume reconnects.
- "Jump to latest" appears when scrolled away.
- "Copy all" + "Download .log" work.
- Per-row click expands metadata.
- Realtime updates stream in via WS.
- Live region announces new entries.
- Theme-aware.