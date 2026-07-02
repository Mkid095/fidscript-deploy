'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizableOptions {
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  storageKey?: string;
  direction?: 'horizontal' | 'vertical';
}

export function useResizable({
  initialRatio = 0.5,
  minRatio = 0.25,
  maxRatio = 0.8,
  storageKey,
  direction = 'vertical',
}: UseResizableOptions = {}) {
  const [ratio, setRatio] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= minRatio && parsed <= maxRatio) return parsed;
      }
    }
    return initialRatio;
  });

  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = direction === 'vertical' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio: number;
      if (direction === 'vertical') {
        newRatio = (e.clientY - rect.top) / rect.height;
      } else {
        newRatio = (e.clientX - rect.left) / rect.width;
      }
      newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
      setRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minRatio, maxRatio, direction]);

  // Persist to localStorage
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(ratio));
    }
  }, [ratio, storageKey]);

  return { ratio, containerRef, handleMouseDown, dragging };
}
