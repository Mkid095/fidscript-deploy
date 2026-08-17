'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Key01Icon,
  CheckmarkCircle01Icon,
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
  typeof window !== 'undefined' ? 'https://api.deploy.fidscript.com' : '';

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
  const { apiKey, loading, generateKey } = useMcpHub({ project, showToast });

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
        loading={loading}
        apiBase={API_BASE}
        onGenerate={generateKey}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Three ways to connect</h2>
        <WhenToUse />
      </section>

      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Robot02Icon} size={18} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Quick Reference</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-[var(--rail)] rounded-lg p-4 bg-[var(--surface-2)] space-y-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Robot02Icon} size={14} className="text-violet-400" />
              <p className="text-xs font-semibold text-[var(--text)]">AI Agents (MCP)</p>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Install the MCP server and configure your AI client. The full setup guide above
              contains everything your agent needs.
            </p>
            <p className="text-xs text-[var(--text-dim)] font-mono">npm install -g @fidscript-deploy/mcp-server</p>
          </div>
          <div className="border border-[var(--rail)] rounded-lg p-4 bg-[var(--surface-2)] space-y-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={ComputerTerminal01Icon} size={14} className="text-green-400" />
              <p className="text-xs font-semibold text-[var(--text)]">Terminal (CLI)</p>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Scripts, CI/CD, and one-off operations. Authenticate once and run any command.
            </p>
            <p className="text-xs text-[var(--text-dim)] font-mono">npm install -g @fidscript-deploy/cli</p>
          </div>
          <div className="border border-[var(--rail)] rounded-lg p-4 bg-[var(--surface-2)] space-y-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CodeIcon} size={14} className="text-blue-400" />
              <p className="text-xs font-semibold text-[var(--text)]">Code (SDK)</p>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Programmatic access from Node.js. Full type safety, all 100+ tools available.
            </p>
            <p className="text-xs text-[var(--text-dim)] font-mono">npm install @fidscript-deploy/sdk</p>
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
