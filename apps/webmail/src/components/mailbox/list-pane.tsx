'use client';

import { useState } from 'react';
import {
  CheckSquare,
  FolderInput,
  Inbox,
  LoaderCircle,
  Mail,
  MailOpen,
  Paperclip,
  Square,
  Star,
  Trash2,
} from 'lucide-react';

import { moveDestinations } from '@/lib/mailbox/folders';
import { formatEmailTimestamp } from '@/lib/mailbox/format';
import type { Mailbox, MessageSummary, QuickFilter } from '@/lib/mailbox/types';

export type BulkAction = 'mark_read' | 'mark_unread' | 'move_folder' | 'delete';

interface ListPaneProps {
  title: string;
  isTrash: boolean;
  /** Sent/drafts views name the recipient instead of the sender. */
  showRecipient: boolean;
  rows: MessageSummary[];
  loading: boolean;
  error: string | null;
  nextPosition: number | null;
  onLoadOlder: () => void;
  quickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  hasSearch: boolean;
  selectedId: string | null;
  onSelect: (row: MessageSummary) => void;
  onToggleStar: (row: MessageSummary) => void;
  onBulk: (action: BulkAction, target?: string) => void;
  onEmptyTrash: () => void;
  onOpenCompose: () => void;
  mailboxes: Mailbox[];
  checkedIds: string[];
  onCheckedIdsChange: (ids: string[]) => void;
}

/**
 * The middle pane: the folder's heading, the quick-filter tabs or the bulk
 * bar, the message window, and the "load older" tail.
 *
 * Selection and the quick filter live in the app (they move the URL and
 * the list); this pane owns only which of the loaded window is checked.
 */
