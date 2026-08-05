import type { EmailDomain, EmailAlias, FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

export interface DomainDetails {
  domain: EmailDomain & Record<string, unknown>;
  mailboxes: Mailbox[];
  aliases: EmailAlias[];
}

export function useDomainData(domainId: string) {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [data, setData] = useState<DomainDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const domain = await sdk.email.getDomain(projectId, domainId);
      const domainName = (domain as EmailDomain & Record<string, unknown>).domain ?? (domain as EmailDomain & Record<string, unknown>).name ?? '';
      const [mbList, aliasList] = await Promise.all([
        sdk.email.listMailboxes(projectId),
        sdk.email.listAliases(projectId),
      ]);
      setData({
        domain: domain as EmailDomain & Record<string, unknown>,
        mailboxes: (mbList ?? []).filter((m: Mailbox) => m.email.endsWith(`@${domainName}`)),
        aliases: (aliasList ?? []).filter((a: EmailAlias) => a.alias.endsWith(`@${domainName}`)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domain');
    } finally {
      setLoading(false);
    }
  }, [projectId, domainId, getSdk]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

export function useCatchAllRule(projectId: string, domainId: string) {
  const { getSdk } = useAuth();
  const [rule, setRule] = useState<{ id: string; target: { type: string; mailboxId?: string; address?: string }; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const result = await sdk.email.getCatchAll(projectId, domainId);
      setRule(result as typeof rule);
    } catch {
      setRule(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, domainId, getSdk]);

  const remove = useCallback(async () => {
    if (!projectId) return;
    const sdk = getSdk();
    await sdk.email.deleteCatchAll(projectId, domainId);
    setRule(null);
  }, [projectId, domainId, getSdk]);

  return { rule, loading, reload: load, remove };
}
