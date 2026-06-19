'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
// Local type definitions mirroring SDK internal interfaces
interface Function_ {
  id: string;
  name: string;
  runtime: string;
  status: string;
  projectId?: string;
  createdAt: string;
}
interface FunctionLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

type Tab = 'code' | 'logs' | 'settings' | 'invoke';

const LOG_LEVEL_COLORS: Record<string, string> = {
  debug: 'text-slate-500',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  fatal: 'text-red-600 font-bold',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  BUILDING: 'bg-blue-900 text-blue-400',
  ACTIVE: 'bg-emerald-900 text-emerald-400',
  FAILED: 'bg-red-900 text-red-400',
  INACTIVE: 'bg-slate-700 text-slate-400',
};

export default function FunctionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const functionId = params.id as string;
  const projectId = searchParams.get('project') ?? '';

  const [func, setFunc] = useState<Function_ | null>(null);
  const [logs, setLogs] = useState<FunctionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [invokeBody, setInvokeBody] = useState('{}');
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [invokeError, setInvokeError] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoading(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
        const [funcData] = await Promise.all([
          sdk.functions.get(projectId, functionId),
        ]);
        setFunc(funcData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load function');
      } finally {
        setLoading(false);
      }
    }
    if (projectId) load();
  }, [projectId, functionId]);

  useEffect(() => {
    if (activeTab !== 'logs' || !projectId || !functionId) return;

    async function loadLogs() {
      try {
        const token = localStorage.getItem('fidscript_token');
        if (!token) return;
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.functions.getLogs(projectId, functionId);
        setLogs(data);
      } catch {
        // ignore log errors
      }
    }
    loadLogs();
  }, [activeTab, projectId, functionId]);

  async function handleInvoke(e: React.FormEvent) {
    e.preventDefault();
    setInvoking(true);
    setInvokeResult(null);
    setInvokeError(null);
    try {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      let payload: unknown;
      try {
        payload = JSON.parse(invokeBody);
      } catch {
        payload = invokeBody;
      }
      const res = await sdk.functions.invoke(projectId, functionId, payload);
      setInvokeResult(JSON.stringify(res.result ?? null, null, 2));
    } catch (err) {
      setInvokeError(err instanceof Error ? err.message : 'Invocation failed');
    } finally {
      setInvoking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !func) {
    return (
      <div className="text-red-400 text-sm">{error ?? 'Function not found'}</div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'code', label: 'Code' },
    { id: 'logs', label: `Logs${logs.length > 0 ? ` (${logs.length})` : ''}` },
    { id: 'settings', label: 'Settings' },
    { id: 'invoke', label: 'Invoke' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/functions" className="text-slate-500 hover:text-slate-300 text-sm no-underline">
          Functions
        </Link>
        <span className="text-slate-600">/</span>
        <h1 className="text-xl font-bold text-slate-200">{func.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[func.status] ?? 'bg-slate-700 text-slate-300'}`}>
          {func.status ?? 'UNKNOWN'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e2130] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors duration-150 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-500 text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            } bg-none border-none cursor-pointer`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'code' && (
        <Card className="border border-[#1e2130]" padding="lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Function Code</h2>
          <p className="text-xs text-slate-500 mb-4">
            This function was created with runtime <span className="text-slate-300">{func.runtime}</span>.
            Code editing and deployment are not yet available in the dashboard.
          </p>
          <div className="rounded bg-[#080a0d] border border-[#1e2130] p-4">
            <pre className="text-xs text-slate-400 font-mono overflow-x-auto">
              {`// ${func.name}\n// Runtime: ${func.runtime}\n// Status: ${func.status}\n// ID: ${func.id}\n\n// No code deployed yet.\n// Deploy via SDK or CLI.`}
            </pre>
          </div>
        </Card>
      )}

      {activeTab === 'logs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Logs</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const token = localStorage.getItem('fidscript_token');
                if (!token || !projectId || !functionId) return;
                const sdk = createFidscript({ apiKey: token });
                const data = await sdk.functions.getLogs(projectId, functionId);
                setLogs(data);
              }}
            >
              Refresh
            </Button>
          </div>
          {logs.length === 0 ? (
            <Card className="border border-[#1e2130]">
              <p className="text-sm text-slate-500 text-center py-8">No logs available.</p>
            </Card>
          ) : (
            <Card className="border border-[#1e2130] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2130]">
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Timestamp</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Level</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono uppercase ${LOG_LEVEL_COLORS[log.level] ?? 'text-slate-400'}`}>
                        {log.level}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs font-mono">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <Card className="border border-[#1e2130]" padding="lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Function Settings</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="text-slate-500 w-40 flex-shrink-0">Function ID</dt>
              <dd className="text-slate-300 font-mono text-xs">{func.id}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 w-40 flex-shrink-0">Name</dt>
              <dd className="text-slate-300">{func.name}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 w-40 flex-shrink-0">Runtime</dt>
              <dd className="text-slate-300">{func.runtime}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 w-40 flex-shrink-0">Status</dt>
              <dd className="text-slate-300 capitalize">{func.status ?? 'UNKNOWN'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 w-40 flex-shrink-0">Created</dt>
              <dd className="text-slate-300">{new Date(func.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 w-40 flex-shrink-0">Project ID</dt>
              <dd className="text-slate-300 font-mono text-xs">{func.projectId ?? projectId}</dd>
            </div>
          </dl>
        </Card>
      )}

      {activeTab === 'invoke' && (
        <Card className="border border-[#1e2130]" padding="lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Invoke Function</h2>
          <p className="text-xs text-slate-500 mb-4">
            Send a JSON payload to invoke this function. The result will be displayed below.
          </p>
          <form onSubmit={handleInvoke} noValidate>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Request Body (JSON)</label>
              <textarea
                value={invokeBody}
                onChange={e => setInvokeBody(e.target.value)}
                rows={6}
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm font-mono resize-none"
                placeholder='{}'
              />
            </div>
            {invokeError && <p className="text-red-400 text-xs mb-4">{invokeError}</p>}
            {invokeResult !== null && (
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1">Result</label>
                <pre className="rounded bg-[#080a0d] border border-[#1e2130] p-3 text-xs font-mono text-slate-300 overflow-x-auto">
                  {invokeResult}
                </pre>
              </div>
            )}
            <Button variant="primary" size="sm" type="submit" loading={invoking}>
              {invoking ? 'Invoking...' : 'Invoke'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
