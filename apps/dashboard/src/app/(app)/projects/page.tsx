'use client';

import { useAuth } from '@/contexts/auth-context';
import { canEdit, slugify } from './projects-utils';
import { LoadErrorBanner } from './load-error-banner';
import { ProjectsListHeader } from './projects-list-header';
import { ProjectsListBody } from './projects-list-body';
import { ProjectsPanels } from './projects-panels';
import { useProjectsPage } from './use-projects-page';
import { AIControlCenter } from './ai-control-center';

export default function ProjectsPage() {
  const { user, getSdk } = useAuth();
  const p = useProjectsPage(getSdk);
  const slug = slugify(p.name);

  return (
    <div className="max-w-6xl mx-auto">
      {p.loadError && <LoadErrorBanner message={p.loadError} countdown={p.rateLimitCountdown} onRetry={p.load} />}

      <ProjectsListHeader
        userName={user?.name} search={p.search} loading={p.loading} deletedCount={p.deletedProjects.length}
        showDeleted={p.showDeleted}
        filteredCount={p.search ? p.projects.filter(pr => pr.name.toLowerCase().includes(p.search.toLowerCase())).length : p.projects.length}
        totalCount={p.projects.length} canCreate={canEdit(user?.role)}
        onSearchChange={p.handleSearchChange} onRefresh={p.load}
        onToggleDeleted={() => p.setShowDeleted(v => !v)}
        onCreate={p.handleCreateOpen}
      />

      <AIControlCenter />

      <ProjectsListBody
        userRole={user?.role} projects={p.projects} deletedProjects={p.deletedProjects}
        loading={p.loading} showDeleted={p.showDeleted} search={p.search}
        onEdit={p.handleEditOpen} onDelete={p.handleDeleteOpen}
        onRestore={p.handleRestore}
        onPurge={p.handlePurgeOpen}
        onClearSearch={p.handleClearSearch}
        onCreate={p.handleCreateOpen}
      />

      <ProjectsPanels
        activePanel={p.activePanel} editing={p.editing} deleting={p.deleting} purgeProject={p.purgeProject}
        name={p.name} description={p.description} creating={p.creating} createError={p.createError}
        editName={p.editName} editType={p.editType} editDescription={p.editDescription}
        savingEdit={p.savingEdit} editError={p.editError}
        deleteAck={p.deleteAck} deletingNow={p.deletingNow} deleteError={p.deleteError}
        purgeCode={p.purgeCode} purgeRequested={p.purgeRequested} purgeVerifying={p.purgeVerifying} purgeError={p.purgeError}
        slug={slug}
        onClose={() => p.setActivePanel(null)}
        onCreate={p.handleCreate} onSaveEdit={p.handleSaveEdit} onConfirmDelete={p.handleConfirmDelete}
        onRequestPurge={p.handleRequestPurge} onConfirmPurge={p.handleConfirmPurge}
        onNameChange={p.setName} onDescriptionChange={p.setDescription}
        onEditNameChange={p.setEditName} onEditTypeChange={p.setEditType} onEditDescriptionChange={p.setEditDescription}
        onDeleteAckChange={p.setDeleteAck} onPurgeCodeChange={p.setPurgeCode}
      />
    </div>
  );
}
