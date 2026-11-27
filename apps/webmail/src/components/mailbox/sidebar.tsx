'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  Archive,
  Check,
  FileText,
  Folder,
  FolderPlus,
  Inbox,
  LayoutTemplate,
  MailWarning,
  Pencil,
  PenSquare,
  Plus,
  Send,
  Settings,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import { customFolders, findSystemMailbox } from '@/lib/mailbox/folders';
import { FOLDER_COLORS } from '@/lib/mailbox/colors';
import type { WorkspacePage } from '@/lib/mailbox/types';
import type { Mailbox } from '@/lib/mailbox/types';

interface SidebarProps {
  openMobile: boolean;
  onCloseMobile: () => void;
  activeFolder: string;
  onOpenFolder: (slug: string) => void;
  onOpenCompose: () => void;
  activePage: WorkspacePage | null;
  onOpenPage: (page: WorkspacePage) => void;
  mailboxes: Mailbox[];
  /** The app-side paint per custom mailbox id (hex). */
  colorFor: Record<string, string>;
  onCreateFolder: (name: string, color: string) => Promise<void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDestroyFolder: (id: string) => Promise<void>;
}

/** The Workspace rows: the account's pages, in-app. */
const workspaceItems: Array<{
  page: WorkspacePage;
  label: string;
  icon: typeof Settings;
}> = [
  { page: 'settings', label: 'Settings', icon: Settings },
  { page: 'templates', label: 'Templates', icon: LayoutTemplate },
  { page: 'contacts', label: 'Contacts', icon: Users },
];

/**
 * The rail: the brand, the compose button, the account's folders.
 *
 * The seven standard rows are the Stalwart roles, mapped to the URL slugs
 * the router understands; the Folders group is whatever the account made
 * itself — created in a small dialog that also picks the folder's paint,
 * renamed and deleted in place. The Workspace group leaves the app to
 * the settings and templates pages. No labels, no notification settings —
 * those have no back end.
 */
