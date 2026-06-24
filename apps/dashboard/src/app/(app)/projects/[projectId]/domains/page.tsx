'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { GlobalIcon, ArrowRight01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { Card, Button } from '@fidscript/ui';

/**
 * Domains — coming soon.
 *
 * The SDK has list/get/create/verify/delete methods and the endpoint inventory is
 * complete (DOM-01..06 in `docs/phases/frontend/backend/projects-deployments-domains.md`).
 * Only the dashboard binding is missing. Should graduate from stub to real screen
 * once the bindings land.
 */
export default function DomainsStub() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <HugeiconsIcon icon={GlobalIcon} size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-300">Domains</h1>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
          Coming soon
        </span>
      </div>

      <Card className="border border-[#1e2130] p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">What this screen will do</h2>
        <p className="text-sm text-slate-400 mb-4">
          Custom domains for this project&apos;s deployments, with DNS verification, SSL provisioning
          via the platform&apos;s ACME flow, and Cloudflare integration. The endpoints and SDK are
          ready; the dashboard binding is what&apos;s left.
        </p>
        <ul className="space-y-1.5 text-sm text-slate-400 ml-1 mb-4">
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            List domains attached to this project (DOM-01)
          </li>
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            Add a domain and show the ownership TXT record (DOM-02, DOM-03)
          </li>
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            Verify domain + show DNS/SSL status (DOM-04)
          </li>
          <li className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-slate-600" />
            Connect Cloudflare account (DOM-05)
          </li>
        </ul>
        <Button variant="ghost" size="sm" disabled className="flex items-center gap-1.5">
          <HugeiconsIcon icon={GlobalIcon} size={14} />
          Add domain
        </Button>
      </Card>

      <div className="bg-[#1e2130]/50 border border-[#2a2d3a] rounded-lg p-3 flex items-start gap-2">
        <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Backend inventory ready: <Link href="/docs/phases/frontend/backend/projects-deployments-domains" className="text-blue-500 hover:text-blue-400">DOM-01..06</Link>.
          Awaiting the dashboard binding.
        </p>
      </div>
    </div>
  );
}
