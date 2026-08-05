'use client';

import { useEffect } from 'react';
import { Modal } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import type { CreateProjectModalProps } from './create-project-types';
import { useCreateProjectForm } from './create-project-hooks';
import { CreateProjectForm } from './create-project-form';

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const { getSdk } = useAuth();

  const {
    nameRef,
    name, setName,
    slug, setSlug,
    slugLocked, handleSlugLockToggle,
    type, setType,
    description, setDescription,
    checking, duplicateError,
    submitting, submitError, canSubmit,
    handleSubmit, reset, focusName,
  } = useCreateProjectForm({ getSdk, onCreated, onClose });

  // Reset on close.
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Focus name field when opened.
  useEffect(() => {
    if (open) focusName();
  }, [open, focusName]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Create project" size="md">
      <CreateProjectForm
        name={name} onNameChange={setName}
        slug={slug} onSlugChange={setSlug}
        slugLocked={slugLocked} onSlugLockToggle={handleSlugLockToggle}
        type={type} onTypeChange={v => setType(v as typeof type)}
        description={description} onDescriptionChange={setDescription}
        checking={checking} duplicateError={duplicateError}
        submitting={submitting} canSubmit={canSubmit} submitError={submitError}
        onSubmit={handleSubmit} onCancel={onClose}
        nameRef={nameRef}
      />
    </Modal>
  );
}
