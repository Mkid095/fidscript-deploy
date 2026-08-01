// Projects list body — active grid + trash section

import { useRouter } from 'next/navigation';
import { Card, EmptyState, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Add01Icon } from '@hugeicons/core-free-icons';

import type { Project } from '@/types';
import { canEdit, canDelete, normalize } from './projects-utils';
import { ProjectCard } from './project-card';
import { DeletedProjectCard } from './deleted-project-card';
import { SkeletonGrid } from './projects-skeleton';

interface ProjectsListBodyProps {
  userRole?: string;
  projects: Project[];
  deletedProjects: Project[];
  loading: boolean;
  showDeleted: boolean;
  search: string;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onRestore: (p: Project) => void;
  onPurge: (p: Project) => void;
  onClearSearch: () => void;
  onCreate: () => void;
}

export function ProjectsListBody({
  userRole, projects, deletedProjects, loading, showDeleted, search,
  onEdit, onDelete, onRestore, onPurge, onClearSearch, onCreate,
}: ProjectsListBodyProps) {
  const router = useRouter();
  const q = normalize(search);
  const filtered = q
    ? projects.filter(p => normalize(p.name).includes(q) || normalize(p.slug).includes(q) || normalize(p.description ?? '').includes(q))
    : projects;

  if (loading) return <SkeletonGrid />;

  if (projects.length === 0) {
    return (
      <Card className="border border-[var(--rail)] bg-[var(--surface-2)]">
        <EmptyState icon={<HugeiconsIcon icon={Search01Icon} size={48} className="text-[var(--text-dim)]" />}
          title={canEdit(userRole) ? 'No projects yet' : 'No projects'}
          description={canEdit(userRole) ? 'Create your first project to start deploying apps, databases, and more.' : 'No projects have been created yet.'}
          action={canEdit(userRole) ? (
            <Button variant="primary" onClick={onCreate}>
              <HugeiconsIcon icon={Add01Icon} size={14} />
              New project
            </Button>
          ) : undefined} />
      </Card>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card className="border border-[var(--rail)] bg-[var(--surface-2)]">
        <EmptyState icon={<HugeiconsIcon icon={Search01Icon} size={48} className="text-[var(--text-dim)]" />}
          title="No matches" description={`No projects match "${search}".`}
          action={<Button variant="ghost" size="sm" onClick={onClearSearch}>Clear search</Button>} />
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-live="polite" aria-label="Projects list">
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} onOpen={() => router.push(`/projects/${p.slug}`)}
            onEdit={canEdit(userRole, p.role) ? () => onEdit(p) : undefined}
            onDelete={canDelete(userRole, p.role) ? () => onDelete(p) : undefined} />
        ))}
      </div>

      {showDeleted && deletedProjects.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-muted)]">Deleted projects</h2>
            <span className="text-xs text-[var(--text-muted)]">{deletedProjects.length} item{deletedProjects.length !== 1 ? 's' : ''} · purged after 30 days</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deletedProjects.map(p => (
              <DeletedProjectCard key={p.id} project={p}
                onRestore={canDelete(userRole, p.role) ? () => onRestore(p) : undefined}
                onPurge={canDelete(userRole, p.role) ? () => onPurge(p) : undefined} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
