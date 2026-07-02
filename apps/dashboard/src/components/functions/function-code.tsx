'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, SaveIcon, Upload03Icon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';

import type { FidscriptSDK } from '@fidscript/sdk';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface FunctionCodeProps {
  projectId: string;
  functionId: string;
  runtime: string;
  getSdk: () => FidscriptSDK;
  initialCode: string;
  deploying: boolean;
  deployMsg?: string | null;
  onDeploy: (code: string, version?: string) => void;
}

// Map runtime identifiers to Monaco language ids
const RUNTIME_LANG: Record<string, string> = {
  nodejs18: 'javascript',
  nodejs20: 'javascript',
  nodejs22: 'javascript',
  python311: 'python',
  python312: 'python',
  go: 'go',
  rust: 'rust',
};

const STARTER_CODE: Record<string, string> = {
  nodejs20: `// FIDScript Edge Function
export async function handler(event) {
  const { request, env } = event;

  console.log('Event:', JSON.stringify(event, null, 2));

  return Response.json({
    message: 'Hello from FIDScript Edge!',
    timestamp: new Date().toISOString(),
    functionId: env.FUNCTION_ID,
  });
}
`,
  python311: `# FIDScript Edge Function
def handler(event, env):
    print(f"Event: {event}")

    return {
        "statusCode": 200,
        "body": {
            "message": "Hello from FIDScript Edge!",
            "timestamp": datetime.utcnow().isoformat(),
        }
    }
`,
  go: `// FIDScript Edge Function
package main

func Handler(event []byte, env map[string]string) (map[string]interface{}, error) {
    return map[string]interface{}{
        "message":  "Hello from FIDScript Edge!",
        "timestamp": time.Now().UTC().Format(time.RFC3339),
    }, nil
}
`,
  rust: `// FIDScript Edge Function
#[tokio::main]
async fn handler(event: Value, _env: &Env) -> Result<Value, Error> {
    Ok(json!({
        "message": "Hello from FIDScript Edge!",
        "timestamp": Utc::now().to_rfc3339(),
    }))
}
`,
  default: '// Your function code here\n',
};

function getStarterCode(runtime: string): string {
  return STARTER_CODE[runtime] ?? STARTER_CODE['default'];
}

export function FunctionCode({
  projectId,
  functionId,
  runtime,
  getSdk,
  initialCode,
  deploying,
  deployMsg,
  onDeploy,
}: FunctionCodeProps) {
  const [code, setCode] = useState(initialCode);
  const [loadingCode, setLoadingCode] = useState(true);
  const [editorHeight, setEditorHeight] = useState(400);
  const [version, setVersion] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load deployed code from API on mount; fall back to draft then starter
  useEffect(() => {
    let cancelled = false;
    async function loadCode() {
      try {
        const draft = localStorage.getItem(`fn_draft_${functionId}`);
        if (draft) {
          if (!cancelled) setCode(draft);
          if (!cancelled) setLoadingCode(false);
          return;
        }
        const result = await getSdk().functions.getCode(projectId, functionId) as { code: string | null };
        if (!cancelled) {
          setCode(result?.code ?? getStarterCode(runtime));
        }
      } catch {
        if (!cancelled) setCode(getStarterCode(runtime));
      } finally {
        if (!cancelled) setLoadingCode(false);
      }
    }
    loadCode();
    return () => { cancelled = true; };
  }, [projectId, functionId, runtime, getSdk]);

  // ResizeObserver keeps Monaco height in sync with available space
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setEditorHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debounced auto-save draft
  const handleChange = useCallback((value: string | undefined) => {
    const v = value ?? '';
    setCode(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(`fn_draft_${functionId}`, v);
    }, 1000);
  }, [functionId]);

  function handleReset() {
    localStorage.removeItem(`fn_draft_${functionId}`);
    setCode(getStarterCode(runtime));
    setSaveMsg(null);
  }

  function handleSaveDraft() {
    localStorage.setItem(`fn_draft_${functionId}`, code);
    setSaveMsg('Draft saved');
    setTimeout(() => setSaveMsg(null), 2000);
  }

  function handleDeploy() {
    onDeploy(code, version.trim() || undefined);
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--rail)] bg-[var(--surface-2)]/30 flex-wrap flex-shrink-0">
        <input
          type="text"
          value={version}
          onChange={e => setVersion(e.target.value)}
          placeholder="Version tag (optional)"
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1 text-xs w-40"
        />
        <div className="flex-1" />
        {saveMsg && <span className="text-xs text-emerald-400">{saveMsg}</span>}
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
          <HugeiconsIcon icon={RefreshIcon} size={12} />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveDraft} className="text-xs">
          <HugeiconsIcon icon={SaveIcon} size={12} />
          Save draft
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleDeploy}
          disabled={deploying}
          className="text-xs"
        >
          {deploying ? <Spinner size="sm" /> : <HugeiconsIcon icon={Upload03Icon} size={12} />}
          Deploy
        </Button>
      </div>

      {/* Deploy message */}
      {deployMsg && (
        <div className={`px-4 py-2 text-xs flex-shrink-0 ${deployMsg.includes('error') || deployMsg.includes('failed')
          ? 'bg-rose-500/10 text-rose-400'
          : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {deployMsg}
        </div>
      )}

      {/* Monaco Editor — ResizeObserver keeps height in sync with available space */}
      <div ref={containerRef} className="flex-1 min-h-[600px]">
        {loadingCode ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : (
          <MonacoEditor
            height={`${editorHeight}px`}
            language={RUNTIME_LANG[runtime] ?? 'plaintext'}
            value={code}
            onChange={handleChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              padding: { top: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
}
