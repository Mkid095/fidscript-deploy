'use client';

import { useEffect, useRef, useState } from 'react';

export function useDomainValidation(platformDomain: string) {
  const [domainError, setDomainError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!platformDomain) { setDomainError(null); setValidating(false); return; }
    const re = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!re.test(platformDomain) || platformDomain.startsWith('.')) {
      setDomainError('Enter a valid domain like deploy.example.com');
      return;
    }
    setDomainError(null);

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setValidating(true);
      const current = platformDomain;

      fetch(
        `${window.location.protocol}//${window.location.host}/api/v1/installation/validate?platformDomain=${encodeURIComponent(current)}`,
        { signal: controller.signal }
      )
        .then(res => res.json())
        .then((payload: { validations: Array<{ step: string; valid: boolean; issues: string[] }> }) => {
          if (current !== platformDomain) return;
          const dnsVal = payload.validations?.find(v => v.step === 'dns');
          if (dnsVal && !dnsVal.valid) setDomainError(dnsVal.issues[0] ?? 'Domain validation failed');
        })
        .catch(err => { if (err.name !== 'AbortError') setDomainError('Validation request failed'); })
        .finally(() => { if (current === platformDomain) setValidating(false); });
    }, 500);

    return () => { clearTimeout(timer); abortRef.current?.abort(); };
  }, [platformDomain]);

  return { domainError, validating };
}
