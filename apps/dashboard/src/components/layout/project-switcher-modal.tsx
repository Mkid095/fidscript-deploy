'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Modal } from '@fidscript/ui';

import type { Project } from '@/types';

function formatActivity(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function RoleBadge({ role }: { role?: string }) {
  const colors: Record<string, string> = {
    owner:   'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30',
    admin:   'bg-blue-900/60 text-[var(--accent)] border-blue-800',
    developer: 'bg-green-900/60 text-green-400 border-green-800',
    viewer:  'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]',
  };
  const cls = colors[role ?? 'viewer'] ?? colors.viewer;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${cls}`}>
      {role ?? 'viewer'}
    </span>
  );
}

interface ProjectSwitcherProps {
  projects: Project[];
  currentProjectId?: string;
  onClose: () => void;
}

export function ProjectSwitcherModal({ projects, currentProjectId, onClose }: ProjectSwitcherProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = query.trim()
    ? projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) ||
                           p.slug.toLowerCase().includes(query.toLowerCase()))
    : projects;

  return (
    <Modal isOpen={true} title="Switch project" onClose={onClose}>
      <div className="space-y-3">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search projects…"
          autoFocus
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/50 focus:border-[var(--danger)] transition-colors"
        />

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No projects found.</p>
          )}
          {filtered.map(p => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors
                ${p.id === currentProjectId
                  ? 'bg-[var(--rail)] border border-[var(--rail-light)]'
                  : 'hover:bg-[var(--rail)] border border-transparent'
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text)] truncate">{p.name}</span>
                  <RoleBadge role={p.role} />
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-[var(--text-dim)] font-mono">{p.slug}</span>
                  <span className="text-xs text-[var(--text-dim)]">·</span>
                  <span className="text-xs text-[var(--text-dim)]">{formatActivity(p.lastActivityAt)}</span>
                </div>
              </div>
              {p.id === currentProjectId && (
                <span className="text-xs text-[var(--text-muted)]">Current</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Modal>
  );
}
