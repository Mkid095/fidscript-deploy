'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

export interface DbBreadcrumbProps {
  href?: string;
}

export function DbBreadcrumb({ href = '/databases' }: DbBreadcrumbProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
      <span>Back to databases</span>
    </Link>
  );
}