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
import { usePlatformMcpHub } from './mcp-platform-hooks';

const API_BASE =
  typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '';

const MCP_CONFIG_TEMPLATE = (apiKey: string) =>
  `{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_KEY": "${apiKey}",
        "FIDSCRIPT_API_URL": "${API_BASE}"
      }
    }
  }
}`;

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
    projects,
    selectedProject,
    apiKey,
    loadingProjects,
    loadingKey,
    showKey,
    setSelectedProject,
    setShowKey,
    generateKey,
  } = usePlatformMcpHub();

  const mcpConfig = apiKey ? MCP_CONFIG_TEMPLATE(apiKey.key) : '';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">API, MCP and CLI</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Connect AI agents and CLI tools to your FIDScript project.
        </p>
      </div>

      {/* Project selector */}
      <Card className="border border-[var(--rail)]" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={Rocket01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Select Project</h2>
        </div>
        {loadingProjects ? (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        ) : projects.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No projects found. Create one first.</p>
        ) : (
          <select
            value={selectedProject?.id ?? ''}
            onChange={e =>
              setSelectedProject(projects.find(p => p.id === e.target.value) ?? projects[0])
            }
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </Card>

      {/* API Credentials */}
      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Key01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">API Credentials</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">API Base URL</p>
            <CodeBlock code={API_BASE} />
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">Project ID</p>
            <CodeBlock code={selectedProject?.id ?? ''} />
          </div>
        </div>

        {!apiKey ? (
          <Button
            variant="primary"
            size="sm"
            onClick={generateKey}
            disabled={!selectedProject || loadingKey}
          >
            {loadingKey ? <><Spinner size="sm" /> Generating…</> : <><HugeiconsIcon icon={Key01Icon} size={13} /> Generate API Key</>}
          </Button>
        ) : showKey ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--warning)]">Copy this key — you won&apos;t see it again.</p>
              <button onClick={() => setShowKey(false)} type="button" className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">
                Hide
              </button>
            </div>
            <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-4 py-3">
              <code className="flex-1 text-sm font-mono text-[var(--text)] break-all">{apiKey.key}</code>
              <CopyButton text={apiKey.key} label="Copy key" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-[var(--success)]" />
            API key generated (hidden for security — regenerate if lost)
          </div>
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
          {/* Step 1: Install */}
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 1 — Install</p>
            <CodeBlock code="npm install -g @fidscript-deploy/mcp-server" />
          </div>

          {/* Step 2: Claude Desktop */}
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 2 — Claude Desktop</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">Add to <code className="font-mono">~/.claude/settings.json</code>:</p>
            <div className="relative">
              <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3 whitespace-pre-wrap text-[var(--text)] overflow-x-auto">
                {mcpConfig || '  // Generate an API key above to see your config'}
              </pre>
              {apiKey && (
                <div className="absolute top-2 right-2">
                  <CopyButton text={mcpConfig} label="Copy JSON" />
                </div>
              )}
            </div>
          </div>

          {/* Step 2b: Cursor */}
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 2b — Cursor</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">Open Cursor Settings → AI → MCP Servers → Add:</p>
            <div className="relative">
              <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3 whitespace-pre-wrap text-[var(--text)] overflow-x-auto">
                {mcpConfig || '  // Generate an API key above to see your config'}
              </pre>
              {apiKey && (
                <div className="absolute top-2 right-2">
                  <CopyButton text={mcpConfig} label="Copy JSON" />
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Verify */}
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

          {/* Environment variables */}
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Environment Variables</p>
            <div className="space-y-1">
              {[
                { key: 'FIDSCRIPT_API_KEY', desc: 'Your project API key (required)' },
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
            <CodeBlock code="fidscript login <your-api-key>" />
            <p className="text-xs text-[var(--text-dim)] mt-1">Generate an API key from the section above.</p>
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 3 — Use</p>
            <CodeBlock code="fidscript --help" />
          </div>

          {/* CLI command reference */}
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
