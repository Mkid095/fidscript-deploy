'use client';

import { useEffect, useMemo, useState } from 'react';
import { PenSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  createFolder,
  destroyFolder,
  getMessage,
  listMailboxes,
  listMailboxColors,
  messageAction,
  queryMessages,
  renameFolder,
  saveDraft,
  sendMail,
  setMailboxColor,
} from '@/lib/mailbox/api';
import {
  findSystemMailbox,
  folderTitle,
  isTrashSlug,
  queryForSlug,
} from '@/lib/mailbox/folders';
import { formatFullTimestamp } from '@/lib/mailbox/format';
import type {
  ComposeInitial,
  Identity,
  Mailbox,
  MessageDetail,
  MessageSummary,
  QuickFilter,
  WorkspacePage,
} from '@/lib/mailbox/types';

import { ComposeModal, type ComposePayload, type ComposeTarget } from './compose-modal';
import { ContactsView } from './contacts-view';
import { DetailPane } from './detail-pane';
import { ListPane, type BulkAction } from './list-pane';
import { SettingsView } from './settings-view';
import { Sidebar } from './sidebar';
import { TemplatesView } from './templates-view';
import { TopBar } from './topbar';

/**
 * The mailbox app: the reference design's three panes, talking to the
 * webmail's REST routes instead of its own store.
 *
 * The URL is the source of truth for two of the app's facts: which folder
 * (the /mail/[slug] segment) and which message is open (?m=). Everything
 * else — the list window, the quick filter, the search, the bulk
 * selection, the composer — lives here, and mirrors the reference App
 * one-to-one where the back end answers for it.
 */
