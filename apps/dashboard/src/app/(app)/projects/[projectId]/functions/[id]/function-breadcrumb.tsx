'use client';

import Link from 'next/link';
import type { Function_ } from '@/types';

interface Props {
  projectId: string;
  fn: Function_;
}

export function FunctionBreadcrumb({ projectId, fn }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] flex-shrink-0">
      <Link href={`/projects/${projectId}/functions`} className="hover:text-[var(--text)] transition-colors">
        Functions
      </Link>
      <span>/</span>
      <span className="text-[var(--text)]">{fn.name}</span>
    </div>
  );
}
