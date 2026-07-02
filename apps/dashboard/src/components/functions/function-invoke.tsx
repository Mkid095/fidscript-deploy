'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlayCircleIcon, CheckmarkCircle03Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { Button, Card, Spinner } from '@fidscript/ui';

import type { FidscriptSDK } from '@fidscript/sdk';

interface FunctionInvokeProps {
  projectId: string;
  functionId: string;
  getSdk: () => FidscriptSDK;
}

export function FunctionInvoke({ projectId, functionId, getSdk }: FunctionInvokeProps) {
  const [body, setBody] = useState('{}');
  const [invoking, setInvoking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  async function handleInvoke() {
    setInvoking(true);
    setResult(null);
    setError(null);
    setDuration(null);

    try {
      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        setError('Invalid JSON payload');
        setInvoking(false);
        return;
      }

      const start = Date.now();
      const res = await getSdk().functions.invoke(projectId, functionId, payload) as any;
      setDuration(Date.now() - start);
      setResult(JSON.stringify(res.result ?? res, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invocation failed');
    } finally {
      setInvoking(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--rail)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Request Body</h3>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          className="w-full h-40 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          placeholder='{"key": "value"}'
        />
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-dim)]">
          Payload is sent as JSON to your function
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={handleInvoke}
          disabled={invoking}
          className="flex items-center gap-1.5"
        >
          {invoking ? <Spinner size="sm" /> : <HugeiconsIcon icon={PlayCircleIcon} size={14} />}
          {invoking ? 'Invoking…' : 'Invoke'}
        </Button>
      </div>

      {error && (
        <Card className="border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-start gap-2">
            <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-rose-400 mt-0.5" />
            <div>
              <p className="text-sm text-rose-400 font-medium">Error</p>
              <p className="text-xs text-rose-400/70 mt-0.5 font-mono">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <Card className="border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-2">
            <HugeiconsIcon icon={CheckmarkCircle03Icon} size={16} className="text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-emerald-400 font-medium">Response</p>
                {duration !== null && (
                  <span className="text-[10px] text-emerald-400/60">{duration}ms</span>
                )}
              </div>
              <pre className="text-xs font-mono text-emerald-400/80 overflow-auto max-h-64">
                {result}
              </pre>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
