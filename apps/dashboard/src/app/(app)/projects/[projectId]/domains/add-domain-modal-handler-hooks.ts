import { useState, useCallback } from 'react';
import type { Domain } from '@fidscript-deploy/sdk';
import { useAuth } from '@/contexts/auth-context';

interface DnsDetection {
  provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
  nameservers: string[];
  autoConfigurationAvailable: boolean;
}

interface UseAddDomainHandlerOptions {
  projectId: string;
}

interface UseAddDomainHandlerReturn {
  instructions: any[];
  loadingInstructions: boolean;
  getDnsDetection: (_projectId: string, domain: string) => Promise<DnsDetection | null>;
  getInstructions: (domain: Domain) => Promise<any[]>;
}

export function useAddDomainHandler({
  projectId,
}: UseAddDomainHandlerOptions): UseAddDomainHandlerReturn {
  const { getSdk } = useAuth();
  const [instructions, setInstructions] = useState<any[]>([]);
  const [loadingInstructions, setLoadingInstructions] = useState(false);

  const getDnsDetection = useCallback(async (_projectId: string, domain: string): Promise<DnsDetection | null> => {
    try {
      const sdk = getSdk();
      return await sdk.domains.detectDnsProvider(projectId, domain) as DnsDetection;
    } catch {
      return null;
    }
  }, [projectId, getSdk]);

  const getInstructions = useCallback(async (domain: Domain): Promise<any[]> => {
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
  }, [projectId, getSdk]);

  return { instructions, loadingInstructions, getDnsDetection, getInstructions };
}
