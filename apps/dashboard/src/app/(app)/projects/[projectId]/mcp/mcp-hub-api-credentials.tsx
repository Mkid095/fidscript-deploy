'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';
import type { Project } from '@/types';
import { McpHubCopyButton } from './mcp-hub-copy-button';

interface McpHubApiCredentialsProps {
  project: Project;
  apiKey: { id: string; key: string } | null;
  showKey: boolean;
  loading: boolean;
  apiBase: string;
  onGenerate: () => void;
  onToggleShow: () => void;
}

export function McpHubApiCredentials({
  project,
  apiKey,
  showKey,
  loading,
  apiBase,
  onGenerate,
  onToggleShow,
}: McpHubApiCredentialsProps) {
  return (
    <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Key01Icon} size={18} className="text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">API Credentials</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1">API Base URL</p>
          <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
            <code className="text-xs font-mono text-[var(--text)] truncate">{apiBase}</code>
            <McpHubCopyButton text={apiBase} />
          </div>
        </div>
        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1">Project ID</p>
          <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
            <code className="text-xs font-mono text-[var(--text)] truncate">{project.id}</code>
            <McpHubCopyButton text={project.id} />
          </div>
        </div>
      </div>

      {!apiKey ? (
        <Button variant="primary" size="sm" onClick={onGenerate} disabled={loading}
          className="flex items-center gap-1.5">
          {loading
            ? <><Spinner size="sm" /> Generating…</>
            : <><HugeiconsIcon icon={Key01Icon} size={13} /> Generate API Key</>}
        </Button>
      ) : showKey ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--warning)]">Copy this key now — you won&apos;t see it again.</p>
            <button onClick={onToggleShow} type="button"
              className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">Hide</button>
          </div>
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-4 py-3">
            <code className="flex-1 text-sm font-mono text-[var(--text)] break-all">{apiKey.key}</code>
            <McpHubCopyButton text={apiKey.key} label="Copy key" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-[var(--success)]" />
          API key generated (hidden for security)
        </div>
      )}
    </section>
  );
}
