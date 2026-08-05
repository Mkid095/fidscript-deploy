'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import {
  FunctionHeader,
  FunctionTabs,
  FunctionCode,
  FunctionLogs,
  FunctionSettings,
  FunctionVersions,
  FunctionInvoke,
} from '@/components/functions';
import type { Function_ } from '@/types';
import { getStarterCode } from './function-utils';
import { FunctionBreadcrumb } from './function-breadcrumb';
import { FunctionErrorState } from './function-error-state';
import { useFunctionRealtime } from './use-function-realtime';

export default function FunctionDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const functionId = params.id as string;
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
      const f = await sdk.functions.get(projectId, functionId) as Function_;
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

  useFunctionRealtime({
    projectId,
    functionId,
    getSdk,
    onStatusUpdate: status => setFn(prev => prev ? { ...prev, status } : prev),
    onReload: load,
  });

  async function handleDeploy(c: string, version?: string) {
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
  }

  async function handleInvoke() {
    const sdk = getSdk();
    await sdk.functions.invoke(projectId, functionId, {});
  }

  async function handleUpdate(data: Partial<Function_>) {
    const sdk = getSdk();
    const updated = await sdk.functions.update(projectId, functionId, data) as Function_;
    setFn(updated);
  }

  async function handleDelete() {
    const sdk = getSdk();
    await sdk.functions.delete(projectId, functionId);
    window.location.href = `/projects/${projectId}/functions`;
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  );

  if (error || !fn) return <FunctionErrorState error={error} projectId={projectId} />;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-full gap-6 overflow-y-auto">
      <FunctionBreadcrumb projectId={projectId} fn={fn} />

      <FunctionHeader
        fn={fn} deploying={deploying}
        onDeploy={() => handleDeploy(code)} onInvoke={handleInvoke} onDelete={handleDelete}
      />

      <FunctionTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'code' && (
          <FunctionCode
            projectId={projectId} functionId={functionId} runtime={fn.runtime}
            status={fn.status} currentVersion={fn.currentVersion} memoryMb={fn.memoryMb}
            getSdk={getSdk} initialCode={code} deploying={deploying} deployMsg={deployMsg}
            onDeploy={handleDeploy} onInvoke={handleInvoke}
          />
        )}
        {activeTab === 'logs' && (
          <FunctionLogs projectId={projectId} functionId={functionId} getSdk={getSdk}
            inFlight={fn.status === 'BUILDING' || fn.status === 'DEPLOYING'} />
        )}
        {activeTab === 'versions' && (
          <FunctionVersions projectId={projectId} functionId={functionId} getSdk={getSdk} />
        )}
        {activeTab === 'settings' && (
          <FunctionSettings fn={fn} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
        {activeTab === 'invoke' && (
          <FunctionInvoke projectId={projectId} functionId={functionId} getSdk={getSdk} />
        )}
      </div>
    </div>
  );
}
