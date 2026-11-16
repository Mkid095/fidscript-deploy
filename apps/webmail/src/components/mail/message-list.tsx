'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmptyState } from '@/components/ui';

interface Row {
  id: string;
  from: { name?: string; email: string } | null;
  to: Array<{ name?: string; email: string }>;
  subject: string;
  receivedAt: string;
  seen: boolean;
  flagged: boolean;
  junk: boolean;
  hasAttachment: boolean;
  preview: string;
  mailboxIds: string[];
  size: number;
}

interface Folder {
  id: string;
  name: string;
  role: string | null;
}

/**
 * The message list, alive: it asks Stalwart for the messages this time,
 * marks selections, and does bulk things to them. "Load more" walks the
 * JMAP position; refresh starts again.
 */
export function MessageList({
  title,
  mailboxId,
  starred = false,
  text,
  mailboxes,
}: {
  title: string;
  /** A mailbox id, "all", or null (the starred view, no mailbox scope). */
  mailboxId: string | null;
  starred?: boolean;
  text?: string;
  mailboxes: Folder[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPosition, setNextPosition] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pageKey = useRef(0);

  const load = useCallback(
    async (position?: number) => {
      const key = ++pageKey.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (mailboxId) params.set('mailbox', mailboxId);
        if (starred) params.set('starred', '1');
        if (text) params.set('text', text);
        if (position !== undefined) params.set('position', String(position));
        const response = await fetch(`/api/mail/query?${params.toString()}`);
        const body = (await response.json()) as {
          messages?: Row[];
          nextPosition?: number | null;
          error?: string;
        };
        if (key !== pageKey.current) return;
        if (!response.ok) {
          setError(body.error ?? 'The list did not come back.');
          setRows([]);
        } else {
          setRows((current) =>
            position === undefined ? (body.messages ?? []) : [...current, ...(body.messages ?? [])],
          );
          setNextPosition(body.nextPosition ?? null);
        }
      } catch (err) {
        if (key === pageKey.current) setError((err as Error).message);
      } finally {
        if (key === pageKey.current) setLoading(false);
      }
    },
    [mailboxId, starred, text],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    action: string,
    payload: Record<string, unknown>,
    thenNotice?: string,
  ) {
    setBusy(true);
    setNotice(null);
    const response = await fetch('/api/mail/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids: [...selected], ...payload }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    setBusy(false);
    if (!response.ok) {
      setNotice(body.error ?? 'That did not work.');
      return;
    }
    if (thenNotice) setNotice(thenNotice);
    setSelected(new Set());
    void load();
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const folders = mailboxes.filter(
    (m) =>
      m.role !== 'sent' &&
      m.role !== 'drafts' &&
      m.role !== 'trash' &&
      m.role !== 'junk' &&
      m.role !== 'all' &&
      m.role !== 'archive',
  );
  const trashFolder = mailboxes.find((m) => m.role === 'trash');
  const spamFolder = mailboxes.find((m) => m.role === 'junk');

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-rail bg-surface px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2"
          >
            Refresh
          </button>
          {error ? (
            <span className="text-xs text-danger">{error}</span>
          ) : null}
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-rail bg-surface-2 px-3 py-2">
          <span className="text-xs text-text-muted">{selected.size} selected</span>
          <button type="button" disabled={busy} onClick={() => act('flags', { flags: { seen: true } }, 'Marked as read.')} className="text-xs text-accent hover:underline">
            Mark read
          </button>
          <button type="button" disabled={busy} onClick={() => act('flags', { flags: { seen: false } }, 'Marked as unread.')} className="text-xs text-accent hover:underline">
            Mark unread
          </button>
          <button type="button" disabled={busy} onClick={() => act('flags', { flags: { flagged: true } }, 'Starred.')} className="text-xs text-accent hover:underline">
            Star
          </button>
          {spamFolder ? (
            <button type="button" disabled={busy} onClick={() => act('move', { toMailbox: spamFolder.id }, 'Moved to Spam.')} className="text-xs text-accent hover:underline">
              Report spam
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => act('flags', { flags: { junk: true } }, 'Marked as spam.')} className="text-xs text-accent hover:underline">
              Mark spam
            </button>
          )}
          {trashFolder && mailboxId !== trashFolder.id ? (
            <button type="button" disabled={busy} onClick={() => act('move', { toMailbox: trashFolder.id }, 'Moved to Trash.')} className="text-xs text-accent hover:underline">
              Move to Trash
            </button>
          ) : null}
          <select
            aria-label="Move to folder"
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;
              void act('move', { toMailbox: event.target.value }, `Moved to ${folders.find((f) => f.id === event.target.value)?.name ?? 'the folder'}.`);
            }}
            className="rounded border border-rail bg-surface px-2 py-0.5 text-xs text-text-muted"
          >
            <option value="" disabled>
              Move to…
            </option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          {trashFolder && mailboxId === trashFolder.id ? (
            <button type="button" disabled={busy} onClick={() => act('destroy', {}, 'Deleted for good.')} className="text-xs text-danger hover:underline">
              Delete for good
            </button>
          ) : null}
        </div>
      ) : null}

      {notice ? <p className="mb-2 text-xs text-text-dim">{notice}</p> : null}

      {rows.length === 0 && !loading ? (
        <EmptyState
          title="Nothing here"
          body={
            text
              ? `No message matches "${text}".`
              : starred
                ? 'No starred messages yet — star one and it keeps its place here.'
                : 'No messages in this folder yet.'
          }
        />
      ) : (
        <ul className="divide-y divide-rail rounded-lg border border-rail bg-surface">
          {rows.map((row) => {
            const isSel = selected.has(row.id);
            const unread = !row.seen;
            const detailHref = `/mail/inbox/${row.id}`;
            return (
              <li
                key={row.id}
                className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
                  isSel ? 'bg-accent-soft/40' : 'hover:bg-surface-2/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => {
                    const next = new Set(selected);
                    if (isSel) next.delete(row.id);
                    else next.add(row.id);
                    setSelected(next);
                  }}
                  className="mt-1"
                />
                <Link href={detailHref} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-text">
                      {row.from?.name || row.from?.email || '(no sender)'}
                    </span>
                    {unread ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Unread" />
                    ) : null}
                    {row.hasAttachment ? (
                      <span className="text-xs text-text-dim" title="Has attachment">
                        📎
                      </span>
                    ) : null}
                  </div>
                  <p className={`truncate text-xs ${unread ? 'text-text' : 'text-text-dim'}`}>
                    <span className={unread ? 'font-medium text-text' : undefined}>
                      {row.subject || '(no subject)'}
                    </span>
                    {row.preview ? <span className="text-text-dim"> — {row.preview}</span> : null}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    aria-label={row.flagged ? 'Unstar' : 'Star'}
                    onClick={() =>
                      void act('flags', { ids: [row.id], flags: { flagged: !row.flagged } })
                    }
                    className="text-sm text-text-dim hover:text-warning"
                  >
                    {row.flagged ? '★' : '☆'}
                  </button>
                  <span className="w-16 text-right text-[11px] text-text-dim">
                    {new Date(row.receivedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {nextPosition !== null ? (
        <button
          type="button"
          onClick={() => void load(nextPosition)}
          disabled={loading}
          className="mt-3 w-full rounded border border-rail bg-surface px-3 py-2 text-xs text-text-muted hover:bg-surface-2"
        >
          Load older messages
        </button>
      ) : null}
    </section>
  );
}
