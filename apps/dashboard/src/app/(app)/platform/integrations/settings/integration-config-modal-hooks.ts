import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface UseIntegrationConfigReturn {
  oauthStatus: { enabled: boolean } | null;
  loadingStatus: boolean;
  statusError: string | null;
  clientId: string;
  setClientId: (v: string) => void;
  clientSecret: string;
  setClientSecret: (v: string) => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  testing: boolean;
  testResult: 'valid' | 'invalid' | null;
  loadStatus: () => Promise<void>;
  handleTest: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleDisable: () => Promise<void>;
}

export function useIntegrationConfig(): UseIntegrationConfigReturn {
  const { getSdk } = useAuth();
  const [oauthStatus, setOauthStatus] = useState<{ enabled: boolean } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'valid' | 'invalid' | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const sdk = getSdk();
      const data = await sdk.installation.getCloudflareOAuthStatus();
      setOauthStatus(data);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to load status');
    } finally {
      setLoadingStatus(false);
    }
  }, [getSdk]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleTest = useCallback(async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const sdk = getSdk();
      const res = await sdk.installation.testCloudflareConnection(clientId.trim(), clientSecret.trim());
      setTestResult(res.valid ? 'valid' : 'invalid');
    } catch { setTestResult('invalid'); }
    finally { setTesting(false); }
  }, [clientId, clientSecret, getSdk]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTestResult(null);
    try {
      const sdk = getSdk();
      await sdk.installation.updateCloudflareOAuth({ clientId: clientId.trim() || undefined, clientSecret: clientSecret.trim() || undefined });
      await loadStatus();
      setClientId('');
      setClientSecret('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  }, [clientId, clientSecret, getSdk, loadStatus]);

  const handleDisable = useCallback(async () => {
    if (!confirm('Disable Cloudflare OAuth?')) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sdk = getSdk();
      await sdk.installation.updateCloudflareOAuth({ enabled: false });
      await loadStatus();
      setClientId('');
      setClientSecret('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Disable failed');
    } finally { setSaving(false); }
  }, [getSdk, loadStatus]);

  return {
    oauthStatus, loadingStatus, statusError,
    clientId, setClientId, clientSecret, setClientSecret,
    saving, saveError, saveSuccess, testing, testResult,
    loadStatus, handleTest, handleSave, handleDisable,
  };
}
