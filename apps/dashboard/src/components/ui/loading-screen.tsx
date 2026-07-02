'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Loading04Icon } from '@hugeicons/core-free-icons';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ message = 'Loading...', submessage, fullScreen = true }: LoadingScreenProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated spinner with glow */}
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-[var(--accent)]/20 rounded-full scale-150 animate-pulse" />
        <div className="relative w-16 h-16 rounded-full border-2 border-[var(--rail)] flex items-center justify-center">
          <HugeiconsIcon icon={Loading04Icon} size={28} className="text-[var(--accent)] animate-spin" />
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--text)]">{message}</p>
        {submessage && (
          <p className="text-xs text-[var(--text-dim)] mt-1">{submessage}</p>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--canvas)]/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
}

interface LoadingCardProps {
  rows?: number;
}

export function LoadingCard({ rows = 3 }: LoadingCardProps) {
  return (
    <div className="border border-[var(--rail)] rounded-xl p-4 sm:p-5 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--rail)]" />
        <div className="space-y-2">
          <div className="w-32 h-4 rounded bg-[var(--rail)]" />
          <div className="w-20 h-3 rounded bg-[var(--rail)]" />
        </div>
      </div>

      {/* Content skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[var(--rail)]" />
          <div className="flex-1 h-3 rounded bg-[var(--rail)]" style={{ width: `${60 + Math.random() * 30}%` }} />
        </div>
      ))}
    </div>
  );
}

interface LoadingTableProps {
  columns: number;
  rows?: number;
}

export function LoadingTable({ columns, rows = 5 }: LoadingTableProps) {
  return (
    <div className="border border-[var(--rail)] rounded-xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--rail)]">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-3 rounded bg-[var(--rail)]" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--rail)] last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="flex-1 h-3 rounded bg-[var(--rail)]" style={{ width: `${40 + Math.random() * 50}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
