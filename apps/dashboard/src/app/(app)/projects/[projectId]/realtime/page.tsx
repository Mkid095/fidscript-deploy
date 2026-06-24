'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { FlashIcon, ArrowRight01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { Card, Button } from '@fidscript/ui';

/**
 * Realtime — coming soon.
 *
 * The SDK has client primitives (`sdk.realtime.connect/subscribe`) but no list/channels
 * API yet, and the dashboard binding isn't built. Per the operating-system framing
 * (`CLAUDE.md`), unimplemented runtimes are greyed — never faked.
 *
 * This page exists only so the sidebar's Realtime link resolves honestly.
 */
export default function RealtimeStub() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <HugeiconsIcon icon={FlashIcon} size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-300">Realtime</h1>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
          Coming soon
        </span>
      </div>

      <Card className="border border-[#1e2130] p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">What this screen will do</h2>
        <p className="text-sm text-slate-400 mb-4">
          Realtime lets you push events from the platform to subscribed clients over WebSockets.
          Once built, this screen will show your project&apos;s active channels, connected client
          count, and let you broadcast test events.
        </p>
        <ul className="space-y-1.5 text-sm text-slate-400 ml-1 mb-4">
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            List active realtime channels for this project
          </li>
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            Show subscriber count and recent message rates
          </li>
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            Broadcast a test event to a channel (admin)
          </li>
        </ul>
        <Button variant="ghost" size="sm" disabled className="flex items-center gap-1.5">
          <HugeiconsIcon icon={FlashIcon} size={14} />
          Create channel
        </Button>
      </Card>

      <div className="bg-[#1e2130]/50 border border-[#2a2d3a] rounded-lg p-3 flex items-start gap-2">
        <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Blocked on a <code className="text-slate-300">sdk.realtime.listChannels()</code> method.
          See <Link href="/docs/product/services/realtime" className="text-blue-500 hover:text-blue-400">the Realtime service spec</Link> for the screen inventory and acceptance criteria.
        </p>
      </div>
    </div>
  );
}
