'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button, Field, TextInput } from '@/components/ui';

export interface ComposePrefill {
  mode: 'new' | 'reply' | 'reply-all' | 'forward';
  to: string[];
  cc: string[];
  subject: string;
  quoted: string;
  originId: string | null;
}

interface Identity {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
}

interface Attachment {
  blobId: string;
  filename: string;
  contentType: string;
  size?: number;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * The composer.
 *
 * Plain text or source HTML (the preview is a sandboxed view of the HTML
 * you type — it never runs it), attachments straight into Stalwart's
 * blob store, drafts that keep when the tab closes (saved as a JMAP
 * draft), and a send that means what it says: Stalwart's submission.
 */
export function Composer({
  prefill,
  identities,
}: {
  prefill: ComposePrefill;
  identities: Identity[];
}) {
  const router = useRouter();
  const [to, setTo] = useState(prefill.to.join(', '));
  const [cc, setCc] = useState(prefill.cc.join(', '));
  const [subject, setSubject] = useState(prefill.subject);
  const [text, setText] = useState(prefill.quoted);
  const [htmlMode, setHtmlMode] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function splitList(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  async function saveDraft() {
    if (!to && !subject && !text) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'draft',
          draftId: draftId ?? undefined,
          to: splitList(to),
          subject,
          text: htmlMode ? undefined : text,
          html: htmlMode ? text : undefined,
        }),
      });
      const body = (await response.json()) as { draftId?: string; error?: string };
      if (response.ok) {
        setDraftId(body.draftId ?? null);
        setNotice('Draft saved.');
      } else {
        setNotice(body.error ?? 'The draft could not be saved.');
      }
    } catch {
      setNotice('The draft could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  // Draft autosave: a quiet save five seconds after you stop typing, so a
  // closed tab loses nothing.
  useEffect(() => {
    if (done || uploading || busy) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void saveDraft();
    }, 5_000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, cc, subject, text, attachments, done, uploading, busy]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setNotice(null);
    for (const file of Array.from(files)) {
      try {
        const base64 = toBase64(await file.arrayBuffer());
        const response = await fetch('/api/compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            op: 'upload',
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            dataBase64: base64,
          }),
        });
        const body = (await response.json()) as {
          attachments?: Attachment[];
          error?: string;
        };
        if (response.ok && body.attachments) {
          setAttachments((current) => [...current, ...body.attachments!]);
        } else {
          setNotice(body.error ?? `Could not attach ${file.name}.`);
        }
      } catch {
        setNotice(`Could not attach ${file.name}.`);
      }
    }
    setUploading(false);
  }

  async function send() {
    const recipients = splitList(to);
    if (!recipients.length) {
      setNotice('Where to, though? A recipient or two.');
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'send',
          to: recipients,
          cc: splitList(cc),
          subject,
          text: htmlMode ? undefined : text,
          html: htmlMode ? text : undefined,
          attachments,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (response.ok) {
        setDone(true);
        setNotice('Sent — Stalwart has it.');
        setTimeout(() => {
          router.push('/mail/inbox');
          router.refresh();
        }, 600);
      } else {
        setNotice(body.error ?? 'The send did not go through.');
      }
    } catch {
      setNotice('The send did not go through.');
    } finally {
      setSending(false);
    }
  }

  const modeLabel =
    prefill.mode === 'new'
      ? 'New message'
      : prefill.mode === 'reply'
        ? 'Reply'
        : prefill.mode === 'reply-all'
          ? 'Reply all'
          : 'Forward';

  if (minimized) {
    return (
      <div className="fixed right-4 bottom-0 z-10 w-96 rounded-t-lg border border-b-0 border-rail bg-surface p-3 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="text-sm font-medium text-text"
          >
            {modeLabel}
            {subject ? ` — ${subject}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="text-xs text-accent hover:underline"
          >
            Restore
          </button>
        </div>
        <button
          type="button"
          onClick={() => void saveDraft()}
          className="mt-1 text-xs text-text-dim hover:underline"
        >
          Save as draft
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">{modeLabel}</h1>
        <div className="flex items-center gap-2">
          <Link href="/mail/inbox" className="text-xs text-text-dim hover:underline">
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="rounded border border-rail px-2 py-1 text-xs text-text-muted hover:bg-surface-2"
          >
            Minimize
          </button>
        </div>
      </div>

      <section className="mt-4 space-y-3 rounded-lg border border-rail bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From">
            <select
              defaultValue={
                identities.find((identity) => identity.isDefault)?.id ??
                identities[0]?.id ??
                ''
              }
              className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
            >
              {identities.map((identity) => (
                <option key={identity.id} value={identity.id}>
                  {identity.name || identity.email}
                </option>
              ))}
              {identities.length === 0 ? <option value="">(default)</option> : null}
            </select>
          </Field>
          <Field label="To">
            <TextInput
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="name@example.com, …"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CC">
            <TextInput
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="optional"
            />
          </Field>
          <Field label="Subject">
            <TextInput
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Message</span>
            <button
              type="button"
              onClick={() => setHtmlMode((current) => !current)}
              className="text-xs text-accent hover:underline"
            >
              {htmlMode ? 'Write plain text' : 'Write HTML'}
            </button>
          </div>
          {htmlMode ? (
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full rounded border border-rail bg-surface-2 p-3 font-mono text-xs outline-none focus:border-rail-light"
              placeholder="<p>…</p>"
            />
          ) : (
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              className="w-full rounded border border-rail bg-surface p-3 text-sm outline-none focus:border-rail-light"
            />
          )}
          {htmlMode && text ? (
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-text-dim uppercase">
                Preview
              </p>
              <iframe
                title="Preview"
                sandbox=""
                srcDoc={text}
                style={{ width: '100%', border: '1px solid var(--rail)', minHeight: 160 }}
              />
            </div>
          ) : null}
        </div>

        {attachments.length > 0 || uploading ? (
          <div>
            <p className="mb-1 text-xs font-medium text-text-muted">Attachments</p>
            <ul className="space-y-1">
              {attachments.map((attachment, index) => (
                <li
                  key={attachment.blobId + index}
                  className="flex items-center justify-between rounded border border-rail px-3 py-1.5 text-sm"
                >
                  <span className="truncate">📎 {attachment.filename}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter(
                          (entry) => entry.blobId !== attachment.blobId,
                        ),
                      )
                    }
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {notice ? (
          <p className={`text-sm ${done ? 'text-success' : 'text-text-muted'}`}>
            {notice}
          </p>
        ) : null}

        <div className="flex items-center gap-2 border-t border-rail pt-3">
          <Button type="button" onClick={() => void send()} disabled={sending || done}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
          <Button type="button" onClick={() => void saveDraft()} disabled={busy || done}>
            Save draft
          </Button>
          <label className="ml-auto cursor-pointer text-xs text-text-muted hover:text-text">
            {uploading ? 'Attaching…' : 'Attach files'}
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void addFiles(event.target.files)}
            />
          </label>
        </div>
      </section>
    </main>
  );
}
