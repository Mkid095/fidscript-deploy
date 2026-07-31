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
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [invokeError, setInvokeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !functionId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const f = await sdk.functions.get(projectId, functionId) as Function_;
      setFn(f);
      const draft = localStorage.getItem(`fn_draft_${functionId}`);
      setCode(draft ?? f.currentVersion ? '' : getStarterCode(f.runtime));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load function');
    } finally {
      setLoading(false);
    }
  }, [projectId, functionId, getSdk]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!projectId || !functionId) return;
    let cancelled = false;
    const sdk = getSdk();
    const rt = (sdk as any).realtime;
    if (!rt) return;

    const token = localStorage.getItem('fidscript_access_token')
      ?? localStorage.getItem('fidscript_token') ?? '';

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;
      const unsub = rt.subscribeFunctions(projectId, (event: any) => {
        const et = event?.type;
        if (!et || et === 'function.deleted') return;
        const statusMap: Record<string, string> = {
          'function.created': 'ACTIVE',
          'function.deployed': 'ACTIVE',
          'function.error': 'FAILED',
        };
        const newStatus = statusMap[et];
        if (newStatus) {
          setFn(prev => prev ? { ...prev, status: newStatus } : prev);
        }
        if (et === 'function.deployed' || et === 'function.error') {
          setTimeout(() => { if (!cancelled) load(); }, 800);
        }
      });
      if (cancelled) unsub();
    });

    return () => { cancelled = true; };
  }, [projectId, functionId, getSdk, load]);

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
    setInvokeResult(null);
    setInvokeError(null);
    try {
      const sdk = getSdk();
      const res = await sdk.functions.invoke(projectId, functionId, {}) as any;
      setInvokeResult(JSON.stringify(res.result ?? res, null, 2));
    } catch (err) {
      setInvokeError(err instanceof Error ? err.message : 'Invocation failed');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !fn) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)] text-sm mb-4">{error ?? 'Function not found'}</p>
        <a href={`/projects/${projectId}/functions`} className="text-sm text-[var(--accent)] hover:underline">
          Back to Functions
        </a>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-full gap-6 overflow-y-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] flex-shrink-0">
        <a
          href={`/projects/${projectId}/functions`}
          className="hover:text-[var(--text)] transition-colors"
        >
          Functions
        </a>
        <span>/</span>
        <span className="text-[var(--text)]">{fn.name}</span>
      </div>

      {/* Header */}
      <FunctionHeader
        fn={fn}
        deploying={deploying}
        invokeError={invokeError}
        invokeResult={invokeResult}
        onDeploy={() => handleDeploy(code)}
        onInvoke={handleInvoke}
        onDelete={handleDelete}
      />

      {/* Tabs */}
      <FunctionTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab panels */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'code' && (
          <FunctionCode
            projectId={projectId}
            functionId={functionId}
            runtime={fn.runtime}
            getSdk={getSdk}
            initialCode={code}
            deploying={deploying}
            deployMsg={deployMsg}
            onDeploy={handleDeploy}
          />
        )}

        {activeTab === 'logs' && (
          <FunctionLogs
            projectId={projectId}
            functionId={functionId}
            getSdk={getSdk}
            inFlight={fn.status === 'BUILDING' || fn.status === 'DEPLOYING'}
          />
        )}

        {activeTab === 'versions' && (
          <FunctionVersions
            projectId={projectId}
            functionId={functionId}
            getSdk={getSdk}
          />
        )}

        {activeTab === 'settings' && (
          <FunctionSettings
            fn={fn}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'invoke' && (
          <FunctionInvoke
            projectId={projectId}
            functionId={functionId}
            getSdk={getSdk}
          />
        )}
      </div>
    </div>
  );
}

function getStarterCode(runtime: string): string {
  switch (runtime) {
    case 'node':
      return `// FIDScript Edge Function\nexport async function handler(event) {\n  const { request, env } = event;\n  return Response.json({\n    message: 'Hello from FIDScript',\n    timestamp: new Date().toISOString(),\n  });\n}\n`;
    case 'python':
      return `# FIDScript Edge Function\ndef handler(event, env):\n    return {\n        "statusCode": 200,\n        "body": {"message": "Hello from FIDScript"}\n    }\n`;
    default:
      return '// Your function code here\n';
  }
}
