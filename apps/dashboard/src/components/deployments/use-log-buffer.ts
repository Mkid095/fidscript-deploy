'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogLine } from './log-types';

/**
 * Holds a buffered list of log lines and a periodic flush that reconciles
 * pending (ref-stored) lines into visible state at a steady interval.
 */
export function useLogBuffer(parseInput: () => LogLine[], intervalMs = 500) {
  const [lines, setLines] = useState<LogLine[]>(() => parseInput());
  const pendingRef = useRef<LogLine[]>([]);

  // Re-parse when caller-provided raw logs change
  useEffect(() => {
    const newLines = parseInput();
    setLines(prev => {
      if (newLines.length <= prev.length) return newLines;
      const existingIds = new Set(prev.map(l => l.id));
      const trulyNew = newLines.filter(l => !existingIds.has(l.id));
      if (trulyNew.length > 0) {
        pendingRef.current = [...pendingRef.current, ...trulyNew];
      }
      return newLines;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseInput]);

  // Flush pending lines periodically (batches reactive updates)
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingRef.current.length === 0) return;
      setLines(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const trulyNew = pendingRef.current.filter(l => !existingIds.has(l.id));
        if (trulyNew.length === 0) return prev;
        return [...prev, ...trulyNew];
      });
      pendingRef.current = [];
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return { lines, pendingRef };
}