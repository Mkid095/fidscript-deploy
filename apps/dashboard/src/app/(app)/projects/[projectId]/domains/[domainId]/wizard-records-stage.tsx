'use client';

import { useState } from 'react';
import type { DnsRecord } from '@fidscript-deploy/sdk';
import { Button, Badge } from '@fidscript/ui';

interface Props {
  records: DnsRecord[];
  autoPolling?: boolean;
  autoPollError?: string | null;
  onProceed: () => void;
}

function RecordRow({ rec }: { rec: DnsRecord }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(`${rec.type}\t${rec.name}\t${rec.value}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  const statusClass =
    rec.status === 'ok' ? 'bg-emerald-900/60 text-emerald-300' :
    rec.status === 'missing' ? 'bg-red-900/60 text-red-300' :
    'bg-[var(--rail)] text-[var(--text-muted)]';
  return (
    <tr className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--surface-2)]/50">
      <td className="px-4 py-3"><Badge variant="default" className="font-mono">{rec.type}</Badge></td>
      <td className="px-4 py-3 font-mono text-xs text-[var(--text)] max-w-[160px] truncate" title={rec.name}>{rec.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] max-w-[240px] truncate" title={rec.value}>{rec.value}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{rec.status}</span>
      </td>
      <td className="px-4 py-3">
        <button onClick={copy}
          className="text-xs px-2 py-1 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors">
          {copied ? '✓' : 'Copy'}
        </button>
      </td>
    </tr>
  );
}

export function WizardRecordsStage({ records, autoPolling, autoPollError, onProceed }: Props) {
  const categories = ['deployment', 'email', 'verification'] as const;
  const allOk = records.length > 0 && records.every(r => r.status === 'ok');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Add these records at your DNS provider.
          {autoPolling && ' Auto-verifying…'}
          {allOk && ' All records look configured — proceeding to verify.'}
        </p>
        {allOk && <Button size="sm" onClick={onProceed}>Proceed to Verify</Button>}
      </div>
      {autoPollError && (
        <div className="rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          {autoPollError}
        </div>
      )}
      {categories.map(cat => {
        const catRecords = records.filter(r => r.category === cat);
        if (!catRecords.length) return null;
        return (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">{cat} records</h3>
            <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--rail)] bg-[var(--surface-2)]">
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Type</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Name</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Value</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2 hidden md:table-cell">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {catRecords.map((rec, i) => <RecordRow key={i} rec={rec} />)}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
