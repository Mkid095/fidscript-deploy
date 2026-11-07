'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export interface MailDomain {
  id: string;
  domain: string;
  status?: string;
  dnsMode?: string;
  projectId: string;
  projectName: string;
}

export interface MailAlias {
  id: string;
  alias: string;
  description?: string | null;
  targets?: Array<{ type: string; address?: string; mailboxId?: string }>;
  projectId: string;
  projectName: string;
}

export interface EmailApplicationState {
  loading: boolean;
  consoleConfig: import('@/components/applications/email/email-client-card').MailClientConfiguration | null;
  domains: MailDomain[];
  aliases: MailAlias[];
  error: string | null;
}

/**
 * The mail application, as the operator sees it.
 *
 * The console credential comes from the platform; the domains and aliases
 * live with the projects that own them, so they are gathered from there. A
 * project whose mail is not set up is skipped, not an error: the page is
 * about the mail server, not about one project.
 */
export function useEmailApplication(getSdk: () => FidscriptSDK): EmailApplicationState {
  const [loading, setLoading] = useState(true);
  const [consoleConfig, setConsoleConfig] = useState<EmailApplicationState['consoleConfig']>(null);
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [aliases, setAliases] = useState<MailAlias[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sdk = getSdk();
    try {
      const config = await sdk.email.admin.console();
      setConsoleConfig(config);
    } catch {
      // A platform without the mail application configured has no console.
      setConsoleConfig(null);
    }

    try {
      const { projects } = await sdk.projects.list();
      const gathered = await Promise.allSettled(
        (projects ?? []).map(async project => {
          const [domainList, aliasList] = await Promise.all([
            sdk.email.listDomains(project.id).catch(() => []),
            sdk.email.listAliases(project.id).catch(() => []),
          ]);
          return {
            projectId: project.id,
            projectName: project.name,
            domains: (domainList ?? []) as MailDomain[],
            aliases: (aliasList ?? []) as MailAlias[],
          };
        }),
      );

      const collectedDomains: MailDomain[] = [];
      const collectedAliases: MailAlias[] = [];
      for (const result of gathered) {
        if (result.status !== 'fulfilled') continue;
        for (const domain of result.value.domains) {
          collectedDomains.push({ ...domain, projectId: result.value.projectId, projectName: result.value.projectName });
        }
        for (const alias of result.value.aliases) {
          collectedAliases.push({ ...alias, projectId: result.value.projectId, projectName: result.value.projectName });
        }
      }
      setDomains(collectedDomains);
      setAliases(collectedAliases);
      setError(null);
    } catch {
      setError('The projects could not be read.');
    } finally {
      setLoading(false);
    }
  }, [getSdk]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, consoleConfig, domains, aliases, error };
}
