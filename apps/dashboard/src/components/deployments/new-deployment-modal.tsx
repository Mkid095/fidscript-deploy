'use client';

/**
 * NewDeploymentModal — DEPRECATED thin redirect wrapper.
 *
 * The deployment creation flow now lives on a dedicated page at
 * /projects/[projectId]/services/new with a full stepper wizard.
 *
 * This component is kept so existing call sites (e.g. the Services page
 * "New service" button) don't break. On mount it immediately navigates to
 * the new page. New code should link directly to the /services/new route.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import type { Project } from '@/types';

interface GithubStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

interface Props {
  project: Project;
  githubStatus?: GithubStatus | null;
  onClose: () => void;
  onCreated?: () => void;
}

export function NewDeploymentModal({ project, onClose }: Props) {
  const router = useRouter();

  useEffect(() => {
    onClose();
    router.push(`/projects/${project.id}/services/new`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
