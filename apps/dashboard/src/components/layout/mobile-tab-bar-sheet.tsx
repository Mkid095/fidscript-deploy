'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Close } from '@hugeicons/core-free-icons';

import type { NavItem } from '@/app/(app)/projects/[projectId]/nav-groups';

interface Props {
  items: NavItem[];
  projectId: string;
  role: string;
  onClose: () => void;
}

export function MobileTabBarSheet({ items, projectId, role, onClose }: Props) {
  return (
    <div role="dialog" aria-modal="true" aria-label="All sections"
      className="absolute bottom-0 inset-x-0 bg-[var(--surface)] border-t border-[var(--rail)] rounded-t-2xl shadow-2xl shadow-black/50"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full bg-[var(--rail-light)]" />
      </div>

      {/* Header */}
      <div className="px-5 pb-4 flex items-center justify-between border-b border-[var(--rail)]">
        <h3 className="text-base font-semibold text-[var(--text)]">All Sections</h3>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
          aria-label="Close"
        >
          <HugeiconsIcon icon={Close} size={18} />
        </button>
      </div>

      {/* Sections grid */}
      <div className="px-5 py-4 grid grid-cols-3 gap-3">
        {items.map(item => {
          const locked = item.adminOnly && !['owner', 'admin'].includes(role);

          return (
            <Link
              key={item.id}
              href={locked ? '#' : `/projects/${projectId}${item.href}`}
              onClick={e => {
                if (locked) e.preventDefault();
                else onClose();
              }}
              className={`
                flex flex-col items-center justify-center p-3 rounded-xl transition-all
                ${locked ? 'text-[var(--text-dim)] opacity-50 cursor-not-allowed' : 'text-[var(--text-muted)] hover:bg-[var(--hover)]'}
              `}
            >
              <HugeiconsIcon icon={item.icon} size={24} className="text-[var(--text-dim)]" />
              <span className="text-xs font-medium mt-2 text-center">{item.label}</span>
              {item.adminOnly && (
                <span className="text-[9px] text-[var(--text-dim)] mt-0.5">Admin</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
