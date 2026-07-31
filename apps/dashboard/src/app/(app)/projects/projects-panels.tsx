// All right panels for the projects page

import type { Project } from '@/types';
import { RightPanel } from '@fidscript/ui';
import { DeletePanel, PurgePanel } from './delete-panel';
import { ProjectForm } from './project-form';

interface ProjectsPanelsProps {
  activePanel: 'create' | 'edit' | 'delete' | 'purge' | null;
  editing: Project | null;
  deleting: Project | null;
  purgeProject: Project | null;
  name: string; description: string; creating: boolean; createError: string | null;
  editName: string; editType: 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static'; editDescription: string; savingEdit: boolean; editError: string | null;
  deleteAck: boolean; deletingNow: boolean; deleteError: string | null;
  purgeCode: string; purgeRequested: boolean; purgeVerifying: boolean; purgeError: string | null;
  slug: string;
  onClose: () => void;
  onCreate: () => void;
  onSaveEdit: () => void;
  onConfirmDelete: () => void;
  onRequestPurge: () => void;
  onConfirmPurge: () => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onEditNameChange: (v: string) => void;
  onEditTypeChange: (v: 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static') => void;
  onEditDescriptionChange: (v: string) => void;
  onDeleteAckChange: (v: boolean) => void;
  onPurgeCodeChange: (v: string) => void;
}

export function ProjectsPanels({
  activePanel, editing, deleting, purgeProject,
  name, description, creating, createError,
  editName, editType, editDescription, savingEdit, editError,
  deleteAck, deletingNow, deleteError,
  purgeCode, purgeRequested, purgeVerifying, purgeError,
  slug,
  onClose, onCreate, onSaveEdit, onConfirmDelete, onRequestPurge, onConfirmPurge,
  onNameChange, onDescriptionChange,
  onEditNameChange, onEditTypeChange, onEditDescriptionChange,
  onDeleteAckChange, onPurgeCodeChange,
}: ProjectsPanelsProps) {
  return (
    <>
      <RightPanel isOpen={activePanel === 'create'} onClose={onClose} title="New project"
        subtitle="Pick a name. Configure everything else from the dashboard."
        footer={{ onCancel: onClose, onSubmit: onCreate, submitLabel: 'Create project', loading: creating, submitDisabled: !name.trim() }}>
        <ProjectForm name={name} onNameChange={onNameChange} description={description} onDescriptionChange={onDescriptionChange}
          slug={slug} error={createError} />
      </RightPanel>

      <RightPanel isOpen={activePanel === 'edit' && !!editing} onClose={onClose}
        title={editing ? `Edit "${editing.name}"` : 'Edit project'} subtitle="Changes save immediately."
        footer={{ onCancel: onClose, onSubmit: onSaveEdit, submitLabel: 'Save changes', loading: savingEdit, submitDisabled: !editName.trim() }}>
        {editing && (
          <ProjectForm name={editName} onNameChange={onEditNameChange} type={editType} onTypeChange={onEditTypeChange}
            description={editDescription} onDescriptionChange={onEditDescriptionChange} slug="" error={editError}
            descriptionPlaceholder={editing.description ?? 'What does this project do?'} nameLabel="Project name" showType slugLabel={editing.slug} />
        )}
      </RightPanel>

      <DeletePanel deleting={activePanel === 'delete' && !!deleting ? deleting : null}
        deleteAck={deleteAck} deletingNow={deletingNow} deleteError={deleteError}
        onAckChange={onDeleteAckChange} onConfirm={onConfirmDelete} onCancel={onClose} />

      <PurgePanel purgeProject={activePanel === 'purge' && !!purgeProject ? purgeProject : null}
        purgeCode={purgeCode} purgeRequested={purgeRequested} purgeVerifying={purgeVerifying} purgeError={purgeError}
        onCodeChange={onPurgeCodeChange} onRequest={onRequestPurge} onConfirm={onConfirmPurge} onCancel={onClose} />
    </>
  );
}
