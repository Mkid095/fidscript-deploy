import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { DbConnectionInfo } from './connection-panel-types';

interface UseConnectionPanelReturn {
  connInfo: DbConnectionInfo | null;
  loadingConn: boolean;
  rotating: boolean;
  newPassword: string | null;
  loadConnection: () => Promise<void>;
  handleRotatePassword: () => Promise<void>;
}

export function useConnectionPanel(databaseId: string | null): UseConnectionPanelReturn {
  const { getSdk } = useAuth();
  const [connInfo, setConnInfo] = useState<DbConnectionInfo | null>(null);
  const [loadingConn, setLoadingConn] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    if (!databaseId) return;
    setLoadingConn(true);
    try {
      const conn = await getSdk().database(databaseId).connection() as DbConnectionInfo;
      setConnInfo(conn);
    } catch { /* ignore */ } finally { setLoadingConn(false); }
  }, [databaseId, getSdk]);

  const handleRotatePassword = useCallback(async () => {
    if (!databaseId) return;
    setRotating(true);
    try {
      const result = await getSdk().database(databaseId).rotatePassword() as { password: string };
      setNewPassword(result.password);
      setTimeout(() => setNewPassword(null), 30_000);
    } catch { /* ignore */ } finally { setRotating(false); }
  }, [databaseId, getSdk]);

  return {
    connInfo, loadingConn, rotating, newPassword,
    loadConnection, handleRotatePassword,
  };
}
