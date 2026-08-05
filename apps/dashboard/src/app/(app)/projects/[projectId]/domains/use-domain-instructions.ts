'use client';

import { useCallback } from 'react';
import type { Domain } from '@fidscript-deploy/sdk';

export function useDomainInstructions(
  projectId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const getInstructions = useCallback(async (domain: Domain) => {
    const sdk = getSdk();
    const data = await sdk.domains.getInstructions(projectId, domain.id);
    return data.instructions ?? [];
  }, [getSdk, projectId]);

  return { getInstructions };
}
