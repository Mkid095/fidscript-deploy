'use client';

import Link from 'next/link';
import type { Database } from '@fidscript-deploy/sdk';

interface Props {
  db: Database;
  href?: string;
}

export function DbDetailHeader({ db, href = '/databases' }: Props) {
  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
        <Link href={href} className="hover:text-[var(--text-muted)]">Databases</Link>
        <span>&rsaquo;</span>
        <span className="text-[var(--text)]">{db.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">{db.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">Type: {db.type} &middot; Status: {db.status}</p>
        </div>
      </div>
    </>
  );
}
