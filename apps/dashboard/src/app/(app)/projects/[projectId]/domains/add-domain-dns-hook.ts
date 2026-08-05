'use client';

import { useCallback, useRef, useState } from 'react';

interface DnsDetection {
  provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
  nameservers: string[];
  autoConfigurationAvailable: boolean;
  suggestedMode: 'cloudflare_auto' | 'manual';
}

export function useDnsDetection(getSdk: () => any) {
  const [dnsDetection, setDnsDetection] = useState<DnsDetection | null>(null);
  const [detecting, setDetecting] = useState(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDetectDns = useCallback(async (domainName: string) => {
    if (!domainName.trim() || domainName.length < 4) return;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(async () => {
      setDetecting(true);
      try {
        const sdk = getSdk();
        const result = await sdk.domains.detectDnsProvider(null, domainName.trim()) as DnsDetection;
        setDnsDetection(result);
      } catch {
        setDnsDetection(null);
      } finally {
        setDetecting(false);
      }
    }, 600);
  }, [getSdk]);

  return { dnsDetection, detecting, handleDetectDns };
}
