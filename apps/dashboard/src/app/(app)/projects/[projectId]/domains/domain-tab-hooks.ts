'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Domain, DomainHealth, DnsRecord, DomainIncident, DomainVerificationRun, DomainSslInfo } from '@fidscript-deploy/sdk';

// ── useDomainHealth ─────────────────────────────────────────────────────────────

interface UseDomainHealthOptions { polling?: boolean }

export function useDomainHealth(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
  options: UseDomainHealthOptions = {},
) {
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const healthData = await sdk.domains.getHealth(projectId, domainId).catch(() => null);
      setHealth(healthData as DomainHealth | null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  function startPolling() {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    let attempts = 0;
    function poll() {
      if (attempts >= 20) return;
      attempts++;
      getSdk().domains.getHealth(projectId, domainId)
        .then((result: unknown) => {
          const h = result as DomainHealth | null;
          if (h && h.status !== 'degraded') { setHealth(h); setCheckingHealth(false); return; }
          pollingRef.current = setTimeout(poll, 3000);
        })
        .catch(() => { pollingRef.current = setTimeout(poll, 3000); });
    }
    pollingRef.current = setTimeout(poll, 3000);
  }

  async function triggerHealthCheck() {
    setCheckingHealth(true);
    try {
      await getSdk().domains.triggerHealthCheck(projectId, domainId);
      if (options.polling) startPolling();
      else await load();
    } catch { setCheckingHealth(false); }
  }

  useEffect(() => () => { if (pollingRef.current) clearTimeout(pollingRef.current); }, []);

  return { health, loading, checkingHealth, triggerHealthCheck, reload: load };
}

// ── useDnsRecords ──────────────────────────────────────────────────────────────

export function useDnsRecords(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const dnsData = await sdk.domains.getDnsRecords(projectId, domainId).catch(() => null);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setDnsRecords(d.records ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { dnsRecords, loading, reload: load };
}

// ── useDomainEmail ─────────────────────────────────────────────────────────────

export function useDomainEmail(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [domain, setDomain] = useState<Domain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [domainData, dnsData] = await Promise.all([
        sdk.domains.get(domainId).catch(() => null),
        sdk.domains.getDnsRecords(projectId, domainId).catch(() => null),
      ]);
      if (domainData) setDomain(domainData as Domain);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setDnsRecords(d.records ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { domain, dnsRecords, loading, reload: load };
}

// ── useDomainRepairs ──────────────────────────────────────────────────────────

export function useDomainRepairs(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [incidents, setIncidents] = useState<DomainIncident[]>([]);
  const [history, setHistory] = useState<DomainVerificationRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [incidentData, historyData] = await Promise.all([
        sdk.domains.getIncidents(projectId, domainId).catch(() => null),
        sdk.domains.getHistory(projectId, domainId).catch(() => null),
      ]);
      if (incidentData) setIncidents(incidentData as DomainIncident[]);
      if (historyData) setHistory(historyData as DomainVerificationRun[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { incidents, history, loading, reload: load };
}

// ── useDomainOverview ─────────────────────────────────────────────────────────

export function useDomainOverview(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [domain, setDomain] = useState<Domain | null>(null);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [domainData, healthData] = await Promise.all([
        sdk.domains.get(domainId).catch(() => null),
        sdk.domains.getHealth(projectId, domainId).catch(() => null),
      ]);
      if (!domainData) { setError('Domain not found'); return; }
      setDomain(domainData as Domain);
      setHealth(healthData as DomainHealth | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { domain, health, loading, error, reload: load };
}

// ── useDomainSsl ──────────────────────────────────────────────────────────────

export function useDomainSsl(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [ssl, setSsl] = useState<DomainSslInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const sslData = await sdk.domains.getSsl(projectId, domainId).catch(() => null);
      setSsl(sslData as DomainSslInfo | null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { ssl, loading, reload: load };
}

// ── useDomainWizard ────────────────────────────────────────────────────────────

export function useDomainWizard(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [dnsData, healthData] = await Promise.all([
        sdk.domains.getDnsRecords(projectId, domainId).catch(() => null),
        sdk.domains.getHealth(projectId, domainId).catch(() => null),
      ]);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setRecords(d.records ?? []);
      }
      if (healthData) setHealth(healthData as DomainHealth);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { records, health, loading, reload: load };
}
