'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Card, Button, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import LogViewer from '@/components/log-viewer';

interface FunctionVersion {
  version: string;
  createdAt: string;
  status: string;
}

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-[var(--surface-2)]"><Spinner size="md" /></div>,
});
const DiffEditor = dynamic(() => import('@monaco-editor/react').then(m => m.DiffEditor), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-[var(--surface-2)]"><Spinner size="md" /></div>,
});

interface Function_ {
  id: string;
  name: string;
  runtime: string;
  status: string;
  projectId?: string;
  createdAt: string;
  currentVersion?: string;
}

type Tab = 'code' | 'logs' | 'settings' | 'invoke' | 'versions';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[var(--rail)] text-[var(--text-muted)]', BUILDING: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE: 'bg-emerald-900 text-[var(--success)]', FAILED: 'bg-red-900 text-[var(--danger)]',
  INACTIVE: 'bg-[var(--rail)] text-[var(--text-muted)]',
};

const RUNTIME_LANG: Record<string, string> = {
  node: 'javascript', nodejs: 'javascript', python: 'python', python3: 'python',
};

function getLang(runtime: string): string {
  return RUNTIME_LANG[runtime.toLowerCase()] ?? 'plaintext';
}

function getStarterCode(runtime: string): string {
  const lang = getLang(runtime);
  if (lang === 'javascript') return `/** FIDScript Edge Function — ${new Date().toISOString().split('T')[0]} */\nexport async function handler(event) {\n  const { request, env } = event;\n  return new Response(JSON.stringify({\n    message: 'Hello from FIDScript',\n    timestamp: new Date().toISOString(),\n  }), { status: 200, headers: { 'Content-Type': 'application/json' } });\n}\n`;
  if (lang === 'python') return `# FIDScript Edge Function — ${new Date().toISOString().split('T')[0]}\ndef handler(event, env):\n    return { 'statusCode': 200, 'body': { 'message': 'Hello from FIDScript' } }\n`;
  return '// No template for this runtime';
}

