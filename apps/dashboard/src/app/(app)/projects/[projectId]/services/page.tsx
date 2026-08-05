'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Spinner } from '@fidscript/ui';
import { ServicesRegistry } from './services-registry';

export default function ServicesPage() {
  const { project, projectId } = useProjectContext();
  if (!project || !projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    );
  }
  return <ServicesRegistry projectId={projectId} />;
}
