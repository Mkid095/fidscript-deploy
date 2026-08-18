'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Key01Icon,
  CheckmarkCircle01Icon,
  CopyIcon,
  Rocket01Icon,
  ComputerTerminal01Icon,
  Plug01Icon,
  AiBrain01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { Button, Spinner, Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useAccountCredentials } from '@/hooks/use-account-credentials';
import { getMcpConfig, getCliLoginCommand, getSdkInitCode } from '../projects/ai-control-center-data';

const API_BASE =
  typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '';

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
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
      className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
    >
      <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : CopyIcon} size={13} />
      {copied ? 'Copied!' : label}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative">
      {label && (
        <p className="text-[var(--text-dim)] text-xs mb-1">{label}</p>
      )}
      <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
        <code className="text-xs font-mono text-[var(--text)] break-all">{code}</code>
        <CopyButton text={code} />
      </div>
    </div>
  );
}

const CLI_COMMANDS = [
  { group: 'Account', cmds: ['login <key>', 'logout', 'whoami'] },
  { group: 'Projects', cmds: ['projects list', 'projects create <name>'] },
  { group: 'Deployments', cmds: ['deployments list', 'deployments create', 'deployments get <id>', 'deployments logs <id>', 'deployments stop <id>', 'deployments restart <id>', 'deployments rollback <id>'] },
  { group: 'Functions', cmds: ['functions list', 'functions create', 'functions deploy <id>', 'functions get <id>', 'functions logs <id>', 'functions invoke <id>', 'functions delete <id>'] },
  { group: 'Databases', cmds: ['databases list', 'databases create <name>', 'databases get <id>', 'databases delete <id>', 'databases backup <id>', 'databases restore <id>'] },
  { group: 'Storage', cmds: ['storage list', 'storage buckets', 'storage create-bucket <name>', 'storage upload <bucket> <key> <file>', 'storage download <bucket> <key>', 'storage delete <bucket> <key>'] },
  { group: 'Queues', cmds: ['queues list', 'queues create <name>', 'queues publish <name>', 'queues consume <name>'] },
  { group: 'Cron', cmds: ['cron list', 'cron create', 'cron get <id>', 'cron update <id>', 'cron delete <id>', 'cron trigger <id>'] },
  { group: 'Email', cmds: ['email send', 'email inbox', 'email templates', 'email status <messageId>'] },
  { group: 'Domains', cmds: ['domains list', 'domains create <domain>', 'domains get <id>', 'domains check-health <id>', 'domains delete <id>'] },
  { group: 'Env Vars', cmds: ['env list', 'env set <key> <value>', 'env delete <key>'] },
  { group: 'Logs', cmds: ['logs tail <service>', 'logs query'] },
  { group: 'Init', cmds: ['init <template> <name>'] },
];

