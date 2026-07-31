'use client';

import { useState, useCallback } from 'react';
import type { Domain, DnsConnection, DomainType } from '@fidscript-deploy/sdk';
import { startCloudflareOAuth } from './cloudflare-oauth';

export function useDomainData(projectId: string, getSdk: () => any) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [connection, setConnection] = useState<DnsConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [domainList, conn] = await Promise.all([
        sdk.domains.list(projectId),
        sdk.domains.getConnection(projectId),
      ]);
      setDomains(domainList ?? []);
      setConnection(conn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId]);

  async function getDnsDetection(projectId: string, domain: string) {
    const sdk = getSdk();
    return sdk.domains.detectDnsProvider(projectId, domain) as Promise<any>;
  }

  async function handleAddDomain(domain: string, mode: 'manual' | 'cloudflare_auto', types: DomainType[]) {
    const sdk = getSdk();
    const created = await sdk.domains.create(projectId, domain, mode, undefined, types) as Domain;
    setDomains(prev => [...prev, created]);
    setShowAdd(false);
    setToast({ message: `Domain "${domain}" added`, type: 'success' });
  }

  async function handleConnectCloudflareOAuth() {
    await startCloudflareOAuth(projectId, getSdk, {
      onSuccess: (conn, updated) => {
        setConnection(conn);
        setShowConnect(false);
        setDomains(updated);
        setToast({ message: 'Cloudflare connected successfully', type: 'success' });
      },
      onError: (err) => setToast({ message: err.message, type: 'error' }),
    });
  }

  async function handleConnectCloudflareToken(token: string) {
    const sdk = getSdk();
    const conn = await sdk.domains.connectCloudflare(projectId, token);
    setConnection(conn);
    setShowConnect(false);
    setToast({ message: 'Cloudflare connected successfully', type: 'success' });
  }

  async function handleVerify(domain: Domain) {
    setVerifyingId(domain.id);
    try {
      const sdk = getSdk();
      const updated = await sdk.domains.verify(domain.id) as Domain;
      setDomains(prev => prev.map(d => d.id === updated.id ? updated : d));
      setToast({ message: `Verification complete for ${domain.domain}`, type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Verification failed', type: 'error' });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(domain: Domain) {
    if (!confirm(`Remove "${domain.domain}" from this project? This cannot be undone.`)) return;
    try {
      const sdk = getSdk();
      await sdk.domains.delete(domain.id);
      setDomains(prev => prev.filter(d => d.id !== domain.id));
      if (selectedDomain?.id === domain.id) setSelectedDomain(null);
      setToast({ message: `Domain "${domain.domain}" removed`, type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete domain', type: 'error' });
    }
  }

  return {
    domains, connection, loading, error,
    showAdd, setShowAdd,
    showConnect, setShowConnect,
    selectedDomain, setSelectedDomain,
    verifyingId, toast,
    load,
    handleAddDomain,
    handleConnectCloudflareOAuth,
    handleConnectCloudflareToken,
    handleVerify,
    handleDelete,
    clearToast,
  };
}
