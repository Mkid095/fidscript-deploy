# Screen Spec — `RealtimeChannelDetail`

> Per-channel detail at `/dashboard/projects/:id/realtime/channels/:c` (F10). The
> operator's console for one realtime channel: messages, presence, test publish.

## 1. Purpose
The user watches a channel's traffic, sees who's connected, and tests the channel without
writing a client. The principle: **a channel is a live stream; the UI is the test client.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/realtime/channels/:c`.
- **Permission:** any member (`O/A/D/V`); viewer greys the test-publish form.
- **Project scope:** the channel belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Realtime › room-lobby                             │
├──────────────────────────────────────────────────────────────────────┤
│ room-lobby  [Public]  3 online · last message 12s ago · ● Connected  │
├──────────────────────────────────────────────────────────────────────┤
│ [Messages] [Presence] [Test publish]                                 │
├──────────────────────────────────────────────────────────────────────┤
│ 12:42:13   user_8a3f  message  "Hello, world"                        │
│ 12:42:08   user_2b1c  typing    "is anyone here?"                    │
│ 12:41:55   user_8a3f  join                                          │
│ ...                                                                  │
│                                                                      │
│                                              [Pause] [Jump to latest]│
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: channel name, isPublic badge, presence count, "last message Xs ago",
  Connected status (the dashboard's own socket state).
- **Tabs**:
  - **Messages** (default): live tail of `RealtimeMessage`.
  - **Presence**: list of `RealtimePresence`; "Set my status" inline toggle.
  - **Test publish**: form with event + content + userId.
- **Per-tab states**:
  - **Messages**:
    - *Empty*: "No messages yet — publish one from the Test publish tab."
    - *Live*: rows appear; auto-scrolls; pauseable.
    - *Paused*: "Paused — click Resume to continue the live tail."
  - **Presence**:
    - *Empty*: "No one is online — the dashboard's own presence counts as 1."
    - *Live*: rows with userId, status badge, updatedAt.
    - *"Set my status"*: the current user's row is highlighted; the status select is
      inline.
  - **Test publish**:
    - *Idle*: empty form.
    - *Publishing*: spinner.
    - *Published*: success toast; the row appears in Messages.

## 5. Primary + secondary actions
- **Primary (Test publish tab)**: "Publish" — POST RT-06 (or socket gateway).
- **Secondary**:
  - Messages tab: "Pause" / "Resume" / "Jump to latest".
  - Presence tab: "Set my status" inline.

## 6. API mapping
- **Get channel** — `GET /api/v1/realtime/channels/:channelId` (`RT-03`).
- **Get messages** — `GET /api/v1/realtime/channels/:channelId/messages?limit=&cursor=`
  (`RT-05`); paginated.
- **Get presence** — `GET /api/v1/realtime/channels/:channelId/presence` (`RT-07`).
- **Update presence** — `POST /api/v1/realtime/presence` (`RT-06`) with
  `{channelId, status}`.
- **Test publish** — uses the socket gateway (RT-06-equivalent for the publish action).
- **Issue access token** — `POST /api/v1/realtime/channels/:channelId/token` (`RT-08`)
  (only if isPrivate).
- **Realtime** — the dashboard subscribes to `channel:<id>` for the live tail.

## 7. Forms + validation
- **Test publish**: event (text), content (textarea), userId (text, default "test").
- **Set my status**: select `online|away|busy|offline`.

## 8. Accessibility
- **Focus order**: header → tabs → tab content → actions.
- **Live region**: `aria-live="polite"` on the messages list; "New message" announced.
- **Pause/Resume**: standard button pattern; `aria-pressed` indicates state.

## 9. Cross-references
- **Phase**: F10 Realtime UI §6.
- **Service spec**: `docs/product/services/realtime.md`.
- **Journey**: backend dev's "is the channel working?" flow.
- **Navigation**: Realtime list → click a channel.
- **Related screens**: New channel modal (sibling).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/realtime/channels/:c`; the
   **Messages** tab is preselected.
2. The header shows the channel name, isPublic badge, presence count, "last message
   Xs ago," and Connected status.
3. The Messages tab is a live tail of `RealtimeMessage`; pauseable; "Jump to latest"
   appears when scrolled away.
4. The Presence tab shows `RealtimePresence` rows; the current user can set their own
   status inline; their row is highlighted.
5. The Test publish form publishes a message via the socket gateway; the row appears
   in Messages.
6. Realtime updates: messages arrive via WS; presence updates stream in.
7. Live region announces new messages to screen readers.
8. Viewer greys the test-publish form.
