'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Toast } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useDomainData } from './use-domain-data';
import { DomainListHeader } from './domain-list-header';
import { DomainListContent } from './domain-list-content';
import { AddDomainModalHandler } from './add-domain-modal-handler';

export default function DomainsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { getSdk } = useAuth();

  const d = useDomainData(projectId, getSdk);
  useEffect(() => { d.load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <DomainListHeader
        domains={d.domains}
        connection={d.connection}
        onAddDomain={() => d.setShowAdd(true)}
        onConnectCloudflare={() => d.setShowConnect(true)}
      />

      {d.error && (
        <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {d.error}
        </div>
      )}

      <DomainListContent
        domains={d.domains}
        loading={d.loading}
        projectId={projectId}
        verifyingId={d.verifyingId}
        onVerify={d.handleVerify}
        onDelete={d.handleDelete}
        onShowInstructions={d.setSelectedDomain}
        onAddDomain={() => d.setShowAdd(true)}
        onConnectCloudflare={() => d.setShowConnect(true)}
      />

      <AddDomainModalHandler
        projectId={projectId}
        connection={d.connection}
        isAddOpen={d.showAdd}
        onAddDomain={d.handleAddDomain}
        onCloseAdd={() => d.setShowAdd(false)}
        isConnectOpen={d.showConnect}
        onConnectCloudflareOAuth={d.handleConnectCloudflareOAuth}
        onConnectCloudflareToken={d.handleConnectCloudflareToken}
        onCloseConnect={() => d.setShowConnect(false)}
        selectedDomain={d.selectedDomain}
        onShowInstructions={d.setSelectedDomain}
        onCloseInstructions={() => d.setSelectedDomain(null)}
        getSdk={getSdk}
      />

      {d.toast && (
        <Toast type={d.toast.type} message={d.toast.message} onClose={d.clearToast} />
      )}
    </div>
  );
}
