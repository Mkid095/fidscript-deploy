'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import {
  FileText,
  Film,
  Image as ImageIcon,
  Minus,
  Music,
  Paperclip,
  Save,
  Send,
  X,
} from 'lucide-react';

import {
  ComposeAttachment,
  MailboxApiError,
  uploadAttachment,
} from '@/lib/mailbox/api';
import type { ComposeInitial, Identity } from '@/lib/mailbox/types';

export interface ComposePayload {
  /** The saved draft being edited; the app retires it after a send. */
  draftId?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  /** An HTML body to send alongside the text (e.g. a template). */
  html?: string;
  identityId: string | null;
  attachments: ComposeAttachment[];
}

export type ComposeTarget = 'send' | 'draft';

interface ComposeModalProps {
  identities: Identity[];
  initial: ComposeInitial | null;
  onClose: () => void;
  /** Sends or saves; a draft save answers with the (possibly new) draft id. */
  onSubmit: (
    payload: ComposePayload,
    target: ComposeTarget,
  ) => Promise<{ draftId?: string }>;
}

interface LocalAttachment {
  blobId: string;
  filename: string;
  contentType: string;
  size: number;
  /** A local object URL for a freshly uploaded file; null for prefill. */
  previewUrl: string | null;
  /** Prefilled from a draft being edited: it rides along, it does not go. */
  locked: boolean;
}

const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_BYTES = 6_000_000;

function kindIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon;
  if (type === 'application/pdf') return FileText;
  if (type.startsWith('audio/')) return Music;
  if (type.startsWith('video/')) return Film;
  return FileText;
}

/**
 * The composer, in the shape of a professional mail client: a panel
 * floating out of the bottom-right corner — not a backdrop-blanked modal —
 * with Gmail's row grammar (From, To, + Cc + Bcc, Subject), attachment
 * chips, the signature toolbar, and a footer that sends.
 *
 * Collapsing shrinks it to the corner bar, the way Gmail does; closing a
 * dirty message offers to keep, discard, or save. On the phone it is a
 * full-screen sheet, because that is where the thumb lives.
 */
