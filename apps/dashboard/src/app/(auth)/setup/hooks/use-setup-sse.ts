'use client';

import { useEffect, useRef, useState } from 'react';

interface ProgressEvent {
  type?: string;
  status?: string;
  failureReason?: string;
  currentStep?: string;
  steps?: Array<{ step: string; success: boolean; error?: string }>;
}

export function useSetupSSE(operationId: string | null) {
  const [progressSteps, setProgressSteps] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!operationId) return;

    eventSourceRef.current?.close();
    setProgressSteps({ dns: 'pending', proxy: 'pending', certificate: 'pending', email: 'pending', health: 'pending' });
    setCurrentStep('');
    setError('');

    const es = new EventSource(`/api/v1/installation/operations/${operationId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as ProgressEvent;
        if (data.type !== 'status') return;

        if (data.status === 'RUNNING') {
          setCurrentStep(data.currentStep ?? '');
          const completed = (data.steps ?? []).filter(s => s.success);
          const failed = (data.steps ?? []).filter(s => !s.success);
          setProgressSteps(prev => {
            const next = { ...prev };
            for (const s of completed) next[s.step] = 'done';
            for (const s of failed) next[s.step] = 'error';
            return next;
          });
        }

        if (data.status === 'COMPLETED') {
          setProgressSteps({ dns: 'done', proxy: 'done', certificate: 'done', email: 'done', health: 'done' });
          setCurrentStep('');
          es.close();
        }

        if (data.status === 'FAILED') {
          setError(data.failureReason ?? 'An unknown error occurred');
          es.close();
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      setError('Lost connection to the server. Please refresh and try again.');
      es.close();
    };

    return () => { eventSourceRef.current?.close(); };
  }, [operationId]);

  return { progressSteps, currentStep, error };
}
