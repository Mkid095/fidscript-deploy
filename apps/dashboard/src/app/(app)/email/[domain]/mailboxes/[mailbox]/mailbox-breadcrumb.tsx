'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

interface Props {
  domain: string;
}

export function MailboxBreadcrumb({ domain }: Props) {
  return (
    <div className="flex items-center gap-2 mb-6 text-sm">
      <Link
        href="/email"
        className="text-[var(--text-muted)] hover:text-[var(--text-muted)] flex items-center gap-1 no-underline"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
        Email
      </Link>
      <span className="text-[var(--text-dim)]">/</span>
      <h1 className="text-base font-semibold text-[var(--text)]">Mailbox</h1>
    </div>
  );
}
