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
} from '@hugeicons/core-free-icons';
import { Button, Spinner, Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { usePlatformMcpHub } from './mcp-platform-hooks';

const API_BASE =
  typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '';

const MCP_CONFIG_TEMPLATE = (apiKey: string, projectId: string) =>
  `{
  "mcpServers": {
    "fidscript": {
      "command": "npx",
      "args": ["-y", "@fidscript/mcp"],
      "env": {
        "FIDSCRIPT_API_KEY": "${apiKey}",
        "FIDSCRIPT_API_URL": "${API_BASE}",
        "FIDSCRIPT_PROJECT_ID": "${projectId}"
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

  const mcpConfig =
    apiKey && selectedProject
      ? MCP_CONFIG_TEMPLATE(apiKey.key, selectedProject.id)
      : '';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">API & MCP</h1>
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
      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Plug01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">MCP Setup — AI Agents</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Connect FIDScript to AI agents like Claude Code or Cursor via the Model Context Protocol.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">1. Install</p>
            <CodeBlock code="npx -y @fidscript/mcp" />
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">2. Claude Desktop config — add to <code className="font-mono">~/.claude/settings.json</code></p>
            <div className="relative">
              <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3 whitespace-pre-wrap text-[var(--text)] overflow-x-auto">
                {mcpConfig || '  // Generate an API key above to see your config'}
              </pre>
              {apiKey && selectedProject && (
                <div className="absolute top-2 right-2">
                  <CopyButton text={mcpConfig} label="Copy JSON" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
            <HugeiconsIcon icon={Key01Icon} size={12} />
            <span>Generate an API key above and paste <code className="font-mono">FIDSCRIPT_API_KEY</code> into the config.</span>
          </div>
        </div>
      </section>

      {/* CLI Setup */}
      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ComputerTerminal01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">CLI Setup — Terminal</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Install the FIDScript CLI to manage projects and deployments from your terminal.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">1. Install</p>
            <CodeBlock code="npm install -g @fidscript/cli" />
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">2. Authenticate</p>
            <CodeBlock code="fidscript login" />
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1">3. Configure project</p>
            <CodeBlock code="fidscript init --project-id <your-project-id>" />
          </div>
        </div>
      </section>

      {/* Quickstart steps */}
      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Quickstart</h2>
        <div className="space-y-3 text-sm">
          {[
            { step: '1', desc: 'Select a project above', cmd: '' },
            { step: '2', desc: 'Generate your API key', cmd: '' },
            { step: '3', desc: 'Install the MCP package', cmd: 'npm install -g @fidscript/cli' },
            { step: '4', desc: 'Add the Claude Desktop config above', cmd: '' },
            { step: '5', desc: 'Restart Claude and start building', cmd: '' },
          ].map(({ step, desc, cmd }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold flex items-center justify-center mt-0.5">
                {step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-muted)] text-xs">{desc}</p>
                {cmd && (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs font-mono text-[var(--text)]">{cmd}</code>
                    <CopyButton text={cmd} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
