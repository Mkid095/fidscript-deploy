'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getStarterCode } from './function-code-constants';

export function useFunctionCodeState({
  projectId,
  functionId,
  runtime,
  getSdk,
}: {
  projectId: string;
  functionId: string;
  runtime: string;
  getSdk: () => unknown;
}) {
  const [code, setCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(true);
  const [editorHeight, setEditorHeight] = useState(400);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load deployed code from API on mount; fall back to draft then starter
  useEffect(() => {
    let cancelled = false;
    async function loadCode() {
      try {
        const draft = localStorage.getItem(`fn_draft_${functionId}`);
        if (draft) {
          if (!cancelled) { setCode(draft); setLoadingCode(false); }
          return;
        }
        const sdk = getSdk() as { functions: { getCode: (p: string, f: string) => Promise<{ code: string | null }> } };
        const result = await sdk.functions.getCode(projectId, functionId);
        if (!cancelled) setCode(result?.code ?? getStarterCode(runtime));
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
  }

  return {
    code,
    setCode,
    loadingCode,
    editorHeight,
    containerRef,
    handleChange,
    handleReset,
  };
}
