'use client';

import { useState } from 'react';
import { Spinner } from '@fidscript/ui';

import { FunctionCodeToolbar } from './function-code-toolbar';
import { FunctionCodeEditor } from './function-code-editor';
import { FunctionCodeHeader } from './function-code-header';
import { FunctionCodeMetrics } from './function-code-metrics';
import { RUNTIME_LANG } from './function-code-constants';
import { useFunctionCodeState } from './function-code-state';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

interface FunctionCodeProps {
  projectId: string;
  functionId: string;
  runtime: string;
  status: string;
  currentVersion?: string | null;
  memoryMb?: number | null;
  getSdk: () => FidscriptSDK;
  initialCode: string;
  deploying: boolean;
  deployMsg?: string | null;
  onDeploy: (code: string, version?: string) => void;
  onInvoke: () => void;
}

export function FunctionCode({
  projectId,
  functionId,
  runtime,
  status,
  currentVersion,
  memoryMb,
  getSdk,
  deploying,
  deployMsg,
  onDeploy,
  onInvoke,
}: FunctionCodeProps) {
  const [version, setVersion] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const {
    code,
    setCode,
    loadingCode,
    editorHeight,
    containerRef,
    handleChange,
    handleReset,
  } = useFunctionCodeState({ projectId, functionId, runtime, getSdk });

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
      <FunctionCodeHeader
        functionName=""
        runtime={runtime}
        status={status}
        currentVersion={currentVersion}
        memoryMb={memoryMb}
        deploying={deploying}
        onInvoke={onInvoke}
        onDeploy={handleDeploy}
      />

      <FunctionCodeToolbar
        version={version}
        onVersionChange={setVersion}
        saving={!!saveMsg}
        deploying={deploying}
        saveMsg={saveMsg}
        onReset={handleReset}
        onSaveDraft={handleSaveDraft}
        onDeploy={handleDeploy}
      />

      {deployMsg && (
        <div className={`px-4 py-2 text-xs flex-shrink-0 ${deployMsg.includes('error') || deployMsg.includes('failed')
          ? 'bg-rose-500/10 text-rose-400'
          : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {deployMsg}
        </div>
      )}

      <FunctionCodeMetrics />

      <div ref={containerRef} className="flex-1 min-h-[600px]">
        {loadingCode ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : (
          <FunctionCodeEditor
            code={code}
            language={(RUNTIME_LANG[runtime] ?? 'plaintext') as 'javascript' | 'python' | 'go' | 'rust' | 'plaintext'}
            height={editorHeight}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  );
}
