'use client';

import { useState, useEffect } from 'react';
import { Button, Modal, Spinner, Badge } from '@fidscript/ui';
import type { Domain } from '@fidscript-deploy/sdk';

interface DnsInstructionsModalProps {
  domain: Domain | null;
  onClose: () => void;
  getInstructions: (domain: Domain) => Promise<any[]>;
}

export function DnsInstructionsModal({ domain, onClose, getInstructions }: DnsInstructionsModalProps) {
  const [instructions, setInstructions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!domain) return;
    setLoading(true);
    getInstructions(domain)
      .then(setInstructions)
      .catch(() => setInstructions([]))
      .finally(() => setLoading(false));
  }, [domain, getInstructions]);

  return (
    <Modal
      isOpen={!!domain}
      onClose={onClose}
      title={`DNS Setup — ${domain?.domain ?? ''}`}
      size="lg"
    >
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Add the following DNS records at your registrar or DNS provider to verify ownership
        and route traffic for <strong className="text-[var(--text)]">{domain?.domain}</strong>.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Spinner size="md" /></div>
      ) : instructions.length > 0 ? (
        <div className="rounded-lg border border-[var(--rail)] overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)] bg-[var(--surface-2)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Type</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Name</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Value</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2 hidden md:table-cell">TTL</th>
              </tr>
            </thead>
            <tbody>
              {instructions.map((rec: any, i: number) => (
                <tr key={i} className="border-b border-[var(--rail)] last:border-0">
                  <td className="px-4 py-2.5"><Badge variant="default">{rec.type}</Badge></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text)]">{rec.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">{rec.value}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] hidden md:table-cell">{rec.ttl ?? 300}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] mb-4">No instructions available for this domain.</p>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
