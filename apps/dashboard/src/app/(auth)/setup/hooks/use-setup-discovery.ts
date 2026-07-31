'use client';

import { useEffect, useState } from 'react';

interface DiscoveryInfo {
  serverIp: string;
  lifecycle: string;
}

export function useSetupDiscovery() {
  const [serverIp, setServerIp] = useState('');

  useEffect(() => {
    fetch('/api/v1/installation/discover')
      .then(res => res.json())
      .then((data: DiscoveryInfo) => {
        if (data.lifecycle === 'CONFIGURED') {
          window.location.href = '/login';
        } else {
          setServerIp(data.serverIp);
        }
      })
      .catch(() => {/* non-fatal */});
  }, []);

  return { serverIp };
}