export function ComposeModal({
  identities,
  initial,
  onClose,
  onSubmit,
}: ComposeModalProps) {
  const editingDraft = Boolean(initial?.draftId);
  const [draftId, setDraftId] = useState<string | undefined>(
    initial?.draftId,
  );
  const [from, setFrom] = useState<string>(
    identities.find((i) => i.isDefault)?.id ?? identities[0]?.id ?? '',
  );
  const [to, setTo] = useState(initial?.to ?? '');
  const [cc, setCc] = useState(initial?.cc ?? '');
  const [showCc, setShowCc] = useState(Boolean(initial?.cc));
  const [showBcc, setShowBcc] = useState(false);
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [attachments, setAttachments] = useState<LocalAttachment[]>(
    (initial?.attachments ?? []).map((a) => ({
      blobId: a.blobId,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
      previewUrl: null,
      locked: editingDraft,
    })),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // A template, when the composer is opened from one: its HTML is what
  // gets sent; the textarea carries the readable fallback.
  const [templateHtml, setTemplateHtml] = useState(initial?.html ?? '');
  const [templateName, setTemplateName] = useState(initial?.templateName ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const closeRef = useRef<() => void>(() => {});

  const activeIdentity = identities.find((i) => i.id === from) ?? null;
  const signature = activeIdentity?.signatureText ?? null;

  const hasContent =
    to.trim() !== '' ||
    cc.trim() !== '' ||
    bcc.trim() !== '' ||
    subject.trim() !== '' ||
    text.trim() !== '' ||
    attachments.length > 0;

  const title = useMemo(() => {
    switch (initial?.mode) {
      case 'reply':
        return 'Reply';
      case 'forward':
        return 'Forward';
      case 'draft':
        return 'Draft';
      default:
        return 'New message';
    }
  }, [initial?.mode]);

  function revokePreviews() {
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
    previewUrlsRef.current = [];
  }

  function handleClose() {
    if (hasContent) {
      setConfirmDiscard(true);
      return;
    }
    revokePreviews();
    onClose();
  }
  closeRef.current = handleClose;

  // Escape closes, the way a real compose does.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError('');
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (attachments.length >= MAX_ATTACHMENTS) {
          setError(`Maximum ${MAX_ATTACHMENTS} attachments per email.`);
          break;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setError(`"${file.name}" exceeds the 6 MB attachment limit.`);
          continue;
        }
        const uploaded = await uploadAttachment(file);
        const attachment = uploaded.attachments[0];
        if (!attachment) continue;
        const previewUrl = attachment.contentType.startsWith('image/')
          ? URL.createObjectURL(file)
          : null;
        if (previewUrl) previewUrlsRef.current.push(previewUrl);
        setAttachments((prev) => [
          ...prev,
          {
            blobId: attachment.blobId,
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            previewUrl,
            locked: false,
          },
        ]);
      }
    } catch (err) {
      setError(
        err instanceof MailboxApiError || err instanceof Error
          ? err.message
          : 'An attachment could not be read.',
      );
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    void processFiles(e.dataTransfer.files);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (u) => u !== item.previewUrl,
        );
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function insertSignature() {
    if (!signature) return;
    setText((prev) => (prev.trim() ? `${prev.replace(/\n*$/, '')}\n\n${signature}` : signature));
  }

  function parseAddresses(value: string): string[] {
    return value
      .split(/[,;\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function buildPayload(target: ComposeTarget): Promise<ComposePayload> {
    const toAddresses = parseAddresses(to);
    if (target === 'send' && toAddresses.length === 0) {
      return Promise.reject(new Error('Enter at least one recipient in To.'));
    }
    return Promise.resolve({
      draftId,
      to: toAddresses,
      cc: parseAddresses(cc),
      bcc: parseAddresses(bcc),
      subject: subject.trim(),
      text,
      html: templateHtml || undefined,
      identityId: from || null,
      attachments: attachments.map(
        ({ blobId, filename, contentType, size }) => ({
          blobId,
          filename,
          contentType,
          size,
        }),
      ),
    });
  }

  async function handleSend() {
    setError('');
    setSubmitting(true);
    try {
      const payload = await buildPayload('send');
      await onSubmit(payload, 'send');
      revokePreviews();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The message could not be sent.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    setError('');
    setSubmitting(true);
    try {
      const payload = await buildPayload('draft');
      const res = await onSubmit(payload, 'draft');
      if (res.draftId) setDraftId(res.draftId);
      setSavedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The draft could not be saved.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  const rowLabel = 'w-14 shrink-0 pr-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400';
  const rowInput =
    'min-w-0 flex-1 bg-transparent py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100';
  const rowToggle =
    'shrink-0 px-2 py-3.5 text-xs font-medium text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400';

  return (
    <>
      {collapsed ? (
        // The corner bar: what Gmail leaves behind when the panel is
        // minimized — expand, the subject, and the way out.
        <div className="fixed bottom-0 right-0 z-50 flex h-9 w-full items-center gap-2 border-t border-slate-200 bg-white px-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:w-auto sm:rounded-tl-xl sm:border sm:border-t-0 sm:border-l-0 sm:px-3">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Expand composer"
            title="Expand"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200 sm:flex-none">
            {subject || title}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close composer"
            title="Discard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className="fixed inset-0 z-50 sm:inset-auto sm:bottom-0 sm:right-0"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className={`flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 sm:pointer-events-auto sm:h-auto sm:max-h-[92vh] sm:w-[540px] sm:max-w-full sm:rounded-t-xl sm:border sm:border-b-0 sm:border-slate-200 sm:dark:border-slate-800 ${
              isDragging ? 'ring-2 ring-orange-500' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                {templateName && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-800">
                    Template: {templateName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Minimize composer"
                  title="Minimize"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Close composer"
                  title="Discard"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Discard banner: the dirty message's three fates. */}
            {confirmDiscard && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2.5 dark:border-orange-900/60 dark:bg-orange-950/40">
                <span className="text-xs text-orange-900 dark:text-orange-200">
                  This message is not saved. Keep it or discard it.
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(false)}
                    className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Keep writing
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveDraft()}
                    className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      revokePreviews();
                      onClose();
                    }}
                    className="rounded px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-white/80 dark:text-rose-400 dark:hover:bg-slate-800"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            {/* The form */}
            <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
                {/* From — Gmail's first row; a picker only when the
                    account has more than one identity. */}
                {identities.length > 0 && (
                  <div className="flex items-center border-b border-slate-100 pl-4 dark:border-slate-800/60">
                    {identities.length > 1 ? (
                      <select
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        aria-label="From"
                        className="w-full cursor-pointer border-none bg-transparent py-2.5 text-xs font-medium text-slate-700 focus:outline-none dark:text-slate-200"
                      >
                        {identities.map((identity) => (
                          <option key={identity.id} value={identity.id}>
                            {identity.name
                              ? `${identity.name} <${identity.email}>`
                              : identity.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full truncate py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {activeIdentity?.name
                          ? `${activeIdentity.name} <${activeIdentity.email}>`
                          : activeIdentity?.email}
                      </div>
                    )}
                  </div>
                )}

                {/* To, with the Cc/Bcc affordance on the row itself. */}
                <div className="border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center pl-4">
                    <label htmlFor="compose-to" className={rowLabel}>
                      To
                    </label>
                    <input
                      id="compose-to"
                      type="text"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="recipients"
                      className={rowInput}
                      autoComplete="off"
                    />
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        className={rowToggle}
                      >
                        + Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() => setShowBcc(true)}
                        className={rowToggle}
                      >
                        + Bcc
                      </button>
                    )}
                  </div>

                  {showCc && (
                    <div className="flex items-center border-t border-slate-100 pl-4 dark:border-slate-800/60">
                      <label htmlFor="compose-cc" className={rowLabel}>
                        Cc
                      </label>
                      <input
                        id="compose-cc"
                        type="text"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        placeholder="cc recipients"
                        className={rowInput}
                        autoComplete="off"
                      />
                    </div>
                  )}

                  {showBcc && (
                    <div className="flex items-center border-t border-slate-100 pl-4 dark:border-slate-800/60">
                      <label htmlFor="compose-bcc" className={rowLabel}>
                        Bcc
                      </label>
                      <input
                        id="compose-bcc"
                        type="text"
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        placeholder="bcc recipients"
                        className={rowInput}
                        autoComplete="off"
                      />
                    </div>
                  )}
                </div>

                {/* Attachment chips, where Gmail keeps them: under the
                    recipients, over the subject. */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800/60">
                    {attachments.map((attachment, index) => {
                      const Icon = kindIcon(attachment.contentType);
                      return (
                        <span
                          key={`${attachment.blobId}-${index}`}
                          title={`${attachment.filename} — ${attachment.locked ? 'kept with this draft' : 'click × to remove'}`}
                          className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                        >
                          {attachment.previewUrl ? (
                            <img
                              src={attachment.previewUrl}
                              alt={attachment.filename}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                          )}
                          {!attachment.locked && (
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-900/70 text-white group-hover:flex"
                              aria-label={`Remove ${attachment.filename}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                    <span className="self-center text-[11px] text-slate-400 dark:text-slate-500">
                      {attachments.length} attachment
                      {attachments.length === 1 ? '' : 's'}
                      {attachments.some((a) => a.locked) &&
                        ' (the draft’s are kept)'}
                    </span>
                  </div>
                )}

                {/* Subject */}
                <div className="border-b border-slate-200 pl-4 dark:border-slate-800">
                  <label htmlFor="compose-subject" className={rowLabel}>
                    Subject
                  </label>
                  <input
                    id="compose-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className={`${rowInput} font-medium`}
                    autoComplete="off"
                  />
                </div>

                {/* Body */}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write your message"
                  rows={10}
                  className="min-h-[220px] w-full resize-y border-none bg-white p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Toolbar: what the mail row keeps under the body. */}
              <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
                {signature && (
                  <button
                    type="button"
                    onClick={insertSignature}
                    className="rounded px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Insert your signature"
                  >
                    Insert signature
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
                  className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/70 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Attach files"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {uploading ? 'Attaching…' : 'Attach files'}
                </button>
                {savedAt && (
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">
                    Draft saved {savedAt}
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  void processFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />

              {/* Footer: the send side. */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSaveDraft()}
                  className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/70 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save draft</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-w-[64px] items-center justify-center gap-1.5 rounded-md bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Sending…' : 'Send'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
