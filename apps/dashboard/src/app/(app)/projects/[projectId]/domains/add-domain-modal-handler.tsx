'use client';

import { useState } from 'react';
import type { Domain, DnsConnection, DomainType } from '@fidscript-deploy/sdk';
import { AddDomainModal } from './add-domain-modal';
import { ConnectCloudflareModal } from './connect-cloudflare-modal';
import { DnsInstructionsModal } from './dns-instructions-modal';

interface AddDomainModalHandlerProps {
  projectId: string;
  connection: DnsConnection | null;
  // Add modal
  isAddOpen: boolean;
  onAddDomain: (domain: string, mode: 'manual' | 'cloudflare_auto', types: DomainType[]) => Promise<void>;
  onCloseAdd: () => void;
  // Connect modal
  isConnectOpen: boolean;
  onConnectCloudflareOAuth: () => Promise<void>;
  onConnectCloudflareToken: (token: string) => Promise<void>;
  onCloseConnect: () => void;
  // Instructions modal
  instructionsDomain: Domain | null;
  onCloseInstructions: () => void;
  getSdk: () => any;
}

interface DnsDetection {
  provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
  nameservers: string[];
  autoConfigurationAvailable: boolean;
}

export function AddDomainModalHandler({
  projectId,
  connection,
  isAddOpen,
  onAddDomain,
  onCloseAdd,
  isConnectOpen,
  onConnectCloudflareOAuth,
  onConnectCloudflareToken,
  onCloseConnect,
  instructionsDomain,
  onCloseInstructions,
  getSdk,
}: AddDomainModalHandlerProps) {
  const [instructions, setInstructions] = useState<any[]>([]);
  const [loadingInstructions, setLoadingInstructions] = useState(false);

  async function getDnsDetection(_projectId: string, domain: string): Promise<DnsDetection | null> {
    try {
      const sdk = getSdk();
      return await sdk.domains.detectDnsProvider(projectId, domain) as DnsDetection;
    } catch {
      return null;
    }
  }

  async function getInstructions(domain: Domain): Promise<any[]> {
    setLoadingInstructions(true);
    try {
      const sdk = getSdk();
      const data = await sdk.domains.getInstructions(projectId, domain.id);
      setInstructions(data.instructions ?? []);
      return data.instructions ?? [];
    } catch {
      setInstructions([]);
      return [];
    } finally {
      setLoadingInstructions(false);
    }
  }

  return (
    <>
      <AddDomainModal
        projectId={projectId}
        connection={connection}
        isOpen={isAddOpen}
        onAdd={onAddDomain}
        onClose={onCloseAdd}
        onOpenConnect={onConnectCloudflareOAuth}
        getDnsDetection={getDnsDetection}
      />
      <ConnectCloudflareModal
        isOpen={isConnectOpen}
        onClose={onCloseConnect}
        onOAuth={onConnectCloudflareOAuth}
        onToken={onConnectCloudflareToken}
      />
      <DnsInstructionsModal
        domain={instructionsDomain}
        onClose={onCloseInstructions}
        getInstructions={getInstructions}
      />
    </>
  );
}
