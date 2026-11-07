'use client';

import type { Workspace } from './new-deployment-types';

interface WorkspaceOptionProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}

/**
 * Where the project lives.
 *
 * Your own workspace, or a team you belong to — everybody in the team works
 * in it.
 */
export function WorkspacePicker({
  workspaces,
  workspaceId,
  onWorkspaceChange,
}: {
  workspaces: Workspace[];
  workspaceId: string;
  onWorkspaceChange: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Where should this project live?</h2>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Your own workspace, or a team you belong to — everybody in the team works in it.
      </p>
      <div className="space-y-2">
        <WorkspaceOption
          selected={workspaceId === ''}
          onSelect={() => onWorkspaceChange('')}
          title="My workspace"
          hint="Only you can see it"
        />
        {workspaces.map(workspace => (
          <WorkspaceOption
            key={workspace.id}
            selected={workspaceId === workspace.id}
            onSelect={() => onWorkspaceChange(workspace.id)}
            title={workspace.name}
            hint={`The ${workspace.name} team`}
          />
        ))}
      </div>
    </div>
  );
}

function WorkspaceOption({ selected, onSelect, title, hint }: WorkspaceOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left transition-all ${
        selected
          ? 'border-[var(--accent)]/60 bg-[var(--accent)]/5'
          : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--rail-light)]'
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 ${
          selected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--rail-light)]'
        }`}
      />
      <span>
        <span className={`block text-sm ${selected ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
          {title}
        </span>
        <span className="block text-xs text-[var(--text-dim)] mt-0.5">{hint}</span>
      </span>
    </button>
  );
}
