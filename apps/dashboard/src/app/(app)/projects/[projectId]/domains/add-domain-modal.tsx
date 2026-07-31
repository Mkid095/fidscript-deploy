'use client';

import { useState, useRef } from 'react';
import { Button, Modal } from '@fidscript/ui';
import type { DomainType } from '@fidscript-deploy/sdk';
import { AddDomainForm } from './add-domain-form';

interface DnsDetection {
  provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
  nameservers: string[];
  autoConfigurationAvailable: boolean;
}

interface AddDomainModalProps {
  projectId: string;
  connection: any | null;
  isOpen: boolean;
  onAdd: (domain: string, mode: 'manual' | 'cloudflare_auto', types: DomainType[]) => Promise<void>;
  onClose: () => void;
  onOpenConnect: () => void;
  getDnsDetection: (projectId: string, domain: string) => Promise<DnsDetection | null>;
}

export function AddDomainModal({
  projectId,
  connection,
  isOpen,
  onAdd,
  onClose,
  onOpenConnect,
  getDnsDetection,
}: AddDomainModalProps) {
  const [newDomain, setNewDomain] = useState('');
  const [dnsMode, setDnsMode] = useState<'manual' | 'cloudflare_auto'>('manual');
  const [newDomainTypes, setNewDomainTypes] = useState<DomainType[]>(['DEPLOYMENT']);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [dnsDetection, setDnsDetection] = useState<DnsDetection | null>(null);
  const [detecting, setDetecting] = useState(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      if (dnsMode === 'cloudflare_auto' && !connection) {
        onClose();
        onOpenConnect();
        return;
      }
      await onAdd(newDomain.trim(), dnsMode, newDomainTypes);
      reset();
      onClose();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

  async function handleDetectDns(domainName: string) {
    if (!domainName.trim() || domainName.length < 4) return;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(async () => {
      setDetecting(true);
      try {
        const result = await getDnsDetection(projectId, domainName.trim());
        setDnsDetection(result);
        if (result?.provider === 'cloudflare' && dnsMode === 'manual') setDnsMode('cloudflare_auto');
      } catch {
        setDnsDetection(null);
      } finally {
        setDetecting(false);
      }
    }, 600);
  }

  function reset() {
    setNewDomain('');
    setNewDomainTypes(['DEPLOYMENT']);
    setAddError(null);
    setDnsDetection(null);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); reset(); }}
      title="Add Domain"
      size="md"
    >
      <form onSubmit={handleAdd} noValidate>
        <AddDomainForm
          newDomain={newDomain}
          dnsMode={dnsMode}
          newDomainTypes={newDomainTypes}
          dnsDetection={dnsDetection}
          detecting={detecting}
          connection={connection}
          addError={addError}
          onDomainChange={v => { setNewDomain(v); handleDetectDns(v); }}
          onDnsModeChange={setDnsMode}
          onTypesChange={setNewDomainTypes}
          onOpenConnect={() => { onClose(); onOpenConnect(); }}
        />

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" size="sm" type="button" onClick={() => { onClose(); reset(); }}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={adding}>
            {adding ? 'Adding...' : 'Add Domain'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
