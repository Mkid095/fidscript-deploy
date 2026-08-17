'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Key01Icon,
  CheckmarkCircle01Icon,
  Plug01Icon,
  ComputerTerminal01Icon,
  CodeIcon,
  Rocket01Icon,
  FolderOpenIcon,
  Database01Icon,
  HardDriveIcon,
  Share08Icon,
  FlashIcon,
  Clock01Icon,
  Mail01Icon,
  GlobalIcon,
  Activity01Icon,
  File01Icon,
  Robot02Icon,
  ShoppingCart01Icon,
  LockPasswordIcon,
  Settings01Icon,
  SplitIcon,
} from '@hugeicons/core-free-icons';
import type { Project } from '@/types';
import { useToast } from '@/components/toast-provider';
import { useMcpHub } from './mcp-hub-hooks';
import { McpHubApiCredentials } from './mcp-hub-api-credentials';
import { McpHubCopyButton } from './mcp-hub-copy-button';
import { McpHubServicesGrid } from './mcp-hub-services-grid';
import { SERVICE_GROUPS, CLI_COMMANDS } from './mcp-hub-data';

interface McpHubProps {
  project: Project;
}

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function ToolSection({ group }: { group: (typeof SERVICE_GROUPS)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--rail)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={group.icon} size={15} className={group.color} />
          <span className="text-sm font-medium text-[var(--text)]">{group.title}</span>
          <span className="text-xs text-[var(--text-dim)]">({group.tools.length} tools)</span>
        </div>
        <HugeiconsIcon
          icon={SplitIcon}
          size={14}
          className={`text-[var(--text-dim)] transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="divide-y divide-[var(--rail)]">
          {group.tools.map((tool) => (
            <div key={tool.name} className="px-4 py-3 bg-[var(--surface)]">
              <p className="text-xs font-mono text-[var(--accent)]">{tool.name}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{tool.desc}</p>
              {tool.example && (
                <p className="text-xs font-mono text-[var(--text-dim)] mt-1 truncate">{tool.example}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WhenToUse() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="border border-[var(--rail)] rounded-lg p-4 bg-[var(--surface)] space-y-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Robot02Icon} size={15} className="text-violet-400" />
          <p className="text-sm font-semibold text-[var(--text)]">AI Agents (MCP)</p>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Best for Claude Code, Cursor, Windsurf, or any AI copilot. Ask questions like
          &ldquo;deploy my main branch&rdquo; and the agent handles everything. Stay in flow
          without switching to a terminal.
        </p>
        <p className="text-xs text-[var(--text-dim)]">
          Install: <code className="font-mono">npm install -g @fidscript-deploy/mcp-server</code>
        </p>
      </div>
      <div className="border border-[var(--rail)] rounded-lg p-4 bg-[var(--surface)] space-y-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ComputerTerminal01Icon} size={15} className="text-green-400" />
          <p className="text-sm font-semibold text-[var(--text)]">Terminal (CLI)</p>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Best for CI/CD pipelines, scripts, and quick one-off operations. Pipe output to other
          tools, use in GitHub Actions, or run commands during an incident.
        </p>
        <p className="text-xs text-[var(--text-dim)]">
          Install: <code className="font-mono">npm install -g @fidscript-deploy/cli</code>
        </p>
      </div>
      <div className="border border-[var(--rail)] rounded-lg p-4 bg-[var(--surface)] space-y-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={CodeIcon} size={15} className="text-blue-400" />
          <p className="text-sm font-semibold text-[var(--text)]">Code (SDK)</p>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Best for programmatic access from your app &mdash; a Node.js client that creates
          databases, publishes queue messages, or sends emails. Full type safety.
        </p>
        <p className="text-xs text-[var(--text-dim)]">
          Install: <code className="font-mono">npm install @fidscript-deploy/sdk</code>
        </p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function McpHub({ project }: McpHubProps) {
  const { showToast } = useToast();
  const { apiKey, loading, showKey, setShowKey, generateKey } = useMcpHub({ project, showToast });

  const mcpConfig = apiKey?.key ? MCP_CONFIG_TEMPLATE(apiKey.key) : '';

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">API, MCP and CLI</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Connect your app, AI agents, and terminal to FIDScript backend services.
        </p>
      </div>

      <McpHubApiCredentials
        project={project}
        apiKey={apiKey}
        showKey={showKey}
        loading={loading}
        apiBase={API_BASE}
        onGenerate={generateKey}
        onToggleShow={() => setShowKey(false)}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Three ways to connect</h2>
        <WhenToUse />
      </section>

      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-5">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Plug01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">MCP for AI Agents</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          The Model Context Protocol lets AI agents like Claude Code, Cursor, or Windsurf use
          FIDScript tools directly. Ask natural language and the agent calls the right tool.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 1 &mdash; Install</p>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
              <code className="text-xs font-mono text-[var(--text)]">npm install -g @fidscript-deploy/mcp-server</code>
              <McpHubCopyButton text="npm install -g @fidscript-deploy/mcp-server" />
            </div>
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 2 &mdash; Claude Desktop config</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Add to <code className="font-mono">~/.claude/settings.json</code>:
            </p>
            <div className="relative">
              <pre className="text-xs font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3 whitespace-pre-wrap text-[var(--text)] overflow-x-auto">
                {mcpConfig || '  // Generate an API key below first'}
              </pre>
              {apiKey?.key && (
                <div className="absolute top-2 right-2">
                  <McpHubCopyButton text={mcpConfig} label="Copy JSON" />
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Step 2b &mdash; Cursor</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Settings &rarr; AI &rarr; MCP Servers &rarr; Add (same JSON config above).
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
            <HugeiconsIcon icon={Key01Icon} size={12} className="mt-0.5 shrink-0" />
            <span>
              Generate an API key below and paste <code className="font-mono">FIDSCRIPT_API_KEY</code>{' '}
              into the config. The MCP binary is <code className="font-mono">fidscript-mcp</code>.
            </span>
          </div>
        </div>
      </section>

      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ComputerTerminal01Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">CLI for Terminal</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          For scripts, CI/CD, and terminal workflows. Pipe output, use in GitHub Actions,
          or run quick one-off commands.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Install</p>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
              <code className="text-xs font-mono text-[var(--text)]">npm install -g @fidscript-deploy/cli</code>
              <McpHubCopyButton text="npm install -g @fidscript-deploy/cli" />
            </div>
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">Authenticate</p>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
              <code className="text-xs font-mono text-[var(--text)]">
                fidscript login {apiKey?.key ?? '<your-api-key>'}
              </code>
              <McpHubCopyButton text={`fidscript login ${apiKey?.key ?? '<your-api-key>'}`} />
            </div>
          </div>
          <div>
            <p className="text-[var(--text-dim)] text-xs mb-2 font-medium">Command reference</p>
            <div className="space-y-3">
              {CLI_COMMANDS.map(({ group, cmds }) => (
                <div key={group}>
                  <p className="text-xs font-medium text-[var(--text)] mb-1">{group}</p>
                  {cmds.map(({ cmd, desc }) => (
                    <div key={cmd} className="flex items-center gap-3 py-0.5">
                      <code className="text-xs font-mono text-[var(--text-muted)] shrink-0">{cmd}</code>
                      <span className="text-xs text-[var(--text-dim)]">{desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Tool Catalog &mdash; 100+ tools across 16 services
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Every tool works via MCP, CLI, and SDK. Click a service to expand all tools with
            descriptions and code examples.
          </p>
        </div>
        <div className="space-y-2">
          {SERVICE_GROUPS.map((group) => (
            <ToolSection key={group.title} group={group} />
          ))}
        </div>
      </section>

      <McpHubServicesGrid projectId={project.id} />
    </div>
  );
}
