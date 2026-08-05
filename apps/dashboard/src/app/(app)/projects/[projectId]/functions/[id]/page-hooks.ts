import { useState, useCallback, useEffect } from 'react';
import type { Function_ } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { getStarterCode } from './function-utils';

interface UseFunctionDetailOptions {
  projectId: string;
  functionId: string;
}

interface UseFunctionDetailReturn {
  fn: Function_ | null;
  loading: boolean;
  error: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  code: string;
  setCode: (code: string) => void;
  deploying: boolean;
  deployMsg: string | null;
  load: () => Promise<void>;
  handleDeploy: (c: string, version?: string) => Promise<void>;
  handleInvoke: () => Promise<void>;
  handleUpdate: (data: Partial<Function_>) => Promise<void>;
  handleDelete: () => Promise<void>;
}

export function useFunctionDetail({
  projectId,
  functionId,
}: UseFunctionDetailOptions): UseFunctionDetailReturn {
  const { getSdk } = useAuth();
  const [fn, setFn] = useState<Function_ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('code');
  const [code, setCode] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !functionId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const f = (await sdk.functions.get(projectId, functionId)) as Function_;
      setFn(f);
      const draft = localStorage.getItem(`fn_draft_${functionId}`);
      setCode(draft ?? (f.currentVersion ? '' : getStarterCode(f.runtime)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load function');
    } finally {
      setLoading(false);
    }
  }, [projectId, functionId, getSdk]);

  useEffect(() => { load(); }, [load]);

  const handleDeploy = useCallback(async (c: string, version?: string) => {
    setDeploying(true);
    setDeployMsg(null);
    try {
      const sdk = getSdk();
      const ver = version ?? `v${Date.now()}`;
      await sdk.functions.deploy(projectId, functionId, c, ver);
      await load();
      setDeployMsg(`Deployed as ${ver}`);
      localStorage.removeItem(`fn_draft_${functionId}`);
    } catch (err) {
      setDeployMsg(err instanceof Error ? err.message : 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  }, [projectId, functionId, getSdk, load]);

  const handleInvoke = useCallback(async () => {
    const sdk = getSdk();
    await sdk.functions.invoke(projectId, functionId, {});
  }, [projectId, functionId, getSdk]);

  const handleUpdate = useCallback(async (data: Partial<Function_>) => {
    const sdk = getSdk();
    const updated = (await sdk.functions.update(projectId, functionId, data)) as Function_;
    setFn(updated);
  }, [projectId, functionId, getSdk]);

  const handleDelete = useCallback(async () => {
    const sdk = getSdk();
    await sdk.functions.delete(projectId, functionId);
    window.location.href = `/projects/${projectId}/functions`;
  }, [projectId, functionId, getSdk]);

  return {
    fn, loading, error, activeTab, setActiveTab,
    code, setCode, deploying, deployMsg,
    load, handleDeploy, handleInvoke, handleUpdate, handleDelete,
  };
}
