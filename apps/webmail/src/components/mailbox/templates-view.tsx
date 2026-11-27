'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  Check,
  Download,
  FilePlus2,
  LayoutTemplate,
  Paperclip,
  Save,
  Send,
  Upload,
} from 'lucide-react';

import { getSettings } from '@/lib/mailbox/api';

interface Template {
  id: string;
  name: string;
  category: string;
  html: string;
  text: string;
  createdBy: string;
}

type Mode = 'rich' | 'blocks' | 'source';

interface Block {
  kind: 'heading' | 'text' | 'button' | 'image' | 'divider' | 'columns';
  text?: string;
  label?: string;
  url?: string;
  image?: string;
  caption?: string;
  left?: string;
  right?: string;
}

interface TemplatesViewProps {
  email: string;
  /** Wired in-app: "use in the composer" opens the composer prefilled. */
  onUseInComposer?: (template: Template) => void;
}

/**
 * Templates and the email designer, in the app's own language.
 *
 * Three ways to build the document — a sandboxed rich editor, email-safe
 * table blocks, or the source — plus a list to choose from and a test
 * send that goes through the real submission path. What is saved is
 * sanitised on the server; what is "used" lands in the composer.
 */
export function TemplatesView({ email, onUseInComposer }: TemplatesViewProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('business');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('rich');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/templates');
    const body = (await res.json().catch(() => ({}))) as {
      templates?: Template[];
      categories?: string[];
      error?: string;
    };
    if (body.error) setError(body.error);
    setTemplates(body.templates ?? []);
    setCategories(body.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Signature: the composer's "Insert signature" pastes this ────────
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState('');
  const [signatureBusy, setSignatureBusy] = useState(false);
  const [signatureNotice, setSignatureNotice] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((shape) => {
        if (cancelled) return;
        const identity = shape.identities[0];
        setSignatureId(identity?.id ?? '');
        setSignature(identity ? identity.signatureText || identity.signatureHtml || '' : '');
      })
      .catch(() => {
        if (!cancelled) setSignature('');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSignature() {
    if (!signatureId) {
      setSignatureError('No identity yet — send or receive a message first.');
      return;
    }
    setSignatureBusy(true);
    setSignatureNotice(null);
    setSignatureError(null);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'identity',
          id: signatureId,
          signatureHtml: signature ?? '',
          signatureText: signature ?? '',
        }),
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? 'The signature did not save.');
      });
      setSignatureNotice('Signature saved.');
    } catch (err) {
      setSignatureError(err instanceof Error ? err.message : 'The signature did not save.');
    } finally {
      setSignatureBusy(false);
    }
  }

  function open(template: Template | null) {
    setActive(template);
    setName(template?.name ?? '');
    setCategory(template?.category ?? 'business');
    setHtml(template?.html ?? '');
    setText(template?.text ?? '');
    setBlocks(template ? parseBlocks(template.html) : []);
    setNotice(null);
  }

  async function save() {
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: active?.id, name, category, html, text }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        template?: Template;
        error?: string;
      };
      if (!res.ok) {
        setNotice(body.error ?? 'The template did not save.');
      } else {
        setNotice(active?.id ? 'Saved.' : 'Created.');
        open(body.template ?? null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendTest(template: { name: string; html: string; text: string }) {
    setNotice(null);
    const res = await fetch('/api/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'send',
        to: [email],
        subject: `Template test: ${template.name || 'untitled'}`,
        html: template.html,
        text: template.text || undefined,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setNotice(
      res.ok
        ? `Sent to ${email} — it is in your inbox as "Template test: ${template.name || 'untitled'}".`
        : body.error ?? 'The test send did not go through.',
    );
  }

  function download(template: Template) {
    const blob = new Blob([template.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importFile(file: File | null) {
    if (!file) return;
    file.text().then((content) => {
      setHtml(content);
      setMode('source');
      open(null);
      setNotice(`Imported ${file.name} into the source view.`);
    });
  }

  const shown = categoryFilter
    ? templates.filter((t) => t.category === categoryFilter)
    : templates;

  return (
    <div className="scroll-area h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Templates
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Email-safe HTML you build once and send many times — or start from.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <Upload className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              <span>Import HTML</span>
              <input
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => importFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              onClick={() => open(null)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>New template</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {notice}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Signature
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                The composer&apos;s &ldquo;Insert signature&rdquo; button pastes this under
                your message.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveSignature()}
              disabled={signatureBusy || signature === null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {signatureBusy ? 'Saving…' : 'Save signature'}
            </button>
          </div>
          {signature === null ? (
            <p className="mt-3 text-xs text-slate-400">Loading your signature…</p>
          ) : (
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={3}
              placeholder={'Best regards,\nYour name'}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          )}
          {signatureNotice && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" /> {signatureNotice}
            </div>
          )}
          {signatureError && (
            <div
              role="alert"
              className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {signatureError}
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          {/* The library */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === ''
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    categoryFilter === c
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : shown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <LayoutTemplate className="mx-auto mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No templates here yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Create one, or take a starter set from the editor.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {shown.map((t) => (
                  <li
                    key={t.id}
                    onClick={() => open(t)}
                    className={`group cursor-pointer rounded-xl border bg-white p-3.5 transition-colors dark:bg-slate-900 ${
                      active?.id === t.id
                        ? 'border-orange-400 ring-1 ring-orange-400/40'
                        : 'border-slate-200 hover:border-orange-300 dark:border-slate-800 dark:hover:border-orange-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {t.name}
                        </p>
                        <p className="text-xs capitalize text-slate-400">{t.category}</p>
                      </div>
                      <div
                        className="flex shrink-0 items-center gap-2 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => void sendTest(t)}
                          className="rounded-md px-2 py-1 font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/40"
                        >
                          Test
                        </button>
                        <button
                          type="button"
                          onClick={() => download(t)}
                          className="rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          Export
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* The designer */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {active?.id ? 'Edit template' : 'New template'}
              </h2>
              {onUseInComposer && (
                <button
                  type="button"
                  disabled={!html.trim()}
                  onClick={() =>
                    onUseInComposer({
                      id: active?.id ?? '',
                      name,
                      category,
                      html,
                      text,
                      createdBy: email,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Use in the composer</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="my-3 flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(['rich', 'blocks', 'source'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    mode === m
                      ? 'bg-white text-orange-700 shadow-xs dark:bg-slate-900 dark:text-orange-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m === 'rich' ? 'Rich text' : m === 'blocks' ? 'Blocks' : 'HTML source'}
                </button>
              ))}
            </div>

            {mode === 'rich' ? <RichEditor value={html} onChange={setHtml} /> : null}

            {mode === 'blocks' ? (
              <BlockBuilder
                blocks={blocks}
                onInsert={(b) => setBlocks((cur) => [...cur, b])}
                onRender={() => setHtml(blocksToHtml(blocks))}
              />
            ) : null}

            {mode === 'source' ? (
              <div className="space-y-2">
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={10}
                  spellCheck={false}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Preview (sandboxed — no scripts, no session)
                </p>
                <iframe
                  title="Template preview"
                  sandbox=""
                  srcDoc={html}
                  className="h-52 w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
                />
              </div>
            ) : null}

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Plain-text alternative
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="What readers without HTML see."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                disabled={busy || !name.trim()}
                onClick={() => void save()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{active?.id ? 'Save' : 'Create'}</span>
              </button>
              <button
                type="button"
                disabled={!html.trim()}
                onClick={() =>
                  void sendTest({ name, html, text })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Test-send to me</span>
              </button>
              {html.trim() && (
                <button
                  type="button"
                  onClick={() => download({ id: '', name, category, html, text, createdBy: email })}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── The sandboxed rich editor (carried over, restyled) ───────────────

function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const doc = el.contentDocument;
    const win = el.contentWindow;
    if (!doc || !win) return;
    doc.open();
    doc.write(
      '<!doctype html><html><head><meta charset="utf-8">' +
        '<style>body{font-family:Arial;font-size:14px;color:#1b2027;margin:16px}a{color:#2563eb}</style>' +
        '</head><body contenteditable="true"></body></html>',
    );
    doc.close();
    doc.body.innerHTML = value || '<p><br></p>';
    setReady(true);
    const push = () => {
      win.postMessage(
        { source: 'webmail-rich-editor', type: 'html', html: doc.body.innerHTML },
        '*',
      );
    };
    doc.body.addEventListener('input', push);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== win || event.data?.source !== 'webmail-rich-editor') return;
      if (event.data.type === 'html') onChange(event.data.html as string);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, arg?: string) {
    const win = frame.current?.contentWindow;
    if (!win) return;
    win.focus();
    if (command === 'createLink') {
      const url = prompt('Link URL:', 'https://');
      if (url) win.document.execCommand('createLink', false, url);
    } else {
      win.document.execCommand(command, false, arg);
    }
  }

  const tools: Array<[string, string]> = [
    ['bold', 'B'],
    ['italic', 'I'],
    ['underline', 'U'],
    ['insertUnorderedList', '• list'],
    ['insertOrderedList', '1. list'],
    ['createLink', 'link'],
    ['removeFormat', 'clear'],
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-950">
        {tools.map(([cmd, label]) => (
          <button
            key={cmd}
            type="button"
            onClick={() => exec(cmd)}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {label}
          </button>
        ))}
      </div>
      {ready ? null : <p className="py-2 text-xs text-slate-400">Opening the editor…</p>}
      <iframe
        ref={frame}
        title="Rich email editor"
        sandbox="allow-scripts"
        className="min-h-[220px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
      />
      <p className="mt-1.5 text-[11px] text-slate-400">
        Paste is fine — the frame cannot touch this application. On save, the
        HTML is sanitised before it is stored.
      </p>
    </div>
  );
}

// ── The block builder (carried over, restyled) ──────────────────────

function BlockBuilder({
  blocks,
  onInsert,
  onRender,
}: {
  blocks: Block[];
  onInsert: (b: Block) => void;
  onRender: () => void;
}) {
  const [block, setBlock] = useState<Block>({ kind: 'text', text: '' });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {(['heading', 'text', 'button', 'image', 'divider', 'columns'] as const).map(
          (kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setBlock({ kind })}
              className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                block.kind === kind
                  ? 'bg-orange-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {kind}
            </button>
          ),
        )}
      </div>
      <BlockFields block={block} setBlock={setBlock} />
      <button
        type="button"
        onClick={() => {
          onInsert({ ...block });
          setBlock({ kind: block.kind });
        }}
        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
      >
        Add block
      </button>
      {blocks.length ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {blocks.length} block{blocks.length === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            onClick={onRender}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
          >
            Build the HTML
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BlockFields({ block, setBlock }: { block: Block; setBlock: (b: Block) => void }) {
  const set = (patch: Partial<Block>) => setBlock({ ...block, ...patch });
  const input =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  return (
    <div className="grid grid-cols-2 gap-2">
      {(block.kind === 'heading' || block.kind === 'text') && (
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            {block.kind === 'heading' ? 'Heading' : 'Text'}
          </label>
          <input
            value={block.text ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set({ text: e.target.value })}
            className={input}
            placeholder={block.kind === 'heading' ? 'A headline' : 'A paragraph'}
          />
        </div>
      )}
      {block.kind === 'button' && (
        <>
          <input value={block.label ?? ''} onChange={(e) => set({ label: e.target.value })} className={input} placeholder="Button label" />
          <input value={block.url ?? ''} onChange={(e) => set({ url: e.target.value })} className={input} placeholder="https://…" />
        </>
      )}
      {block.kind === 'image' && (
        <>
          <input value={block.image ?? ''} onChange={(e) => set({ image: e.target.value })} className={input} placeholder="Image URL" />
          <input value={block.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} className={input} placeholder="Caption" />
        </>
      )}
      {block.kind === 'columns' && (
        <>
          <input value={block.left ?? ''} onChange={(e) => set({ left: e.target.value })} className={input} placeholder="Left column" />
          <input value={block.right ?? ''} onChange={(e) => set({ right: e.target.value })} className={input} placeholder="Right column" />
        </>
      )}
    </div>
  );
}

function parseBlocks(html: string): Block[] {
  void html;
  return [];
}

function blocksToHtml(blocks: Block[]): string {
  const rows = blocks
    .map((b) => {
      switch (b.kind) {
        case 'heading':
          return `<tr><td style="font-size:20px;font-weight:bold;padding:8px 0">${esc(b.text)}</td></tr>`;
        case 'text':
          return `<tr><td style="padding:8px 0">${esc(b.text)}</td></tr>`;
        case 'button':
          return `<tr><td style="text-align:center;padding:16px 0"><a href="${esc(b.url ?? '')}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px">${esc(b.label)}</a></td></tr>`;
        case 'image':
          return `<tr><td style="text-align:center;padding:8px 0"><img src="${esc(b.image ?? '')}" alt="${esc(b.caption ?? '')}" style="max-width:100%"><div style="font-size:11px;color:#7a8694">${esc(b.caption ?? '')}</div></td></tr>`;
        case 'divider':
          return `<tr><td style="padding:8px 0"><hr style="border:none;border-top:1px solid #dfe3e8"></td></tr>`;
        case 'columns':
          return `<tr><td style="padding:8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="vertical-align:top;padding:4px 8px 4px 0">${esc(b.left ?? '')}</td><td width="50%" style="vertical-align:top;padding:4px 0 4px 8px">${esc(b.right ?? '')}</td></tr></table></td></tr>`;
        default:
          return '';
      }
    })
    .join('\n');
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2027;max-width:640px;margin:0 auto">' +
    rows +
    '</table>'
  );
}

function esc(value?: string): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
