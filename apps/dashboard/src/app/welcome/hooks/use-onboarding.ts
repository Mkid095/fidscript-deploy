'use client';

/**
 * The first-time journey.
 *
 * It is **offered**, not forced: a person who already has projects, or who
 * has already finished it, never sees it again. The state lives on the
 * account (`onboardedAt`), and the step lives in localStorage so a reload
 * does not lose their place.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';

export type OnboardingStep = 'welcome' | 'account' | 'project' | 'guidance' | 'done';

const STEP_KEY = 'fidscript_onboarding_step';
const DRAFT_KEY = 'fidscript_onboarding_draft';

export interface OnboardingDraft {
  name: string;
  projectName: string;
  projectType: 'backend' | 'frontend';
  /** The project the journey ended on — created, or the one they already had. */
  projectSlug?: string;
}

const EMPTY_DRAFT: OnboardingDraft = {
  name: '',
  projectName: '',
  projectType: 'backend',
};

export interface Onboarding {
  step: OnboardingStep;
  draft: OnboardingDraft;
  /** The projects the account already had — the journey never hides them. */
  existingProjects: Project[];
  loading: boolean;
  saving: boolean;
  error?: string;
  setStep: (step: OnboardingStep) => void;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  saveName: () => Promise<void>;
  createProject: () => Promise<Project | null>;
  finish: () => Promise<void>;
  skip: () => void;
}

export function useOnboarding(): Onboarding {
  const { getSdk, user } = useAuth();
  const [step, setStepState] = useState<OnboardingStep>('welcome');
  const [draft, setDraftState] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Restore where the person was.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStep = sessionStorage.getItem(STEP_KEY) as OnboardingStep | null;
    if (savedStep) setStepState(savedStep);
    const savedDraft = sessionStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        setDraftState({ ...EMPTY_DRAFT, ...(JSON.parse(savedDraft) as OnboardingDraft) });
      } catch {
        // A corrupt draft is not worth a broken journey.
      }
    }
  }, []);

  // The projects they already have — the journey never asks for a second one
  // when the account is already set up.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sdk = getSdk();
        const res = await sdk.projects.list();
        if (cancelled) return;
        const list = (res as { projects?: Project[] }).projects ?? [];
        setExistingProjects(list);
        setDraftState(d => (d.projectName ? d : { ...d, projectName: list[0]?.name ?? '' }));
      } catch {
        setExistingProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [getSdk]);

  const setStep = useCallback((next: OnboardingStep) => {
    setStepState(next);
    if (typeof window !== 'undefined') sessionStorage.setItem(STEP_KEY, next);
  }, []);

  const setDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraftState(d => {
      const next = { ...d, ...patch };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const saveName = useCallback(async () => {
    setSaving(true);
    setError(undefined);
    try {
      const sdk = getSdk();
      await sdk.auth.updateProfile({ name: draft.name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your name');
    } finally {
      setSaving(false);
    }
  }, [draft.name, getSdk]);

  const createProject = useCallback(async () => {
    setSaving(true);
    setError(undefined);
    try {
      const sdk = getSdk();
      const project = await sdk.projects.create({
        name: draft.projectName.trim(),
        type: draft.projectType,
      });
      setDraft({ projectSlug: project.slug });
      return project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project');
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft.projectName, draft.projectType, getSdk, setDraft]);

  const finish = useCallback(async () => {
    setSaving(true);
    try {
      const sdk = getSdk();
      await sdk.auth.completeOnboarding();
    } catch {
      // The flag is a convenience, not a gate: failing to write it must not
      // stop the person reaching their project.
    } finally {
      setSaving(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STEP_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [getSdk]);

  const skip = useCallback(() => {
    void finish();
  }, [finish]);

  return {
    step,
    draft,
    existingProjects,
    loading,
    saving,
    error,
    setStep,
    setDraft,
    saveName,
    createProject,
    finish,
    skip,
  };
}