export function Sidebar({
  openMobile,
  onCloseMobile,
  activeFolder,
  onOpenFolder,
  onOpenCompose,
  activePage,
  onOpenPage,
  mailboxes,
  colorFor,
  onCreateFolder,
  onRenameFolder,
  onDestroyFolder,
}: SidebarProps) {
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0].value);
  const [creating, setCreating] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [folderError, setFolderError] = useState('');

  const inboxUnread = findSystemMailbox(mailboxes, 'inbox')?.unreadEmails ?? 0;
  const draftsCount = findSystemMailbox(mailboxes, 'drafts')?.totalEmails ?? 0;
  const spamCount = findSystemMailbox(mailboxes, 'spam')?.totalEmails ?? 0;
  const trashCount = findSystemMailbox(mailboxes, 'trash')?.totalEmails ?? 0;

  const systemFolders = [
    { key: 'inbox', label: 'Inbox', icon: Inbox, count: inboxUnread, highlight: inboxUnread > 0 },
    { key: 'starred', label: 'Starred', icon: Star, count: 0, highlight: false },
    { key: 'sent', label: 'Sent', icon: Send, count: 0, highlight: false },
    { key: 'drafts', label: 'Drafts', icon: FileText, count: draftsCount, highlight: false },
    { key: 'archive', label: 'Archive', icon: Archive, count: 0, highlight: false },
    { key: 'spam', label: 'Spam', icon: MailWarning, count: spamCount, highlight: false },
    { key: 'trash', label: 'Trash', icon: Trash2, count: trashCount, highlight: false },
  ];
  const folders = customFolders(mailboxes);

  function openNewFolder() {
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0].value);
    setFolderError('');
    setNewFolderOpen(true);
  }

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name || creating) return;
    setFolderError('');
    setCreating(true);
    try {
      await onCreateFolder(name, newFolderColor);
      setNewFolderOpen(false);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'The folder could not be created.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRenameFolderSubmit(e: FormEvent, folderId: string) {
    e.preventDefault();
    const name = editingFolderName.trim();
    if (!name) return;
    setFolderError('');
    try {
      await onRenameFolder(folderId, name);
      setEditingFolderId(null);
      setEditingFolderName('');
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'The rename could not be saved.');
    }
  }

  async function handleDeleteFolder(folder: Mailbox) {
    setFolderError('');
    try {
      await onDestroyFolder(folder.id);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'The folder could not be deleted.');
    }
  }

  function handleFolderClick(slug: string) {
    onOpenFolder(slug);
    onCloseMobile();
  }

  const sidebarContent = (
    <div className="flex h-full select-none flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="FIDScript"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg"
          />
          <span className="truncate font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
            fidscript webmail
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Primary Compose Action */}
      <div className="shrink-0 p-4">
        <button
          type="button"
          onClick={() => {
            onOpenCompose();
            onCloseMobile();
          }}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 active:bg-orange-800"
        >
          <PenSquare className="h-4 w-4 shrink-0" />
          <span>Compose</span>
        </button>
      </div>

      {/* Scrollable Navigation Groups */}
      <nav
        className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 scroll-area"
        aria-label="Mailbox navigation"
      >
        {folderError && (
          <div
            role="alert"
            className="px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
          >
            {folderError}
          </div>
        )}

        {/* Core Folders */}
        <div>
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">
            Mailbox
          </div>
          <ul className="space-y-0.5">
            {systemFolders.map((item) => {
              const Icon = item.icon;
              // A Workspace page owns the highlight; the folder rows go quiet.
              const isActive = activePage === null && activeFolder === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => handleFolderClick(item.key)}
                    className={`flex min-h-[40px] w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count > 0 && (
                      <span
                        className={`shrink-0 font-mono text-xs tabular-nums ${
                          item.highlight
                            ? 'font-semibold text-orange-600 dark:text-orange-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Custom Folders */}
        <div>
          <div className="mb-1.5 flex items-center justify-between px-2.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">
              Folders
            </span>
            <button
              type="button"
              onClick={openNewFolder}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400"
              aria-label="Create custom folder"
              title="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className="space-y-0.5">
            {folders.map((folder) => {
              const slug = `id-${folder.id}`;
              const isActive = activePage === null && activeFolder === slug;
              const paint = colorFor[folder.id];

              if (editingFolderId === folder.id) {
                return (
                  <li key={folder.id} className="px-1 py-1">
                    <form
                      onSubmit={(e) => handleRenameFolderSubmit(e, folder.id)}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        maxLength={40}
                        className="min-w-0 flex-1 rounded-md border border-orange-500 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none dark:bg-slate-950 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        className="p-1 text-orange-600 hover:text-orange-700"
                        aria-label="Confirm rename"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFolderId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        aria-label="Cancel rename"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </li>
                );
              }

              return (
                <li key={folder.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => handleFolderClick(slug)}
                    className={`flex min-h-[40px] min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                        <Folder
                          className={`h-4 w-4 ${
                            paint
                              ? ''
                              : isActive
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                          style={paint ? { color: paint } : undefined}
                        />
                        {paint && !isActive && (
                          <span
                            aria-hidden
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white dark:border-slate-900"
                            style={{ backgroundColor: paint }}
                          />
                        )}
                      </span>
                      <span className="truncate">{folder.name}</span>
                    </span>
                    {folder.totalEmails > 0 && (
                      <span className="hidden shrink-0 font-mono text-xs tabular-nums text-slate-400 group-hover:hidden dark:text-slate-500">
                        {folder.totalEmails}
                      </span>
                    )}
                  </button>
                  <div className="hidden shrink-0 items-center gap-0.5 pr-1 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolderId(folder.id);
                        setEditingFolderName(folder.name);
                      }}
                      className="rounded p-1 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400"
                      aria-label={`Rename ${folder.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFolder(folder)}
                      className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      aria-label={`Delete ${folder.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {!newFolderOpen && (
            <button
              type="button"
              onClick={openNewFolder}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/40"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Add folder</span>
            </button>
          )}
        </div>

        {/* Workspace: the account's pages, inside the app. */}
        <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">
            Workspace
          </div>
          <ul className="space-y-0.5">
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.page;
              return (
                <li key={item.page}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPage(item.page);
                      onCloseMobile();
                    }}
                    className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden h-full w-[260px] shrink-0 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {openMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[280px] max-w-[85vw] shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* New-folder dialog: name, a paint, done. */}
      {newFolderOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onClick={() => setNewFolderOpen(false)}
        >
          <form
            onSubmit={handleCreateFolder}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                New folder
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                A folder under your mailbox, with a colour of its own.
              </p>
            </div>

            <div>
              <label
                htmlFor="new-folder-name"
                className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Name
              </label>
              <input
                id="new-folder-name"
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="For example: Newsletters"
                maxLength={40}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Colour
              </span>
              <div className="flex items-center gap-2.5">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewFolderColor(c.value)}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      newFolderColor === c.value
                        ? 'ring-2 ring-offset-2 ring-slate-900 ring-offset-white scale-110 dark:ring-slate-100 dark:ring-offset-slate-900'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.name}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {folderError && (
              <p
                role="alert"
                className="text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                {folderError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setNewFolderOpen(false)}
                className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim() || creating}
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create folder'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
