'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { SourceCodeIcon, ArrowRight01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { Card, Button } from '@fidscript/ui';

/**
 * MCP — coming soon.
 *
 * The Model Context Protocol (MCP) surface is the most missing piece of the platform.
 * No SDK module exists for it yet (`packages/sdk/src/modules/` has no `mcp.ts`).
 * The endpoint inventory is sketched in `docs/product/services/mcp.md` and the
 * inventory in `docs/phases/frontend/backend/surfaces.md` (MCP-* IDs).
 *
 * Per rule 16, this stub is honest about what's missing — the AddServer button
 * is disabled with a TODO pointing at the missing SDK module.
 */
export default function McpStub() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <HugeiconsIcon icon={SourceCodeIcon} size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-300">MCP</h1>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
          Coming soon
        </span>
      </div>

      <Card className="border border-[#1e2130] p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">What this screen will do</h2>
        <p className="text-sm text-slate-400 mb-4">
          The platform exposes itself as an MCP server, so AI agents (Claude Code, Cursor, etc.)
          can call platform endpoints through the standardized Model Context Protocol.
          Once built, this screen will list MCP servers, expose tool manifests, and surface
          connection health.
        </p>
        <ul className="space-y-1.5 text-sm text-slate-400 ml-1 mb-4">
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            List MCP servers registered for this project
          </li>
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            Show the tool manifest (what MCP methods are exposed)
          </li>
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            Health + recent call metrics
          </li>
        </ul>
        <Button variant="ghost" size="sm" disabled className="flex items-center gap-1.5">
          <HugeiconsIcon icon={SourceCodeIcon} size={14} />
          Add MCP server
        </Button>
      </Card>

      <div className="bg-[#1e2130]/50 border border-[#2a2d3a] rounded-lg p-3 flex items-start gap-2">
        <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Blocked on a missing SDK module:{' '}
          <code className="text-slate-300">packages/sdk/src/modules/mcp.ts</code>.
          See the <Link href="/docs/product/services/mcp" className="text-blue-500 hover:text-blue-400">MCP service spec</Link> for the inventory and acceptance criteria.
        </p>
      </div>
    </div>
  );
}
