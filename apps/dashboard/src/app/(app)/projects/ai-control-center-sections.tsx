'use client';

import { CopyButton } from './ai-copy-button';
import type { AccountKey } from './ai-prompt-generator';

export function ShowKeyBanner({ raw, onDismiss }: { raw: string; onDismiss: () => void }) {
  return (
    <div className="p-3 rounded-lg border border-[var(--warning)] bg-[var(--warning-bg)] space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--warning)]">Copy your API key — you will not see it again.</p>
        <button onClick={onDismiss} type="button" className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">Dismiss</button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-[var(--text)] break-all">{raw}</code>
        <CopyButton text={raw} label="Copy key" />
      </div>
    </div>
  );
}

export function KeySelector({ keys, selectedKey, onSelect, onRevoke }: {
  keys: AccountKey[]; selectedKey: AccountKey | null;
  onSelect: (k: AccountKey) => void; onRevoke: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedKey?.id ?? ''}
        onChange={e => onSelect(keys.find(k => k.id === e.target.value) ?? keys[0]!)}
        className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 text-sm text-[var(--text)]">
        {keys.map(k => <option key={k.id} value={k.id}>{k.name} ({k.keyPrefix}…)</option>)}
      </select>
      <button onClick={() => selectedKey && onRevoke(selectedKey.id)}
        type="button" className="text-xs text-[var(--error)] hover:underline">
        Revoke
      </button>
    </div>
  );
}

export function AiPromptPanel({ prompt }: { prompt: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--text-dim)]">AI Agent Instructions</p>
        <CopyButton text={prompt} label="Copy" />
      </div>
      <textarea readOnly value={prompt} rows={14}
        className="w-full bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text)] resize-y" />
    </div>
  );
}

export function ConfigPanel({ label, content }: { label: string; content: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--text-dim)]">{label}</p>
        <CopyButton text={content} label="Copy JSON" />
      </div>
      <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-3 text-[var(--text)] overflow-x-auto whitespace-pre">{content}</pre>
    </div>
  );
}

export function CliPanel({ cmd }: { cmd: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--text-dim)]">CLI Login</p>
      <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
        <code className="text-xs font-mono text-[var(--text)]">{cmd}</code>
        <CopyButton text={cmd} />
      </div>
    </div>
  );
}

export function SdkPanel({ code }: { code: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--text-dim)]">SDK Setup</p>
      <div className="flex items-start justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
        <pre className="text-xs font-mono text-[var(--text)] overflow-x-auto whitespace-pre">{code}</pre>
        <CopyButton text={code} />
      </div>
    </div>
  );
}
