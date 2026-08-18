/**
 * use-account-credentials.ts
 * Manages the lifecycle of Account API Keys (fsk_) for the AI Control Center.
 * Uses sdk.auth.createApiKey() / sdk.auth.apiKeys() / sdk.auth.revokeApiKey().
 *
 * Raw key is stored in component state only — never in localStorage.
 */
import { useState, useCallback, useEffect } from 'react';

export interface AccountKey {
  id: string;
  name: string;
  keyPrefix: string;        // "fsk_xxxxxx" — first 8 chars of the raw key
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
}

export type ExpiryOption = '30m' | '1h' | '7d' | '30d' | 'never';

function expiryDate(option: ExpiryOption): string | null {
  const d = new Date();
  switch (option) {
    case '30m':  d.setMinutes(d.getMinutes() + 30); break;
    case '1h':   d.setHours(d.getHours() + 1);      break;
    case '7d':   d.setDate(d.getDate() + 7);        break;
    case '30d':  d.setDate(d.getDate() + 30);        break;
    case 'never': return null;
  }
  return d.toISOString();
}

const PLATFORM_API_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '';

type SdkGetter = () => { auth: {
  apiKeys: () => Promise<any>;
  createApiKey: (name: string, scopes?: string[]) => Promise<any>;
  revokeApiKey: (id: string) => Promise<any>;
} };

interface UseAccountCredentialsReturn {
  keys: AccountKey[];
  selectedKey: AccountKey | null;
  showKey: string | null;
  expiryOption: ExpiryOption;
  platformApiUrl: string;
  loading: boolean;
  error: string | null;
  createKey: (name: string) => Promise<void>;
  revokeKey: (id: string) => Promise<void>;
  setExpiryOption: (o: ExpiryOption) => void;
  setSelectedKey: (k: AccountKey) => void;
  clearShowKey: () => void;
}

export function useAccountCredentials(getSdk: SdkGetter): UseAccountCredentialsReturn {
  const [keys, setKeys] = useState<AccountKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<AccountKey | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const sdk = getSdk();
      const res = await sdk.auth.apiKeys();
      const items: any[] = res.items ?? res.apiKeys ?? [];
      const mapped: AccountKey[] = items.map((k: any) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix ?? (k.keyPreview?.startsWith('fsk_') ? k.keyPreview.slice(0, 8) : k.keyPreview ?? 'fsk_??????'),
        permissions: k.scopes ?? k.permissions ?? [],
        expiresAt: k.expiresAt ?? null,
        createdAt: k.createdAt,
      }));
      setKeys(mapped);
      setSelectedKey(prev => (prev && mapped.find(k => k.id === prev.id)) ? mapped.find(k => k.id === prev.id)! : mapped[0] ?? null);
    } catch {
      setKeys([]);
    }
  }, [getSdk]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createKey = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const expiresAt = expiryDate(expiryOption);
      const result = await sdk.auth.createApiKey(name, []);
      const raw: string = result.key as string;
      const prefix = raw.slice(0, 8);
      const newKey: AccountKey = {
        id: result.id as string,
        name: result.name ?? name,
        keyPrefix: prefix,
        permissions: (result.permissions ?? []) as string[],
        expiresAt: result.expiresAt ?? null,
        createdAt: result.createdAt as string,
      };
      setKeys(prev => [newKey, ...prev]);
      setSelectedKey(newKey);
      setShowKey(raw);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  }, [getSdk, expiryOption]);

  const revokeKey = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      await sdk.auth.revokeApiKey(id);
      setKeys(prev => prev.filter(k => k.id !== id));
      setSelectedKey(prev => prev?.id === id ? null : prev);
      if (selectedKey?.id === id) setShowKey(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to revoke API key');
    } finally {
      setLoading(false);
    }
  }, [getSdk, selectedKey]);

  const clearShowKey = useCallback(() => setShowKey(null), []);

  return {
    keys, selectedKey, showKey, expiryOption,
    platformApiUrl: PLATFORM_API_URL,
    loading, error,
    createKey, revokeKey, setExpiryOption, setSelectedKey, clearShowKey,
  };
}
