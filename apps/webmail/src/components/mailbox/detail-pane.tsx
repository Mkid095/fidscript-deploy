'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  Forward,
  FolderInput,
  LoaderCircle,
  Mail,
  MailOpen,
  Reply,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';

import { moveDestinations, folderTitle } from '@/lib/mailbox/folders';
import {
  addressList,
  formatFullTimestamp,
  initialsFor,
} from '@/lib/mailbox/format';
import type { Mailbox, MessageDetail } from '@/lib/mailbox/types';

import { AttachmentGrid, type PartRef } from './attachment-grid';

interface DetailPaneProps {
  message: MessageDetail | null;
  loading: boolean;
  error: string | null;
  /** The active folder's slug; "drafts" and "trash" change the action bar. */
  folderKey: string;
  mailboxes: Mailbox[];
  onBackMobile: () => void;
  onToggleStar: (id: string) => void;
  onToggleRead: (id: string) => void;
  onMove: (id: string, toMailbox: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (message: MessageDetail) => void;
  onReplyAll: (message: MessageDetail) => void;
  onForward: (message: MessageDetail) => void;
  onEditDraft: (message: MessageDetail) => void;
}

/**
 * The right pane: the selected message's action bar and its content card.
 *
 * The action bar speaks the reference's language — Reply/Forward, or
 * Edit Draft in the drafts folder — and every action is a real move the
 * back end makes: star, read state, folder move, restore, delete. The
 * body renders in a sandboxed frame when it is HTML, plain text when it
 * is not.
 */
export function DetailPane({
  message,
  loading,
  error,
  folderKey,
  mailboxes,
  onBackMobile,
  onToggleStar,
  onToggleRead,
  onMove,
  onRestore,
  onDelete,
  onReply,
  onReplyAll,
  onForward,
  onEditDraft,
}: DetailPaneProps) {
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  if (!message) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-slate-50 p-8 text-center dark:bg-slate-950">
        {loading ? (
          <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
        ) : error ? (
          <p className="max-w-xs text-xs font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : (
          <>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-400">
              <MailOpen className="h-6 w-6" />
            </div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Select a message to read
            </h2>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              Choose any message from the list to read its full text,
              attachments and history here.
            </p>
          </>
        )}
      </div>
    );
  }

  const isDrafts = folderKey === 'drafts';
  const isTrash = folderKey === 'trash';
  const destinations = moveDestinations(mailboxes);

  const attachmentParts: PartRef[] = message.parts
    .map((part, index) => ({ ...part, partRef: part.partId ?? String(index) }))
    .filter((part) => part.isAttachment);

  const senderName =
    message.from?.name?.trim() || message.from?.email || '(undisclosed)';

  return (
    <article className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Detail Action Bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBackMobile}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {isDrafts ? (
            <button
              type="button"
              onClick={() => onEditDraft(message)}
              className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Draft</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onReply(message)}
                className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
              >
                <Reply className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>
              <button
                type="button"
                onClick={() => onForward(message)}
                className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Forward className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Forward</span>
              </button>
              {message.cc.length > 0 && (
                <button
                  type="button"
                  onClick={() => onReplyAll(message)}
                  className="hidden min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 xl:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Reply className="h-3.5 w-3.5" />
                  <span>Reply all</span>
                </button>
              )}
            </>
          )}
        </div>

        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleStar(message.id)}
            className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
              message.flagged ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
            }`}
            aria-label={message.flagged ? 'Unstar message' : 'Star message'}
            title={message.flagged ? 'Starred' : 'Star'}
          >
            <Star
              className="h-4 w-4"
              fill={message.flagged ? 'currentColor' : 'none'}
            />
          </button>

          <button
            type="button"
            onClick={() => onToggleRead(message.id)}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={message.seen ? 'Mark as unread' : 'Mark as read'}
            title={message.seen ? 'Mark as unread' : 'Mark as read'}
          >
            {message.seen ? (
              <Mail className="h-4 w-4" />
            ) : (
              <MailOpen className="h-4 w-4" />
            )}
          </button>

          {/* Move to Folder Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFolderMenuOpen((p) => !p)}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Move to folder"
              title="Move to folder"
            >
              <FolderInput className="h-4 w-4" />
            </button>
            {folderMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                  Move to Folder
                </div>
                {destinations.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => {
                      onMove(message.id, dest.id);
                      setFolderMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{dest.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isTrash && (
            <button
              type="button"
              onClick={() => onRestore(message.id)}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/40"
              aria-label="Restore to Inbox"
              title="Restore to Inbox"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(message.id)}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            aria-label={isTrash ? 'Delete permanently' : 'Move to Trash'}
            title={isTrash ? 'Delete permanently' : 'Move to Trash'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Message Content */}
      <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          {/* Subject & Folder */}
          <div className="space-y-2 border-b border-slate-200 pb-5 dark:border-slate-800">
            <h2 className="text-balance font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {message.subject || '(No subject)'}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Folder: {folderTitle(mailboxes, folderKey)}</span>
              {message.junk && (
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <span aria-hidden="true">·</span>
                  <span>Spam</span>
                </span>
              )}
              {message.flagged && (
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <span aria-hidden="true">·</span>
                  <span>Starred</span>
                </span>
              )}
            </div>
          </div>

          {/* Sender Header */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-600/10 font-display text-xs font-bold text-orange-700 dark:border-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
                {initialsFor(message.from)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {senderName}
                  </span>
                  {message.from && (
                    <span className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                      &lt;{message.from.email}&gt;
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  To: {addressList(message.to) || '(undisclosed)'}
                  {message.cc.length > 0 ? ` · Cc: ${addressList(message.cc)}` : ''}
                </div>
              </div>
            </div>

            <div className="shrink-0 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {formatFullTimestamp(message.receivedAt)}
            </div>
          </div>

          {/* Attachment Previews */}
          {attachmentParts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <AttachmentGrid messageId={message.id} parts={attachmentParts} />
            </div>
          )}

          {/* Body */}
          {message.html ? (
            <iframe
              title="Message body"
              sandbox=""
              srcDoc={message.html}
              className="h-[560px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-800"
            />
          ) : (
            <pre className="max-w-[75ch] whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {message.text ?? message.preview ?? ''}
            </pre>
          )}
        </div>
      </div>
    </article>
  );
}
