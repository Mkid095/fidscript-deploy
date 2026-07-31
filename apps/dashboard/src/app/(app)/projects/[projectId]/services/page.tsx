'use client';

import { ToastProvider } from '@/components/toast-provider';
import { useProjectContext } from '@/contexts/project-context';
import { Spinner } from '@fidscript/ui';
import { ServicesSectionInner } from './services-section-inner';

export default function ServicesPage() {
  const { project } = useProjectContext();
  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    );
  }
  return (
    <ToastProvider>
      <ServicesSectionInner project={project} />
    </ToastProvider>
  );
}
