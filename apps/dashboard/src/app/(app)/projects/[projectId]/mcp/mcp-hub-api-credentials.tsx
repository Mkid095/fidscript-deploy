'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Key01Icon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckmarkCircle01Icon,
  Robot02Icon,
} from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';
import type { Project } from '@/types';
import { useToast } from '@/components/toast-provider';
import { buildFullSetupGuide } from './mcp-hub-setup-guide';

interface ApiKeyData {
  id: string;
  key: string;
}

interface McpHubApiCredentialsProps {
  project: Project;
  apiKey: ApiKeyData | null;
  loading: boolean;
  apiBase: string;
  onGenerate: () => Promise<void>;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      type="button"
      className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0"
    >
      <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : CopyIcon} size={13} />
      {copied ? 'Copied!' : label}
    </button>
  );
}

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      type="button"
      className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0"
    >
      <HugeiconsIcon icon={visible ? EyeOffIcon : EyeIcon} size={13} />
      {visible ? 'Hide' : 'Show'}
    </button>
  );
}

export function McpHubApiCredentials({
  project,
  apiKey,
  loading,
  apiBase,
  onGenerate,
}: McpHubApiCredentialsProps) {
  const { showToast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);

  const mcpConfigJson = apiKey
    ? JSON.stringify(
        {
          mcpServers: {
            fidscript: {
              command: 'fidscript-mcp',
              env: {
                FIDSCRIPT_API_KEY: apiKey.key,
                FIDSCRIPT_API_URL: apiBase,
              },
            },
          },
        },
        null,
        2,
      )
    : '';

  async function copyFullGuide() {
    if (!apiKey) return;
    const guide = buildFullSetupGuide(project, apiKey, apiBase);
    await navigator.clipboard.writeText(guide);
    setCopiedGuide(true);
    showToast?.({ type: 'success', message: 'Full setup guide copied to clipboard!' });
    setTimeout(() => setCopiedGuide(false), 3000);
  }

  async function copyMcpConfig() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(mcpConfigJson);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  }

  return (
    <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-5">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Key01Icon} size={18} className="text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">API Credentials</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1">API Base URL</p>
          <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
            <code className="text-xs font-mono text-[var(--text)] truncate">{apiBase}</code>
            <CopyButton text={apiBase} />
          </div>
        </div>
        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1">Project ID</p>
          <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
            <code className="text-xs font-mono text-[var(--text)] truncate">{project.id}</code>
            <CopyButton text={project.id} />
          </div>
        </div>
      </div>

      {!apiKey ? (
        <Button
          variant="primary"
          size="sm"
          onClick={onGenerate}
          disabled={loading}
          className="flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Generating…
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Key01Icon} size={13} />
              Generate API Key
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--warning)]">
              Copy this key now — you won&apos;t see it again.
            </p>
            <EyeToggle visible={showKey} onToggle={() => setShowKey(s => !s)} />
          </div>

          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-4 py-3">
            <code className="flex-1 text-sm font-mono text-[var(--text)] break-all">
              {showKey ? apiKey.key : '•'.repeat(Math.min(apiKey.key.length, 40))}
            </code>
            <EyeToggle visible={showKey} onToggle={() => setShowKey(s => !s)} />
            <CopyButton text={apiKey.key} label="Copy key" />
          </div>

          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">MCP JSON Config</p>
            <div className="relative">
              <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3 whitespace-pre-wrap text-[var(--text)] overflow-x-auto max-h-48 overflow-y-auto">
                {mcpConfigJson}
              </pre>
              <div className="absolute top-2 right-2">
                <button
                  onClick={copyMcpConfig}
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors bg-[var(--surface)] border border-[var(--rail)] rounded px-2 py-1"
                >
                  <HugeiconsIcon icon={copiedMcp ? CheckmarkCircle01Icon : CopyIcon} size={12} />
                  {copiedMcp ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {apiKey && (
        <div className="border-t border-[var(--rail)] pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Robot02Icon} size={15} className="text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--text)]">Send this to an AI Agent</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Copy the full setup guide and paste it into Claude Code, Cursor, or any AI client. It
            includes the API key, CLI commands, SDK setup, and all available tools — the agent can
            start working on this project immediately.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={copyFullGuide}
            className="flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={copiedGuide ? CheckmarkCircle01Icon : CopyIcon} size={13} />
            {copiedGuide ? 'Copied!' : 'Copy Full Setup Guide'}
          </Button>
        </div>
      )}
    </section>
  );
}
