import type { Project } from '@/types';

export interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export type ProjectType = 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';

export const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: 'frontend', label: 'Frontend', description: 'Web app — static or SSR' },
  { value: 'backend', label: 'Backend', description: 'API + optional database' },
  { value: 'worker', label: 'Worker', description: 'Long-running background process' },
  { value: 'cron', label: 'Cron', description: 'Scheduled jobs' },
  { value: 'docker', label: 'Docker', description: 'Arbitrary container image' },
  { value: 'static', label: 'Static', description: 'Static file hosting' },
];
