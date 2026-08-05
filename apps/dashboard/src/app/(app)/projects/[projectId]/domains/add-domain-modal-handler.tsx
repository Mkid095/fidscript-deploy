'use client';

import type { Domain, DnsConnection, DomainType } from '@fidscript-deploy/sdk';
import { AddDomainModal } from './add-domain-modal';
import { ConnectCloudflareModal } from './connect-cloudflare-modal';
import { DnsInstructionsModal } from './dns-instructions-modal';
import { useAddDomainHandler } from './add-domain-modal-handler-hooks';

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
}: AddDomainModalHandlerProps) {
  const { getDnsDetection, getInstructions } = useAddDomainHandler({ projectId });

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
