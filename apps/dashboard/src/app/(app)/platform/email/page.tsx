'use client';
/* eslint-disable import/order */

import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, Attachment01Icon } from '@hugeicons/core-free-icons';

/**
 * Platform mailbox management — admin view.
 *
 * This is for the platform's own mailboxes (alert@, noreply@, postmaster@,
 * and any custom mailboxes the admin creates on the PLATFORM_DOMAIN). The
 * view is a typical 3-pane email client: mailbox list (left), message
 * list (centre), message detail (right).
 *
 * Distinct from /email (the per-project email-domain management page) —
 * that page is for tenant projects adding their own mail domains.
 *
 * Why this lives at /platform/email (not /email):
 *   The /email route is the project-side email page (DNS / domain / mailboxes
 *   owned by a tenant project). Platform mailboxes are NOT a project concept
 *   — they're part of the platform's own infrastructure and only platform
 *   admins (role=ADMIN) should see them. Putting it under /platform/ makes
 *   the scope obvious in the URL and lets us gate the whole subtree to
 *   admins later via a parent layout.
 *
 * Real-time: we poll every 5s for new messages in the current folder
 * (cheap on Stalwart's side — Email/query is indexed). The proper
 *   implementation uses JMAP Push; deferred until we're past the
 *   "make it work" milestone. (See docs/IMPLEMENTATION_ROADMAP.md F08.)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import type { PlatformMailboxMessage, PlatformMailboxSummary, StorageBackend } from '@fidscript/sdk';

import { useAuth } from '@/contexts/auth-context';

type Folder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';

const FOLDER_LABELS: Record<Folder, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  trash: 'Trash',
  junk: 'Junk',
  archive: 'Archive',
};

const FOLDER_ICONS: Record<Folder, string> = {
  inbox: '',
  sent: '',
  drafts: '✎',
  trash: '🗑',
  junk: '',
  archive: '◰',
};

const STORAGE_BACKEND_LABELS: Record<StorageBackend, string> = {
  internal: 'Internal (VPS)',
  telegram: 'Telegram',
  cloudinary: 'Cloudinary',
};

function timeAgo(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default function PlatformEmailPage() {
  const sdk = useAuth().getSdk();
  const [mailboxes, setMailboxes] = useState<PlatformMailboxSummary[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<string>('');
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [messages, setMessages] = useState<PlatformMailboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<PlatformMailboxMessage | null>(null);
  const [loadingMailboxes, setLoadingMailboxes] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newLocal, setNewLocal] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [createResult, setCreateResult] = useState<{ email: string; password: string } | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [storageBackend, setStorageBackend] = useState<StorageBackend>('internal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the platform mailboxes
  const loadMailboxes = useCallback(async () => {
    setLoadingMailboxes(true);
    setError(null);
    try {
      const data = await sdk.email.admin.list();
      setMailboxes(data.mailboxes ?? []);
      if (!selectedLocal && data.mailboxes?.length) {
        setSelectedLocal(data.mailboxes[0].name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load mailboxes');
    } finally {
      setLoadingMailboxes(false);
    }
  }, [sdk, selectedLocal]);

  // Fetch messages in the active folder of the selected mailbox
  const loadMessages = useCallback(async () => {
    if (!selectedLocal) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await sdk.email.admin.listMessages(selectedLocal, { folder: activeFolder, limit: 50 });
      setMessages(data.messages ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [sdk, selectedLocal, activeFolder]);

  // Polling: re-fetch messages every 5s while on this page
  useEffect(() => { loadMailboxes(); }, [loadMailboxes]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    const id = setInterval(loadMessages, 5_000);
    return () => clearInterval(id);
  }, [loadMessages]);

  async function openMessage(msg: PlatformMailboxMessage) {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      // Mark as read optimistically
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      try {
        await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { isRead: true });
      } catch { /* optimistic; ignore failure */ }
    }
    // Fetch full body
    try {
      const full = await sdk.email.admin.getMessage(msg.mailbox, msg.id);
      setSelectedMessage(full);
    } catch { /* keep preview-only message */ }
  }

  async function starMessage(msg: PlatformMailboxMessage) {
    const newStar = !msg.isStarred;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: newStar } : m));
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage(prev => prev ? { ...prev, isStarred: newStar } : prev);
    }
    try {
      await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { isStarred: newStar });
    } catch { /* ignore */ }
  }

  async function moveMessage(msg: PlatformMailboxMessage, folder: Folder) {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    try {
      // ponytail: SDK moveTo type is narrower than our local Folder (no sent/drafts via API).
      // sent/drafts are write-time concerns; the UI surfaces trash/junk/archive only.
      const moveTarget = folder as 'inbox' | 'trash' | 'junk' | 'archive';
      await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { moveTo: moveTarget });
    } catch { /* ignore */ }
  }

  async function deleteMessage(msg: PlatformMailboxMessage) {
    if (!confirm(`Delete "${msg.subject}"? This cannot be undone.`)) return;
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    try {
      await sdk.email.admin.deleteMessage(msg.mailbox, msg.id);
    } catch { /* ignore */ }
  }

  async function handleCreateMailbox(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocal.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const data = await sdk.email.admin.create({
        localPart: newLocal.trim(),
        displayName: newDisplay.trim() || undefined,
      });
      setCreateResult({ email: data.mailbox.email, password: data.password });
      setNewLocal('');
      setNewDisplay('');
      await loadMailboxes();
      if (data.mailbox?.name) setSelectedLocal(data.mailbox.name);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create mailbox');
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      // ponytail: backend send endpoint accepts attachments inline as base64.
      // Will move to multipart/form-data when storage backend pipeline ships (F08).
      // Encode files as base64 for the JSON payload
      const attachments = await Promise.all(
        composeFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return { filename: file.name, mimeType: file.type || 'application/octet-stream', data: base64 };
        }),
      );

      // ponytail: backend send endpoint accepts storageBackend + attachments inline as
      // base64. The SDK's sendMail() type doesn't yet include them — backend processes
      // them as optional fields. Will be lifted to the SDK type when storage backend
      // pipeline ships (F08).
      await sdk.email.admin.sendMail({
        fromLocal: selectedLocal || undefined,
        to: composeTo,
        subject: composeSubject,
        text: composeBody,
        storageBackend,
        attachments: attachments.length > 0 ? attachments : undefined,
      } as Parameters<typeof sdk.email.admin.sendMail>[0]);
      setComposeTo(''); setComposeSubject(''); setComposeBody('');
      setComposeFiles([]);
      setShowCompose(false);
      setSendResult('Sent');
      setActiveFolder('sent');
    } catch (e) {
      setSendResult(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  }

  if (loadingMailboxes) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Platform Mailboxes</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {mailboxes.length} mailbox{mailboxes.length !== 1 ? 'es' : ''} on {mailboxes[0]?.email?.split('@')[1] ?? 'platform'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowCompose(true)}>
            Compose
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            New Mailbox
          </Button>
        </div>
      </div>

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}
      {sendResult && <p className="text-[var(--success)] mb-4 text-sm">{sendResult}</p>}

      <div className="flex flex-1 gap-3 min-h-0">
        {/* Left: mailbox list */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-1 overflow-y-auto">
          {mailboxes.map(mb => (
            <button
              key={mb.id}
              onClick={() => { setSelectedLocal(mb.name); setSelectedMessage(null); }}
              className={`text-left p-3 rounded-lg border transition-colors ${
                selectedLocal === mb.name
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--text)]'
                  : 'bg-[var(--surface-2)] border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
              }`}
            >
              <div className="text-sm font-medium truncate">{mb.name}</div>
              <div className="text-xs text-[var(--text-muted)] truncate font-mono">{mb.email}</div>
            </button>
          ))}
        </div>

        {/* Center: folder tabs + message list */}
        <div className="w-96 flex-shrink-0 flex flex-col">
          {/* Folder tabs */}
          <div className="flex gap-1 mb-2 border-b border-[var(--rail)]">
            {(['inbox', 'sent', 'drafts', 'junk', 'trash', 'archive'] as Folder[]).map(f => (
              <button
                key={f}
                onClick={() => { setActiveFolder(f); setSelectedMessage(null); }}
                className={`px-3 py-2 text-xs transition-colors border-b-2 ${
                  activeFolder === f
                    ? 'border-[var(--accent)] text-[var(--text)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
                }`}
              >
                {FOLDER_ICONS[f]} {FOLDER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Message list */}
          <Card className="flex-1 overflow-y-auto border border-[var(--rail)] p-0">
            {loadingMessages && !messages.length ? (
              <div className="flex items-center justify-center min-h-48"><Spinner /></div>
            ) : messages.length === 0 ? (
              <EmptyState title={`No ${FOLDER_LABELS[activeFolder].toLowerCase()}`} description="No messages here yet." />
            ) : (
              <div className="divide-y divide-[var(--rail)]">
                {messages.map(m => (
                  <button
                    key={m.id}
                    onClick={() => openMessage(m)}
                    className={`w-full text-left p-3 hover:bg-[var(--rail)] transition-colors ${
                      selectedMessage?.id === m.id ? 'bg-[var(--rail)]' : ''
                    } ${!m.isRead ? 'font-semibold' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--text-muted)] truncate max-w-32">
                        {m.fromName || m.from || '(no sender)'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(m.receivedAt)}</span>
                    </div>
                    <div className="text-sm text-[var(--text)] truncate mb-0.5">{m.subject || '(no subject)'}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{m.preview}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {m.isStarred && <span className="text-[var(--warning)] text-[10px]"></span>}
                      {m.hasAttachments && <span className="text-[var(--text-muted)] text-[10px]"><HugeiconsIcon icon={Attachment01Icon} size={14} strokeWidth={1.5} /></span>}
                      {!m.isRead && <span className="bg-[var(--accent)] w-1.5 h-1.5 rounded-full"></span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <p className="text-xs text-[var(--text-muted)] mt-2 px-1">{total} message{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Right: message detail */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Card className="flex-1 overflow-y-auto border border-[var(--rail)] p-0">
            {!selectedMessage ? (
              <EmptyState title="Select a message" description="Pick a message from the list to view it." />
            ) : (
              <div className="p-5">
                {/* Header */}
                <div className="border-b border-[var(--rail)] pb-3 mb-4">
                  <h2 className="text-lg font-semibold text-[var(--text)] mb-2">{selectedMessage.subject || '(no subject)'}</h2>
                  <div className="text-sm text-[var(--text-muted)] space-y-1">
                    <div><span className="text-[var(--text-muted)]">From:</span> {selectedMessage.fromName ? `${selectedMessage.fromName} <${selectedMessage.from}>` : selectedMessage.from}</div>
                    <div><span className="text-[var(--text-muted)]">To:</span> {selectedMessage.to.join(', ')}</div>
                    {selectedMessage.cc && selectedMessage.cc.length > 0 && (
                      <div><span className="text-[var(--text-muted)]">Cc:</span> {selectedMessage.cc.join(', ')}</div>
                    )}
                    <div><span className="text-[var(--text-muted)]">Received:</span> {new Date(selectedMessage.receivedAt).toLocaleString()}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mb-4 pb-3 border-b border-[var(--rail)]">
                  <Button variant="ghost" size="sm" onClick={() => starMessage(selectedMessage)}>
                    {selectedMessage.isStarred ? ' Unstar' : ' Star'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveMessage(selectedMessage, 'trash')}>
                    🗑 Trash
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveMessage(selectedMessage, 'junk')}>
                     Junk
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveMessage(selectedMessage, 'archive')}>
                    Archive
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => deleteMessage(selectedMessage)}>
                    Delete
                  </Button>
                </div>

                {/* Body */}
                <div className="text-sm text-[var(--text-muted)]">
                  {selectedMessage.bodyHtml ? (
                    <iframe
                      srcDoc={selectedMessage.bodyHtml}
                      className="w-full min-h-96 border-0 bg-white text-[var(--canvas)]"
                      sandbox="allow-same-origin"
                      title="Email body"
                    />
                  ) : selectedMessage.bodyText ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-muted)]">{selectedMessage.bodyText}</pre>
                  ) : (
                    <p className="text-[var(--text-muted)] italic">{selectedMessage.preview || '(empty)'}</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Create Mailbox Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(null); setCreateResult(null); }}
        title="New Platform Mailbox"
      >
        {createResult ? (
          <div>
            <p className="text-sm text-[var(--success)] mb-3">Mailbox <strong>{createResult.email}</strong> created.</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">Initial password (save this — it cannot be recovered):</p>
            <pre className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg p-3 text-xs text-[var(--text)] font-mono break-all">{createResult.password}</pre>
            <div className="flex justify-end mt-4">
              <Button variant="primary" size="sm" onClick={() => { setCreateResult(null); setShowCreate(false); }}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateMailbox} noValidate>
            <div className="mb-3">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Local part (before @)</label>
              <Input
                value={newLocal}
                onChange={e => setNewLocal(e.target.value)}
                placeholder="ops"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Display name (optional)</label>
              <Input
                value={newDisplay}
                onChange={e => setNewDisplay(e.target.value)}
                placeholder="Operations Team"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
              />
            </div>
            {createError && <p className="text-[var(--danger)] text-xs mb-3">{createError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" loading={creating}>
                {creating ? 'Creating…' : 'Create Mailbox'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Compose Modal */}
      <Modal
        isOpen={showCompose}
        onClose={() => { setShowCompose(false); setSendResult(null); setComposeFiles([]); }}
        title="Compose Message"
      >
        <form onSubmit={handleSend} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">To</label>
            <Input
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
              placeholder="user@example.com"
              required
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Subject</label>
            <Input
              value={composeSubject}
              onChange={e => setComposeSubject(e.target.value)}
              placeholder="Subject"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Body</label>
            <textarea
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              placeholder="Write your message…"
              rows={8}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full rounded-lg px-3 py-2 text-sm font-sans"
            />
          </div>

          {/* File attachments */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              id="compose-attachments"
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                setComposeFiles(prev => [...prev, ...files]);
                // Reset so same file can be re-selected
                e.target.value = '';
              }}
            />
            <label
              htmlFor="compose-attachments"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer border border-dashed border-[var(--rail)] hover:border-[var(--accent)] rounded-lg px-3 py-2 transition-colors w-full"
            >
              <span><HugeiconsIcon icon={Attachment01Icon} size={14} strokeWidth={1.5} /></span>
              <span>{composeFiles.length > 0 ? `${composeFiles.length} file${composeFiles.length !== 1 ? 's' : ''} selected` : 'Add attachments'}</span>
            </label>

            {/* Selected file chips */}
            {composeFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {composeFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--rail)] rounded px-2 py-1.5">
                    <span><HugeiconsIcon icon={Attachment01Icon} size={14} strokeWidth={1.5} /></span>
                    <span className="flex-1 truncate text-[var(--text-muted)]">{file.name}</span>
                    <span className="text-[var(--text-muted)]">({formatBytes(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => setComposeFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {composeFiles.length > 0 && storageBackend !== 'internal' && (
              <p className="text-[10px] text-[var(--accent)] mt-1">
                Files will be stored via <strong>{STORAGE_BACKEND_LABELS[storageBackend]}</strong>.
                Configure credentials at <a href="/platform/email/settings" target="_blank" rel="noopener noreferrer" className="underline">Attachment Storage settings</a> if needed.
              </p>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Attachment storage backend</label>
            <select
              value={storageBackend}
              onChange={e => setStorageBackend(e.target.value as StorageBackend)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="internal">Internal (VPS)</option>
              <option value="telegram">Telegram</option>
              <option value="cloudinary">Cloudinary</option>
            </select>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Where attachments uploaded with this mailbox will be stored.
              Defaults to internal VPS storage.
            </p>
          </div>
          {sendResult && <p className="text-[var(--success)] text-xs mb-3">{sendResult}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowCompose(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={sending}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