export function MailboxApp({
  email,
  mailboxes: initialMailboxes,
  identities,
  folderSlug,
  initialMessageId,
}: {
  email: string;
  mailboxes: Mailbox[];
  identities: Identity[];
  folderSlug: string;
  /** The ?m= the server page read, for the first paint. */
  initialMessageId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the truth after navigation; the server's read of it
  // covers the first paint before the client answers.
  const selectedId = searchParams.get('m') ?? initialMessageId ?? null;

  // The mailboxes: the server's answer, refreshed after every folder and
  // message change that moves the counts.
  const [mailboxes, setMailboxes] = useState<Mailbox[]>(initialMailboxes);
  useEffect(() => setMailboxes(initialMailboxes), [initialMailboxes]);

  // The app-side paint per folder (this Stalwart build's mailboxes take
  // no colour, so the webmail keeps the paint itself).
  const [colorFor, setColorFor] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    listMailboxColors()
      .then((res) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const row of res.colors) next[row.mailboxId] = row.color;
        setColorFor(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The list window for the active folder + filter + search.
  const [rows, setRows] = useState<MessageSummary[]>([]);
  const [nextPosition, setNextPosition] = useState<number | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // The quick filter tabs, and the top bar's search (debounced before it
  // reaches the wire).
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [search, setSearch] = useState('');

  // The detail pane's message.
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // The bulk bar's selection.
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // The composer.
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<ComposeInitial | null>(null);

  // The mobile rules: one pane at a time, the drawer closed.
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // A workspace page open in the viewport (settings, templates, contacts)
  // — the mail panes step aside while it is up.
  const [activePage, setActivePage] = useState<WorkspacePage | null>(null);

  const query = useMemo(
    () => queryForSlug(mailboxes, folderSlug),
    [mailboxes, folderSlug],
  );

  // The search catches up to the box, a beat behind.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // A new folder is a new conversation: reset the filter, the search,
  // the bar, the panes, and any workspace page that was open.
  useEffect(() => {
    setQuickFilter('all');
    setCheckedIds([]);
    setMobileShowDetail(false);
    setSearchQuery('');
    setSearch('');
    setActivePage(null);
  }, [folderSlug]);

  // The list window: one request per folder. The Stalwart build behind
  // this answers only the mailbox slice, so the quick filter, the search
  // and the starred view all narrow the window below, in the app.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setNextPosition(null);
    setListError(null);
    setListLoading(true);

    if (!query) {
      setListError('This account has no folder by that name.');
      setListLoading(false);
      return;
    }

    void (async () => {
      try {
        const result = await queryMessages({
          mailbox: query.mailbox,
          // The Starred view narrows the whole account client-side, so
          // it earns the wider window.
          limit: folderSlug === 'starred' ? 200 : 50,
        });
        if (cancelled) return;
        setRows(result.messages);
        setNextPosition(result.nextPosition);
      } catch (err) {
        if (cancelled) return;
        setListError(err instanceof Error ? err.message : 'The list could not be loaded.');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, refreshTick]);

  // The detail message, fetched for the ?m= value.
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    getMessage(selectedId)
      .then((res) => {
        if (!cancelled) setDetail(res.message);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(err instanceof Error ? err.message : 'The message could not be read.');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // The window the list pane shows: the fetched slice, narrowed by the
  // quick filter, the search box, and — in the Starred view — the flag
  // itself. All of it is the app's, because the query engine only
  // answers the mailbox slice.
  const visibleRows = useMemo(() => {
    let list = rows;
    if (folderSlug === 'starred') list = list.filter((row) => row.flagged);
    if (quickFilter === 'unread') list = list.filter((row) => !row.seen);
    else if (quickFilter === 'starred') list = list.filter((row) => row.flagged);
    else if (quickFilter === 'files') list = list.filter((row) => row.hasAttachment);

    const q = search.toLowerCase();
    if (q) {
      list = list.filter((row) => {
        const haystack = [
          row.from?.name,
          row.from?.email,
          row.to.map((person) => person.email).join(' '),
          row.subject,
          row.preview,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return list;
  }, [rows, folderSlug, quickFilter, search]);

  // ── URL writes ─────────────────────────────────────────────────────

  function openFolder(slug: string) {
    // Coming from a Workspace page? The folder owns the view again.
    setActivePage(null);
    router.push(`/mail/${slug}`);
  }

  function selectMessage(id: string | null) {
    router.replace(
      id ? `/mail/${folderSlug}?m=${encodeURIComponent(id)}` : `/mail/${folderSlug}`,
    );
    if (!id) setMobileShowDetail(false);
  }

  // ── The message actions ───────────────────────────────────────────

  async function markRead(ids: string[], read: boolean) {
    setRows((prev) =>
      prev.map((row) => (ids.includes(row.id) ? { ...row, seen: read } : row)),
    );
    setDetail((prev) =>
      prev && ids.includes(prev.id) ? { ...prev, seen: read } : prev,
    );
    try {
      await messageAction({ action: 'flags', ids, flags: { seen: read } });
      if (read) bumpUnread(ids);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'The change could not be saved.');
    }
  }

  function toggleStar(row: MessageSummary) {
    void markFlagged(row.id, !row.flagged);
  }

  async function markFlagged(id: string, flagged: boolean) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, flagged } : row)),
    );
    setDetail((prev) => (prev && prev.id === id ? { ...prev, flagged } : prev));
    try {
      await messageAction({ action: 'flags', ids: [id], flags: { flagged } });
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'The star could not be saved.');
    }
  }

  /** Opening an unread message reads it; the rail's count follows. */
  function openMessage(row: MessageSummary) {
    selectMessage(row.id);
    setMobileShowDetail(true);
    if (!row.seen) {
      void markRead([row.id], true);
    }
  }

  function bumpUnread(ids: string[]) {
    // The unread badge moves by the message's own mailbox.
    const hit = new Map<string, number>();
    for (const row of rows) {
      if (!ids.includes(row.id)) continue;
      for (const box of row.mailboxIds) {
        hit.set(box, (hit.get(box) ?? 0) + 1);
      }
    }
    setMailboxes((prev) =>
      prev.map((box) =>
        hit.has(box.id)
          ? { ...box, unreadEmails: Math.max(0, box.unreadEmails - (hit.get(box.id) ?? 0)) }
          : box,
      ),
    );
  }

  async function moveMessages(ids: string[], toMailbox: string) {
    try {
      await messageAction({ action: 'move', ids, toMailbox });
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'The move could not be saved.');
      return;
    }
    dropRows(ids);
    refreshMailboxes();
  }

  async function destroyMessages(ids: string[]) {
    try {
      await messageAction({ action: 'destroy', ids });
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'The delete could not be saved.');
      return;
    }
    dropRows(ids);
    refreshMailboxes();
  }

  function dropRows(ids: string[]) {
    const gone = new Set(ids);
    setRows((prev) => prev.filter((row) => !gone.has(row.id)));
    setCheckedIds((prev) => prev.filter((id) => !gone.has(id)));
    if (selectedId && gone.has(selectedId)) selectMessage(null);
  }

  function handleBulk(action: BulkAction, target?: string) {
    const ids = checkedIds;
    setCheckedIds([]);
    if (ids.length === 0) return;
    switch (action) {
      case 'mark_read':
        void markRead(ids, true);
        break;
      case 'mark_unread':
        void markRead(ids, false);
        break;
      case 'move_folder':
        if (target) void moveMessages(ids, target);
        break;
      case 'delete':
        if (isTrashSlug(mailboxes, folderSlug)) {
          void destroyMessages(ids);
        } else {
          const trash = findSystemMailbox(mailboxes, 'trash')?.id;
          if (trash) void moveMessages(ids, trash);
        }
        break;
    }
  }

  async function handleEmptyTrash() {
    const ids = rows.map((row) => row.id);
    if (ids.length > 0) {
      await destroyMessages(ids);
      // Whatever the window missed, the folder's total is the truth.
      setRows([]);
    }
    refreshMailboxes();
  }

  // ── The folders ───────────────────────────────────────────────────

  function refreshMailboxes() {
    void listMailboxes()
      .then((res) => setMailboxes(res.mailboxes))
      .catch(() => {
        // The counts will be wrong until the next visit; not worth an error.
      });
  }

  async function handleCreateFolder(name: string, color: string) {
    const res = await createFolder(name);
    // Paint the new folder; the paint is the app's, stored alongside.
    await setMailboxColor(res.id, color).catch((err) => console.error('Could not paint the new folder:', err));
    setColorFor((prev) => ({ ...prev, [res.id]: color }));
    refreshMailboxes();
  }

  async function handleRenameFolder(id: string, name: string) {
    await renameFolder(id, name);
    refreshMailboxes();
  }

  async function handleDestroyFolder(id: string) {
    await destroyFolder(id);
    // The folder goes, its paint goes with it.
    await setMailboxColor(id, null).catch(() => {});
    setColorFor((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (folderSlug === `id-${id}`) {
      selectMessage(null);
      router.push('/mail/inbox');
    }
    refreshMailboxes();
  }

  // The tail of the window: one more slice; the narrowing above
  // re-applies to whatever grows.
  async function loadOlder() {
    if (!query || nextPosition === null) return;
    try {
      const result = await queryMessages({
        mailbox: query.mailbox,
        limit: 50,
        position: nextPosition,
      });
      setRows((prev) => [...prev, ...result.messages]);
      setNextPosition(result.nextPosition);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : 'The older messages could not be loaded.',
      );
    }
  }

  // ── The composer ──────────────────────────────────────────────────

  function openCompose(initial: ComposeInitial | null) {
    setComposeInitial(initial);
    setComposeOpen(true);
  }

  // "Use in the composer": the template's HTML goes on the wire, its
  // text alternative (or a stripped version) is what the box shows.
  function useTemplateInComposer(template: {
    name: string;
    html: string;
    text: string;
  }) {
    openCompose({
      mode: 'new',
      html: template.html,
      text: template.text || stripToText(template.html),
      templateName: template.name,
    });
  }

  // "Write" from a contact: the composer opens with the card in To.
  function writeToContact(contact: { email: string; displayName: string }) {
    openCompose({
      mode: 'new',
      to: contact.email,
      text: contact.displayName ? `Hi ${contact.displayName},\n\n` : '',
    });
  }

  async function handleComposeSubmit(
    payload: ComposePayload,
    target: ComposeTarget,
  ): Promise<{ draftId?: string }> {
    if (target === 'draft') {
      const res = await saveDraft({
        draftId: payload.draftId,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      // The drafts view and the folder counts move underneath a save.
      if (folderSlug === 'drafts') {
        setRefreshTick((tick) => tick + 1);
      }
      refreshMailboxes();
      return { draftId: res.draftId };
    }

    await sendMail({
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      identityId: payload.identityId,
      attachments: payload.attachments,
    });
    // The draft that was edited is now a sent message; retire it.
    if (payload.draftId) {
      await messageAction({ action: 'destroy', ids: [payload.draftId] }).catch(
        () => {},
      );
    }
    if (folderSlug === 'sent' || folderSlug === 'drafts') {
      setRefreshTick((tick) => tick + 1);
    }
    refreshMailboxes();
    return {};
  }

  // ── Compose prefills from the detail pane ────────────────────────

  function handleReply(message: MessageDetail, all: boolean) {
    const from = message.from;
    const who = from ? from.name?.trim() || from.email : 'someone';
    const stamp = formatFullTimestamp(message.receivedAt);
    openCompose({
      mode: 'reply',
      to: from?.email,
      cc: all ? message.cc.map((person) => person.email).join(', ') : undefined,
      subject: prefixOnce(message.subject, 'Re:'),
      text: `\n\n--- On ${stamp}, ${who} wrote:\n${message.text ?? message.preview}`,
    });
  }

  function handleForward(message: MessageDetail) {
    const from = message.from;
    const head = from
      ? `From: ${from.name?.trim() ? `${from.name} <${from.email}>` : from.email}`
      : '';
    openCompose({
      mode: 'forward',
      subject: prefixOnce(message.subject, 'Fwd:'),
      text: `\n\n---------- Forwarded message ---------\n${head}\nSubject: ${message.subject}\n\n${message.text ?? message.preview}`,
    });
  }

  function handleEditDraft(message: MessageDetail) {
    openCompose({
      mode: 'draft',
      draftId: message.id,
      to: message.to.map((person) => person.email).join(', '),
      cc: message.cc.map((person) => person.email).join(', '),
      subject: message.subject,
      text: message.text ?? '',
      attachments: message.parts
        .filter((part) => part.isAttachment)
        .map((part) => ({
          blobId: part.blobId,
          filename: part.name ?? 'attachment',
          contentType: part.type,
          size: part.size,
        })),
    });
  }

  // ── The layout ────────────────────────────────────────────────────

  const trashActive = isTrashSlug(mailboxes, folderSlug);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        openMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activeFolder={folderSlug}
        onOpenFolder={openFolder}
        onOpenCompose={() => openCompose(null)}
        activePage={activePage}
        onOpenPage={setActivePage}
        mailboxes={mailboxes}
        colorFor={colorFor}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDestroyFolder={handleDestroyFolder}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          email={email}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex min-h-0 flex-1 overflow-hidden">
          {activePage ? (
            <div className="h-full min-w-0 flex-1">
              {activePage === 'settings' ? (
                <SettingsView email={email} />
              ) : activePage === 'templates' ? (
                <TemplatesView email={email} onUseInComposer={useTemplateInComposer} />
              ) : (
                <ContactsView email={email} onWriteTo={writeToContact} />
              )}
            </div>
          ) : (
            <>
              {/* The list pane; on the phone it yields to the detail. */}
              <div
                className={`${
                  mobileShowDetail ? 'hidden lg:flex' : 'flex'
                } h-full w-full shrink-0 flex-col lg:w-[390px] xl:w-[430px]`}
              >
            <ListPane
              title={folderTitle(mailboxes, folderSlug)}
              isTrash={trashActive}
              showRecipient={folderSlug === 'sent' || folderSlug === 'drafts'}
              rows={visibleRows}
              loading={listLoading}
              error={listError}
              nextPosition={nextPosition}
              onLoadOlder={() => {
                void loadOlder();
              }}
              quickFilter={quickFilter}
              onQuickFilterChange={setQuickFilter}
              hasSearch={search.length > 0}
              selectedId={selectedId}
              onSelect={openMessage}
              onToggleStar={toggleStar}
              onBulk={handleBulk}
              onEmptyTrash={() => {
                void handleEmptyTrash();
              }}
              onOpenCompose={() => openCompose(null)}
              mailboxes={mailboxes}
              checkedIds={checkedIds}
              onCheckedIdsChange={setCheckedIds}
            />
          </div>

          {/* The detail pane. */}
          <div
            className={`${
              mobileShowDetail ? 'flex' : 'hidden lg:flex'
            } h-full min-w-0 flex-1`}
          >
            <DetailPane
              message={detail}
              loading={detailLoading}
              error={detailError}
              folderKey={folderSlug}
              mailboxes={mailboxes}
              onBackMobile={() => setMobileShowDetail(false)}
              onToggleStar={(id) => {
                const row = rows.find((r) => r.id === id);
                if (row) void markFlagged(id, !row.flagged);
                else if (detail) void markFlagged(id, !detail.flagged);
              }}
              onToggleRead={(id) => {
                const row = rows.find((r) => r.id === id);
                const seen = row ? row.seen : detail?.seen ?? false;
                void markRead([id], !seen);
              }}
              onMove={(id, toMailbox) => {
                void moveMessages([id], toMailbox);
              }}
              onRestore={(id) => {
                const inbox = findSystemMailbox(mailboxes, 'inbox')?.id;
                if (inbox) void moveMessages([id], inbox);
              }}
              onDelete={(id) => {
                if (trashActive) void destroyMessages([id]);
                else {
                  const trash = findSystemMailbox(mailboxes, 'trash')?.id;
                  if (trash) void moveMessages([id], trash);
                }
              }}
              onReply={(message) => handleReply(message, false)}
              onReplyAll={(message) => handleReply(message, true)}
              onForward={handleForward}
              onEditDraft={handleEditDraft}
            />
          </div>
            </>
          )}
        </main>
      </div>

      {/* The phone's quick compose, while the list is up. */}
      {!mobileShowDetail && !composeOpen && !activePage && (
        <button
          type="button"
          onClick={() => openCompose(null)}
          className="fixed bottom-5 right-5 z-30 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-orange-700 lg:hidden"
          aria-label="Compose new email"
        >
          <PenSquare className="h-4 w-4" />
          <span>Compose</span>
        </button>
      )}

      {composeOpen && (
        <ComposeModal
          key={composeInitial?.draftId ?? composeInitial?.mode ?? 'new'}
          identities={identities}
          initial={composeInitial}
          onClose={() => {
            setComposeOpen(false);
            setComposeInitial(null);
          }}
          onSubmit={handleComposeSubmit}
        />
      )}
    </div>
  );
}

function prefixOnce(subject: string, prefix: string): string {
  const base = subject.trim() || 'Untitled';
  return base.startsWith(prefix) ? base : `${prefix} ${base}`;
}

/** The composer box shows words, not markup: a template's HTML as text. */
function stripToText(html: string): string {
  const withoutStyle = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  const withBreaks = withoutStyle
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const text = withBreaks.replace(/<[^>]+>/g, '');
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
