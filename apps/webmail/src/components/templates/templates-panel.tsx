'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { Card, EmptyState, Field, PrimaryButton, TextInput } from '@/components/ui';

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
  subtext?: string;
  label?: string;
  url?: string;
  image?: string;
  caption?: string;
  left?: string;
  right?: string;
}

/**
 * The templates and the email designer.
 *
 * Three ways to build the document:
 *   rich   — a live editor, kept in a script-sandboxed frame so nothing you
 *            paste can reach this application's session;
 *   blocks — email-safe table blocks (heading, text, button, image,
 *            divider, columns) that are assembled into the HTML;
 *   source — the HTML itself, with a script-less preview beside it.
 *
 * What is saved is sanitized on the server. A test send goes through the
 * real submission path, to you.
 */
export function TemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('business');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('rich');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selfEmail, setSelfEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/templates');
    const body = (await response.json().catch(() => ({}))) as {
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
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((body: { session?: { email?: string } }) => {
        if (body.session?.email) setSelfEmail(body.session.email);
      })
      .catch(() => undefined);
  }, [load]);

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
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: active?.id,
        name,
        category,
        html,
        text,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      template?: Template;
      error?: string;
    };
    if (!response.ok) {
      setNotice(body.error ?? 'The template did not save.');
      return;
    }
    setNotice('Saved.');
    open(body.template ?? null);
    await load();
  }

  async function sendTest() {
    setNotice(null);
    if (!selfEmail) {
      setNotice('The test send goes to you, and this sign-in has no address for that yet.');
      return;
    }
    const response = await fetch('/api/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'send',
        to: [selfEmail],
        subject: `Template test: ${name || 'untitled'}`,
        html,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setNotice(
      response.ok
        ? `Sent — it is in your inbox as "Template test: ${name || 'untitled'}".`
        : body.error ?? 'The test send did not go through.',
    );
  }

  async function sendTo(template: Template) {
    const response = await fetch('/api/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'send',
        to: [selfEmail],
        subject: `Template test: ${template.name}`,
        html: template.html,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setNotice(
      response.ok
        ? `Sent to ${selfEmail || 'you'} — look in your inbox.`
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
      setNotice(`Imported ${file.name} into the source view.`);
    });
  }

  const shown = filter
    ? templates.filter((t) => t.category === filter)
    : templates;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Templates</h1>
          <p className="mt-1 text-sm text-text-muted">
            Email-safe HTML you build once and send many times — or start from.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => open(null)}
            className="rounded border border-rail bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-2"
          >
            New template
          </button>
          <label className="cursor-pointer rounded border border-rail bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-2">
            Import HTML
            <input
              type="file"
              accept=".html,.htm,text/html"
              className="hidden"
              onChange={(e) => importFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {notice ? <p className="mt-3 text-sm text-text-muted">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded border border-rail bg-surface px-2 py-1 text-xs text-text-muted"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="text-xs text-text-dim">{shown.length} template{shown.length === 1 ? '' : 's'}</span>
          </div>
          {shown.length === 0 ? (
            <EmptyState
              title={loading ? 'Loading…' : 'No templates yet'}
              body="Create one, or take a starter set from the editor."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {shown.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2.5">
                  <button
                    type="button"
                    onClick={() => open(t)}
                    className="min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium text-text">{t.name}</p>
                    <p className="text-xs text-text-dim">{t.category}</p>
                  </button>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button type="button" onClick={() => void sendTo(t)} className="text-accent hover:underline">
                      Test
                    </button>
                    <button type="button" onClick={() => download(t)} className="text-accent hover:underline">
                      Export
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {active !== null ? (
          <Card title={active.id ? 'Edit template' : 'New template'}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name">
                  <TextInput value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="flex gap-1 border-b border-rail">
                {(
                  [
                    ['rich', 'Rich text'],
                    ['blocks', 'Blocks'],
                    ['source', 'HTML source'],
                  ] as [Mode, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`rounded-t px-3 py-1.5 text-sm ${
                      mode === key
                        ? 'border border-b-0 border-rail bg-surface text-text'
                        : 'text-text-muted hover:bg-surface-2'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'rich' ? (
                <RichEditor value={html} onChange={setHtml} />
              ) : null}

              {mode === 'blocks' ? (
                <BlockBuilder blocks={blocks} onChange={setBlocks} onInsert={(b) => setBlocks((cur) => [...cur, b])} onRender={() => setHtml(blocksToHtml(blocks))} />
              ) : null}

              {mode === 'source' ? (
                <div>
                  <textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    rows={10}
                    spellCheck={false}
                    className="w-full rounded border border-rail bg-surface-2 p-3 font-mono text-xs outline-none focus:border-rail-light"
                  />
                  <div className="mt-2">
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-text-dim uppercase">
                      Preview (sandboxed — no scripts, no session)
                    </p>
                    <iframe
                      title="Template preview"
                      sandbox=""
                      srcDoc={html}
                      style={{ width: '100%', border: '1px solid var(--rail)', minHeight: 200 }}
                    />
                  </div>
                </div>
              ) : null}

              <Field label="Plain-text alternative" hint="What readers without HTML see.">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-rail bg-surface p-2 text-sm outline-none focus:border-rail-light"
                />
              </Field>

              <div className="flex flex-wrap gap-2 border-t border-rail pt-3">
                <PrimaryButton type="button" onClick={() => void save()}>
                  {active.id ? 'Save' : 'Create'}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => void sendTest()}
                  className="rounded border border-rail bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-2"
                >
                  Test-send to me
                </button>
                <Link href="/compose" className="self-center text-xs text-accent hover:underline">
                  Use in the composer
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              title="Pick a template or start one"
              body="Choose one on the left to open it in the designer, or create a new one."
            />
          </Card>
        )}
      </div>

      <div className="mt-6">
        <Link href="/mail/inbox" className="text-sm text-accent hover:underline">
          Back to the inbox
        </Link>
      </div>
    </main>
  );
}

/**
 * The rich editor, isolated.
 *
 * The editable document lives in an iframe that may run scripts but
 * cannot see this application (no allow-same-origin, so no cookies or
 * session). Our own toolbar talks to it; a pasted document cannot.
 */
function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
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
    const body = doc.body;
    body.innerHTML = value || '<p><br></p>';
    setReady(true);
    const push = () => {
      // The frame is opaque-origin (sandbox without allow-same-origin),
      // so the target origin is '*' — the payload is the user's own HTML,
      // nothing private.
      win.postMessage(
        { source: 'webmail-rich-editor', type: 'html', html: body.innerHTML },
        '*',
      );
    };
    body.addEventListener('input', push);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== win || event.data?.source !== 'webmail-rich-editor') return;
      if (event.data.type === 'html') onChange(event.data.html as string);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
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
    ['removeFormat', 'clear'],
    ['createLink', 'link'],
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded border border-rail bg-surface-2 p-1.5">
        {tools.map(([cmd, label]) => (
          <button
            key={cmd}
            type="button"
            onClick={() => exec(cmd)}
            className="rounded border border-rail bg-surface px-2 py-0.5 text-xs text-text-muted hover:bg-surface-2"
          >
            {label}
          </button>
        ))}
      </div>
      {ready ? null : <p className="py-2 text-xs text-text-dim">Opening the editor…</p>}
      <iframe
        ref={frame}
        title="Rich email editor"
        sandbox="allow-scripts"
        style={{ width: '100%', border: '1px solid var(--rail)', minHeight: 220, background: 'var(--surface)' }}
      />
      <p className="mt-1 text-[11px] text-text-dim">
        Paste is fine — the frame cannot touch this application. On save, the
        HTML is sanitised before it is stored.
      </p>
    </div>
  );
}

function parseBlocks(html: string): Block[] {
  // Blocks are a convenience over the HTML; on open, we keep the raw HTML
  // and start the block list empty so the user can build fresh. This keeps
  // the three modes honest without pretending to reverse-engineer HTML.
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

function BlockBuilder({
  blocks,
  onInsert,
  onRender,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
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
              className="rounded border border-rail bg-surface px-2 py-0.5 text-xs capitalize text-text-muted hover:bg-surface-2"
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
        className="rounded border border-rail bg-surface px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2"
      >
        Add block
      </button>
      {blocks.length ? (
        <div className="rounded border border-rail bg-surface-2 p-2">
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-text-dim uppercase">
            {blocks.length} block{blocks.length === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            onClick={onRender}
            className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
          >
            Build the HTML
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BlockFields({
  block,
  setBlock,
}: {
  block: Block;
  setBlock: (b: Block) => void;
}) {
  const set = (patch: Partial<Block>) => setBlock({ ...block, ...patch });
  return (
    <div className="grid grid-cols-2 gap-2">
      {block.kind === 'heading' || block.kind === 'text' ? (
        <Field label={block.kind === 'heading' ? 'Heading' : 'Text'}>
          <TextInput
            value={block.text ?? ''}
            onChange={(e) => set({ text: e.target.value })}
            placeholder={block.kind === 'heading' ? 'A headline' : 'A paragraph'}
          />
        </Field>
      ) : null}
      {block.kind === 'button' ? (
        <>
          <Field label="Label">
            <TextInput value={block.label ?? ''} onChange={(e) => set({ label: e.target.value })} />
          </Field>
          <Field label="URL">
            <TextInput value={block.url ?? ''} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
          </Field>
        </>
      ) : null}
      {block.kind === 'image' ? (
        <>
          <Field label="Image URL">
            <TextInput value={block.image ?? ''} onChange={(e) => set({ image: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Caption">
            <TextInput value={block.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} />
          </Field>
        </>
      ) : null}
      {block.kind === 'columns' ? (
        <>
          <Field label="Left column">
            <TextInput value={block.left ?? ''} onChange={(e) => set({ left: e.target.value })} />
          </Field>
          <Field label="Right column">
            <TextInput value={block.right ?? ''} onChange={(e) => set({ right: e.target.value })} />
          </Field>
        </>
      ) : null}
    </div>
  );
}