export default function McpPage() {
  const { getSdk } = useAuth();
  const {
    keys,
    selectedKey,
    showKey,
    loading: loadingKey,
    revokeKey,
    clearShowKey,
  } = useAccountCredentials(getSdk);

  const mcpConfig = selectedKey && showKey ? getMcpConfig(showKey, API_BASE) : '';
  const cliCmd = selectedKey && showKey ? getCliLoginCommand(showKey) : '';
  const sdkCode = selectedKey && showKey ? getSdkInitCode(showKey, API_BASE) : '';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">API, MCP and CLI</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Connect AI agents and CLI tools to your FIDScript project.
        </p>
      </div>

      {/* AI Control Center (key management) */}
      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={AiBrain01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">AI Control Center</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Generate an Account API Key (fsk_) for use with MCP and CLI tools.
          Project-scoped keys (fpk_) for individual projects are managed per-project.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">API Base URL</p>
            <CodeBlock code={API_BASE} />
          </div>
          {selectedKey && (
            <div>
              <p className="text-[var(--text-dim)] text-xs mb-1">Account Key Prefix</p>
              <CodeBlock code={selectedKey.keyPrefix + '…'} />
            </div>
          )}
        </div>

        {showKey ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--warning)]">Copy this key — you won&apos;t see it again.</p>
              <button onClick={clearShowKey} type="button" className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">
                Hide
              </button>
            </div>
            <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-4 py-3">
              <code className="flex-1 text-sm font-mono text-[var(--text)] break-all">{showKey}</code>
              <CopyButton text={showKey} label="Copy key" />
            </div>
          </div>
        ) : keys.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-[var(--success)]" />
            API key generated (hidden for security — regenerate if lost)
            {selectedKey && (
              <button onClick={() => revokeKey(selectedKey.id)} type="button"
                className="ml-2 text-[var(--error)] hover:underline">
                Revoke
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Generate a key below using the AI Control Center on the Projects page.
          </p>
        )}
      </section>

      {/* MCP Setup */}
      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-5">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Plug01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">MCP Setup for AI Agents</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Connect FIDScript to AI agents like Claude Desktop, Cursor, or Windsurf via the Model Context Protocol.
          The MCP server exposes 100+ platform tools — deployments, databases, email, queues, and more.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 1 — Install</p>
            <CodeBlock code="npm install -g @fidscript-deploy/mcp-server" />
          </div>

          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 2 — Claude Desktop</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">Add to <code className="font-mono">~/.claude/settings.json</code>:</p>
            <div className="relative">
              <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3 whitespace-pre-wrap text-[var(--text)] overflow-x-auto">
                {mcpConfig || '  // Generate an API key from the Projects page to see your config'}
              </pre>
              {mcpConfig && (
                <div className="absolute top-2 right-2">
                  <CopyButton text={mcpConfig} label="Copy JSON" />
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 2b — Cursor</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">Open Cursor Settings → AI → MCP Servers → Add:</p>
            <div className="relative">
              <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3 whitespace-pre-wrap text-[var(--text)] overflow-x-auto">
                {mcpConfig || '  // Generate an API key from the Projects page to see your config'}
              </pre>
              {mcpConfig && (
                <div className="absolute top-2 right-2">
                  <CopyButton text={mcpConfig} label="Copy JSON" />
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 3 — Verify</p>
            <div className="space-y-1 text-xs text-[var(--text-muted)]">
              <div className="flex items-start gap-2">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} className="mt-0.5 shrink-0 text-[var(--success)]" />
                <span>Restart Claude or Cursor after adding the config</span>
              </div>
              <div className="flex items-start gap-2">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} className="mt-0.5 shrink-0 text-[var(--success)]" />
                <span>Ask Claude: &quot;List my FIDScript projects&quot; — it should return your project</span>
              </div>
              <div className="flex items-start gap-2">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} className="mt-0.5 shrink-0 text-[var(--success)]" />
                <span>If you get a permission error, regenerate your API key and update the config</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Environment Variables</p>
            <div className="space-y-1">
              {[
                { key: 'FIDSCRIPT_API_KEY', desc: 'Your account API key (fsk_...)' },
                { key: 'FIDSCRIPT_API_URL', desc: 'API base URL (default: http://localhost:3001)' },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-3 text-xs">
                  <code className="font-mono text-[var(--text)] shrink-0">{key}</code>
                  <span className="text-[var(--text-dim)]">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CLI Setup */}
      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ComputerTerminal01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">CLI Setup for Terminal</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          The FIDScript CLI is for terminal workflows — CI/CD scripts, quick operations, and automation.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 1 — Install</p>
            <CodeBlock code="npm install -g @fidscript-deploy/cli" />
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 2 — Authenticate</p>
            <CodeBlock code={cliCmd || 'fidscript login <your-account-api-key>'} />
            <p className="text-xs text-[var(--text-dim)] mt-1">Generate an API key from the Projects page.</p>
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 3 — Use</p>
            <CodeBlock code="fidscript --help" />
          </div>

          <div>
            <p className="text-[var(--text-dim)] text-xs mb-2 font-medium">Command Reference</p>
            <div className="space-y-3">
              {CLI_COMMANDS.map(({ group, cmds }) => (
                <div key={group}>
                  <p className="text-xs font-medium text-[var(--text)] mb-1">{group}</p>
                  <div className="space-y-0.5">
                    {cmds.map(cmd => (
                      <div key={cmd} className="flex items-center gap-2">
                        <code className="text-xs font-mono text-[var(--text-muted)]">{cmd}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
