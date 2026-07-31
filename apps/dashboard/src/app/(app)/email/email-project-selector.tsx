'use client';

import { useState } from 'react';
import type { Project } from '@/types';

interface Props {
  projects: Project[];
  pickedProjectId: string;
  onPick: (id: string) => void;
}

export function EmailProjectSelector({ projects, pickedProjectId, onPick }: Props) {
  return (
    <div className="mb-6">
      <label className="block text-xs text-[var(--text-muted)] mb-1">Project</label>
      <select
        value={pickedProjectId}
        onChange={e => onPick(e.target.value)}
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm min-w-52"
      >
        <option value="">Select a project</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
