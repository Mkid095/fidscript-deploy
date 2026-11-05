'use client';

import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Plug01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import type { Application } from '@fidscript-deploy/sdk';
import { McpCodeBlock } from './mcp-code-block';

/**
 * The data plane's own MCP server.
 *
 * The platform has an MCP server for the control plane — deployments,
 * queues, mail. The data plane has one too, and it is a different server
 * with a different job: queries, permissions, an app's data. An agent
 * operator needs both, and needs to be able to tell them apart.
 *
 * The server needs a personal access token, which is made in the Instant
 * console — the token is not printed here, because it is a credential with
 * more power than the operator probably wants in a copy-paste block.
 */
export function InstantMcpSection() {
  const { getSdk } = useAuth();
  const [instant, setInstant] = useState<Application | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSdk()
      .applications.list()
      .then((res) => {
        if (cancelled) return;
        const found = res.applications.find((a) => a.mcp) ?? null;
        setInstant(found);
      })
      .catch(() => {
        // The catalogue is not available; the section simply does not show.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [getSdk]);

  if (!loaded || !instant || !instant.mcp) return null;

  const config = JSON.stringify(
    {
      mcpServers: {
        instant: {
          command: 'npx',
          args: ['-y', instant.mcp.package],
          env: instant.mcp.env,
        },
      },
    },
    null,
    2,
  );

  return (
    <section className="border border-[var(--rail)] rounded-lg p-5 bg-[var(--surface)] space-y-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Plug01Icon} size={18} className="text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">
          MCP for the data plane
        </h2>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {instant.title} speaks its own protocol, so it has its own MCP server —
        queries, permissions, and your app&apos;s data. The server above is the
        platform&apos;s; this one is {instant.title}&apos;s. Point an agent at
        both and it can operate the platform and work with the data.
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">
            Step 1 — Install
          </p>
          <McpCodeBlock code={`npx -y ${instant.mcp.package}`} />
        </div>

        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">
            Step 2 — Claude Desktop
          </p>
          <McpCodeBlock code={config} />
        </div>

        <div>
          <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">
            Step 3 — A personal access token
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            The server authenticates with a personal access token, made in{' '}
            {instant.url ? (
              <a
                href={instant.url}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[var(--text)]"
              >
                the {instant.title} console
              </a>
            ) : (
              'the console'
            )}{' '}
            under API keys. Add it to the block above as{' '}
            <code className="font-mono">INSTANT_ACCESS_TOKEN</code>. It is not
            printed here — it is a credential with more power than belongs in
            a copy-paste block.
          </p>
        </div>
      </div>
    </section>
  );
}
