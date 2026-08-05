import { useCallback, useEffect, useRef, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Project } from '@/types';
import { slugify } from './create-project-utils';
import type { ProjectType } from './create-project-types';

interface UseCreateProjectFormOptions {
  getSdk: () => FidscriptSDK;
  onCreated: (project: Project) => void;
  onClose: () => void;
}

export function useCreateProjectForm({ getSdk, onCreated, onClose }: UseCreateProjectFormOptions) {
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(false);
  const [type, setType] = useState<ProjectType>('frontend');
  const [description, setDescription] = useState('');
  const [checking, setChecking] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-generate slug from name when not locked.
  useEffect(() => {
    setSlug(slugify(name));
  }, [name]);

  // Reset on close.
  const reset = useCallback(() => {
    setName('');
    setSlug('');
    setSlugLocked(false);
    setType('frontend');
    setDescription('');
    setChecking(false);
    setDuplicateError(null);
    setSubmitting(false);
    setSubmitError(null);
  }, []);

  // Focus name field when opened.
  const focusName = useCallback(() => {
    setTimeout(() => nameRef.current?.focus(), 50);
  }, []);

  // Debounced duplicate check.
  useEffect(() => {
    if (!name.trim() || name.length < 3) { setDuplicateError(null); return; }
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const sdk = getSdk();
        const { projects } = await sdk.projects.list();
        const exists = projects.some(p => p.name.toLowerCase() === name.trim().toLowerCase());
        setDuplicateError(exists ? `A project named "${name.trim()}" already exists.` : null);
      } catch { /* ignore */ } finally { setChecking(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [name, getSdk]);

  const canSubmit = !!name.trim() && name.length >= 3 && !checking && !duplicateError && !submitting;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sdk = getSdk();
      const project = await sdk.projects.create({
        name: name.trim(),
        type,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      });
      onCreated(project);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create project');
      setSubmitting(false);
    }
  }, [canSubmit, getSdk, name, type, slug, description, onCreated, onClose]);

  const handleSlugLockToggle = useCallback(() => {
    if (slugLocked) {
      setSlugLocked(false);
      setSlug(slugify(name));
    } else {
      setSlugLocked(true);
    }
  }, [slugLocked, name]);

  return {
    nameRef,
    name, setName,
    slug, setSlug,
    slugLocked, handleSlugLockToggle,
    type, setType,
    description, setDescription,
    checking, duplicateError,
    submitting, submitError,
    canSubmit,
    handleSubmit,
    reset,
    focusName,
  };
}