export function ListPane({
  title,
  isTrash,
  showRecipient,
  rows,
  loading,
  error,
  nextPosition,
  onLoadOlder,
  quickFilter,
  onQuickFilterChange,
  hasSearch,
  selectedId,
  onSelect,
  onToggleStar,
  onBulk,
  onEmptyTrash,
  onOpenCompose,
  mailboxes,
  checkedIds,
  onCheckedIdsChange,
}: ListPaneProps) {
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);
  const allChecked = rows.length > 0 && checkedIds.length === rows.length;

  function toggleSelectAll() {
    onCheckedIdsChange(allChecked ? [] : rows.map((row) => row.id));
  }

  function toggleOne(id: string) {
    onCheckedIdsChange(
      checkedIds.includes(id)
        ? checkedIds.filter((item) => item !== id)
        : [...checkedIds, id],
    );
  }

  function runBulk(action: BulkAction, target?: string) {
    if (checkedIds.length === 0) return;
    onBulk(action, target);
    setMoveDropdownOpen(false);
  }

  const filterTabs: Array<{ id: QuickFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'starred', label: 'Starred' },
    { id: 'files', label: 'Files' },
  ];

  const destinations = moveDestinations(mailboxes);

  return (
    <section
      aria-label={`${title} email list`}
      className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Folder Heading & Actions */}
      <div className="shrink-0 space-y-2.5 border-b border-slate-200 px-4 pb-2.5 pt-3.5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate font-display text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h1>
            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {rows.length}
            </span>
          </div>

          {isTrash && rows.length > 0 && (
            <button
              type="button"
              onClick={onEmptyTrash}
              className="shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              Empty Trash
            </button>
          )}
        </div>

        {/* Segmented Filter Bar OR Bulk Selection Bar */}
        {checkedIds.length > 0 ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 dark:border-orange-800 dark:bg-orange-950/50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="rounded p-1 text-orange-700 dark:text-orange-300"
                aria-label="Deselect all"
              >
                <CheckSquare className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold tabular-nums text-orange-800 dark:text-orange-200">
                {checkedIds.length} selected
              </span>
            </div>

            <div className="relative flex items-center gap-1">
              <button
                type="button"
                onClick={() => runBulk('mark_read')}
                className="rounded p-1.5 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
                title="Mark as read"
                aria-label="Mark selected as read"
              >
                <MailOpen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => runBulk('mark_unread')}
                className="rounded p-1.5 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
                title="Mark as unread"
                aria-label="Mark selected as unread"
              >
                <Mail className="h-4 w-4" />
              </button>

              {/* Move to folder dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoveDropdownOpen((p) => !p)}
                  className="rounded p-1.5 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
                  title="Move to folder"
                  aria-label="Move selected to folder"
                >
                  <FolderInput className="h-4 w-4" />
                </button>
                {moveDropdownOpen && (
                  <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {destinations.map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => runBulk('move_folder', dest.id)}
                        className="w-full truncate px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {dest.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => runBulk('delete')}
                className="rounded p-1.5 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/50"
                title={isTrash ? 'Delete forever' : 'Move to Trash'}
                aria-label="Delete selected"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={rows.length === 0}
              className="shrink-0 rounded p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-40 dark:hover:text-slate-200"
              aria-label="Select all messages"
              title="Select all"
            >
              <Square className="h-4 w-4" />
            </button>

            <div className="flex flex-1 items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onQuickFilterChange(tab.id)}
                  className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    quickFilter === tab.id
                      ? 'bg-white text-orange-700 shadow-xs dark:bg-slate-900 dark:text-orange-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Email List */}
      <div className="scroll-area flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/80">
        {error && (
          <div
            role="alert"
            className="px-6 py-10 text-center text-xs font-medium text-rose-600 dark:text-rose-400"
          >
            {error}
          </div>
        )}

        {!error && loading && rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-slate-400">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : !error && rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
              {hasSearch ? `No results in ${title}` : `No messages in ${title}`}
            </p>
            <p className="mb-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
              {quickFilter !== 'all'
                ? 'Try switching back to All messages or clearing your search.'
                : hasSearch
                  ? 'Nothing in this folder matches that search.'
                  : 'Messages routed or sent here will appear automatically.'}
            </p>
            {quickFilter === 'all' && !hasSearch && (
              <button
                type="button"
                onClick={onOpenCompose}
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
              >
                Compose Email
              </button>
            )}
          </div>
        ) : (
          <>
            {rows.map((row) => {
              const isSelected = row.id === selectedId;
              const isChecked = checkedIds.includes(row.id);
              const sender = row.from ?? { name: null, email: '(undisclosed)' };
              const headline = showRecipient
                ? `To: ${row.to[0]?.email ?? '(no recipient)'}`
                : (sender.name ?? sender.email);

              return (
                <div
                  key={row.id}
                  onClick={() => onSelect(row)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(row);
                    }
                  }}
                  className={`group flex cursor-pointer items-start gap-2.5 px-3.5 py-3 transition-colors ${
                    isSelected
                      ? 'bg-orange-50/80 dark:bg-orange-950/40'
                      : !row.seen
                        ? 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                        : 'bg-slate-50/40 hover:bg-slate-100/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Selection checkbox + Star */}
                  <div
                    className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => toggleOne(row.id)}
                      className={`rounded p-0.5 transition-colors ${
                        isChecked
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400'
                      }`}
                      aria-label={`Select message ${row.subject}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStar(row)}
                      className={`rounded p-0.5 transition-colors ${
                        row.flagged
                          ? 'text-amber-500'
                          : 'text-slate-300 hover:text-amber-500 dark:text-slate-600'
                      }`}
                      aria-label={row.flagged ? 'Remove star' : 'Star message'}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={row.flagged ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  {/* Message Summary Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          !row.seen
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-medium text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {headline}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                        {formatEmailTimestamp(row.receivedAt)}
                      </span>
                    </div>

                    <div
                      className={`mb-0.5 truncate text-xs ${
                        !row.seen
                          ? 'font-semibold text-orange-700 dark:text-orange-400'
                          : 'font-medium text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {row.subject || '(No subject)'}
                    </div>

                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {row.preview || (showRecipient ? 'No content' : '')}
                    </p>

                    {row.hasAttachment && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Paperclip className="h-3 w-3" />
                        <span>attachment</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {nextPosition !== null && !loading && (
              <div className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={onLoadOlder}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Load older messages
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
