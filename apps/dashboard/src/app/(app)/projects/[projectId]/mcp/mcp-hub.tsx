'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Key01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { McpHubApiCredentials } from './mcp-hub-api-credentials';
import { McpHubCopyButton } from './mcp-hub-copy-button';
import { McpHubServicesGrid } from './mcp-hub-services-grid';

interface McpHubProps {
  project: Project;
}

// Use window.location.origin so the config snippet works in dev, staging, and prod.
// The /api/v1 suffix routes through the Next.js proxy (see src/lib/sdk.ts).
const API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '';

const QUICKSTART = [
  { step: '1', cmd: 'npm install @fidscript-deploy/sdk', desc: 'Install the SDK' },
  { step: '2', cmd: `createFidscript({ baseURL: '${API_BASE}', apiKey: '<your-key>' })`, desc: 'Initialize with your credentials' },
  { step: '3', cmd: 'await sdk.databases.list(projectId)', desc: 'Start using services' },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "fidscript": {
      "command": "npx",
      "args": ["@fidscript/mcp", "start"],
      "env": {
        "FIDSCRIPT_API_KEY": "<your-key>",
        "FIDSCRIPT_API_URL": "${API_BASE}"
      }
    }
  }
}`;

export function McpHub({ project }: McpHubProps) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState<{ id: string; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  async function generateKey() {
    setLoading(true);
    try {
      const sdk = getSdk();
      const result = await sdk.projects.createApiKey(project.id, 'BaaS Key');
      setApiKey({ id: result.apiKey.id, key: result.key });
      setShowKey(true);
      showToast({ type: 'success', message: 'API key generated — copy it now, you won\'t see it again.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to generate key' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Backend Services</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Connect your app to FIDScript&apos;s managed backend services.
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

      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Quickstart Guide</h2>
        <div className="space-y-3 text-sm">
          {QUICKSTART.map(({ step, cmd, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold flex items-center justify-center mt-0.5">{step}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-muted)] text-xs mb-1">{desc}</p>
                <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
                  <code className="text-xs font-mono text-[var(--text)] truncate">{cmd}</code>
                  <McpHubCopyButton text={cmd} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">MCP Setup</h2>
        <p className="text-xs text-[var(--text-muted)]">Connect FIDScript to AI agents like Claude Code or Cursor.</p>
        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1">Install</p>
          <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
            <code className="text-xs font-mono text-[var(--text)]">npm install @fidscript/mcp</code>
            <McpHubCopyButton text="npm install @fidscript/mcp" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[var(--text-dim)] text-xs">Claude Desktop config</p>
            <McpHubCopyButton text={MCP_CONFIG} label="Copy JSON" />
          </div>
          <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-3">
            <pre className="text-xs font-mono text-[var(--text)] whitespace-pre-wrap">{MCP_CONFIG}</pre>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          <HugeiconsIcon icon={Key01Icon} size={12} />
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-[var(--success)]" />
          <span>Generate an API key above to paste into FIDSCRIPT_API_KEY.</span>
        </div>
      </section>

      <McpHubServicesGrid projectId={project.id} />
    </div>
  );
}