export default function FunctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: functionId } = use(params);
  const { getSdk } = useAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') ?? '';

  const [func, setFunc] = useState<Function_ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [code, setCode] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployVersion, setDeployVersion] = useState('');
  const [deployMsg, setDeployMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [invokeBody, setInvokeBody] = useState('{}');
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [invokeError, setInvokeError] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [versions, setVersions] = useState<FunctionVersion[]>([]);
  const [diffVersions, setDiffVersions] = useState<[string | null, string | null]>([null, null]);
  const [diffCode, setDiffCode] = useState<{ left: string; right: string } | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sdk = getSdk();
        const [f] = await Promise.all([sdk.functions.get(projectId, functionId)]);
        setFunc(f);
        const saved = localStorage.getItem(`fn_draft_${functionId}`);
        setCode(saved ?? getStarterCode(f.runtime ?? 'node'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load function');
      } finally {
        setLoading(false);
      }
    }
    if (projectId) load();
  }, [projectId, functionId, getSdk]);

  useEffect(() => {
    if (activeTab !== 'versions' || !projectId || !functionId) return;
    async function loadVersions() {
      setLoadingVersions(true);
      try {
        const sdk = getSdk();
        const data = await sdk.functions.listVersions(projectId, functionId);
        setVersions(data);
      } catch { /* ignore */ } finally {
        setLoadingVersions(false);
      }
    }
    loadVersions();
  }, [activeTab, projectId, functionId, getSdk]);

  function handleDiffSelect(v1: string | null, v2: string) {
    setDiffVersions([v1, v2]);
    if (!projectId || !functionId) return;
    const sdk = getSdk();
    Promise.all([
      v1 ? sdk.functions.getCode(projectId, functionId, v1) : Promise.resolve({ code: '' }),
      sdk.functions.getCode(projectId, functionId, v2),
    ]).then(([left, right]) => {
      setDiffCode({ left: left.code ?? '', right: right.code ?? '' });
    });
  }

  const handleSaveDraft = useCallback(() => {
    localStorage.setItem(`fn_draft_${functionId}`, code);
  }, [code, functionId]);

  const handleReset = useCallback(() => {
    if (!func) return;
    setCode(getStarterCode(func.runtime ?? 'node'));
    localStorage.removeItem(`fn_draft_${functionId}`);
  }, [func, functionId]);

  const handleDeploy = useCallback(async () => {
    if (!projectId || !functionId) return;
    setDeploying(true);
    setDeployMsg(null);
    try {
      const sdk = getSdk();
      const version = deployVersion.trim() || `v${Date.now()}`;
      await sdk.functions.deploy(projectId, functionId, code, version);
      const updated = await sdk.functions.get(projectId, functionId);
      setFunc(updated);
      setDeployMsg({ type: 'success', text: `Deployed as ${version}` });
      localStorage.removeItem(`fn_draft_${functionId}`);
    } catch (err) {
      setDeployMsg({ type: 'error', text: err instanceof Error ? err.message : 'Deploy failed' });
    } finally {
      setDeploying(false);
    }
  }, [projectId, functionId, code, deployVersion, getSdk]);

  async function handleInvoke(e: React.FormEvent) {
    e.preventDefault();
    setInvoking(true);
    setInvokeResult(null);
    setInvokeError(null);
    try {
      const sdk = getSdk();
      let payload: unknown;
      try { payload = JSON.parse(invokeBody); } catch { payload = invokeBody; }
      const res = await sdk.functions.invoke(projectId, functionId, payload);
      setInvokeResult(JSON.stringify(res.result ?? null, null, 2));
    } catch (err) {
      setInvokeError(err instanceof Error ? err.message : 'Invocation failed');
    } finally {
      setInvoking(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>;

  if (error || !func) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
          <Link href="/functions" className="hover:text-[var(--text-muted)]">Functions</Link>
          <span>&rsaquo;</span>
          <span className="text-[var(--danger)]">{error ?? 'Not found'}</span>
        </div>
        <p className="text-[var(--danger)]">{error ?? 'Function not found'}</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'code', label: 'Code' },
    { id: 'logs', label: 'Logs' },
    { id: 'versions', label: `Versions${versions.length > 0 ? ` (${versions.length})` : ''}` },
    { id: 'settings', label: 'Settings' },
    { id: 'invoke', label: 'Invoke' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/functions" className="text-[var(--text-muted)] hover:text-[var(--text-muted)] text-sm no-underline">Functions</Link>
        <span className="text-[var(--text-dim)]">/</span>
        <h1 className="text-xl font-bold text-[var(--text)]">{func.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[func.status] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
          {func.status ?? 'UNKNOWN'}
        </span>
        {func.currentVersion && <span className="text-xs text-[var(--text-muted)] font-mono">{func.currentVersion}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--rail)] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)] bg-none border-none cursor-pointer'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code Tab */}
      {activeTab === 'code' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSaveDraft}>Save draft</Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={deployVersion}
                onChange={e => setDeployVersion(e.target.value)}
                placeholder="v1 — optional"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text-muted)] rounded px-2 py-1 text-xs w-32 font-mono"
              />
              <Button variant="primary" size="sm" loading={deploying} onClick={handleDeploy}>Deploy</Button>
            </div>
          </div>

          {deployMsg && (
            <div className={`text-xs px-3 py-2 rounded border ${
              deployMsg.type === 'success'
                ? 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/30'
                : 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/30'
            }`}>
              {deployMsg.text}
            </div>
          )}

          <div className="rounded-xl border border-[var(--rail)] overflow-hidden" style={{ height: 480 }}>
            <MonacoEditor
              height="100%"
              language={getLang(func.runtime ?? 'node')}
              value={code}
              onChange={v => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                padding: { top: 12 },
              }}
            />
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <LogViewer
          projectId={projectId}
          loadLogs={(sdk, pid) => sdk.functions.getLogs(pid, functionId)}
          resourceId={functionId}
          stream="default"
          height={400}
        />
      )}


      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          {loadingVersions ? (
            <div className="flex items-center justify-center py-16"><Spinner size="md" /></div>
          ) : versions.length === 0 ? (
            <Card className="border border-[var(--rail)]">
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                No versions deployed yet. Use the Code tab to deploy your first version.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Version list */}
              <Card className="border border-[var(--rail)]" padding="none">
                <div className="px-4 py-3 border-b border-[var(--rail)]">
                  <h3 className="text-sm font-semibold text-[var(--text)]">Deployments</h3>
                </div>
                <div className="divide-y divide-[var(--rail)]">
                  {versions.map((v, i) => (
                    <div key={v.version} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] font-mono text-left"
                            onClick={() => handleDiffSelect(i > 0 ? versions[i-1].version : null, v.version)}
                          >
                            {v.version}
                          </button>
                          {func?.currentVersion === v.version && (
                            <span className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-1.5 py-0.5 rounded">current</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            v.status === 'success' ? 'bg-emerald-900/30 text-[var(--success)]' :
                            v.status === 'error' ? 'bg-red-900/30 text-[var(--danger)]' :
                            'bg-[var(--rail)] text-[var(--text-muted)]'
                          }`}>{v.status}</span>
                          {func?.currentVersion !== v.version && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!projectId || !functionId) return;
                                const sdk = getSdk();
                                const updated = await sdk.functions.update(projectId, functionId, { currentVersion: v.version });
                                setFunc(updated);
                              }}
                            >
                              Promote
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Diff panel */}
              <Card className="border border-[var(--rail)]" padding="none">
                <div className="px-4 py-3 border-b border-[var(--rail)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text)]">Diff</h3>
                  {diffVersions[1] && (
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      ← {diffVersions[0] ?? 'current'} → {diffVersions[1]}
                    </span>
                  )}
                </div>
                {diffCode ? (
                  <div style={{ height: 400 }}>
                    <DiffEditor
                      height="100%"
                      language={getLang(func?.runtime ?? 'node')}
                      original={diffCode.left}
                      modified={diffCode.right}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        fontSize: 12,
                        fontFamily: '"Fira Code", monospace',
                        minimap: { enabled: false },
                        renderSideBySide: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-[var(--text-muted)]">
                    Select a version to compare
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card className="border border-[var(--rail)]" padding="lg">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Function Settings</h2>
          <dl className="space-y-3 text-sm">
            {[
              ['Function ID', func.id, 'font-mono text-xs'],
              ['Name', func.name, ''],
              ['Runtime', func.runtime, 'capitalize'],
              ['Status', func.status, 'capitalize'],
              ['Created', new Date(func.createdAt).toLocaleDateString(), ''],
              ['Current Version', func.currentVersion ?? 'none', 'font-mono text-xs'],
            ].map(([dt, dd, extra]) => (
              <div key={dt as string} className="flex gap-4">
                <dt className="text-[var(--text-muted)] w-40 flex-shrink-0">{dt}</dt>
                <dd className={`text-[var(--text-muted)] ${extra}`}>{dd}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Invoke Tab */}
      {activeTab === 'invoke' && (
        <Card className="border border-[var(--rail)]" padding="lg">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Invoke Function</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">Send a payload to test this function.</p>
          <form onSubmit={handleInvoke} noValidate>
            <div className="mb-4">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Request Body (JSON)</label>
              <textarea
                value={invokeBody}
                onChange={e => setInvokeBody(e.target.value)}
                rows={6}
                className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg px-3 py-2 text-sm font-mono resize-none"
                placeholder='{}'
              />
            </div>
            {invokeError && <p className="text-[var(--danger)] text-xs mb-4">{invokeError}</p>}
            {invokeResult !== null && (
              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-1">Result</label>
                <pre className="rounded bg-[var(--surface-2)] border border-[var(--rail)] p-3 text-xs font-mono text-[var(--text-muted)] overflow-x-auto">{invokeResult}</pre>
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
