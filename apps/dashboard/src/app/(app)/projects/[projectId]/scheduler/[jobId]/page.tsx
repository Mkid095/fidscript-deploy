'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button, Spinner } from '@fidscript/ui';
import { AlarmClockIcon, CheckmarkCircle02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import { useJobDetail } from './use-job-detail';
import { RunDetailModal } from './run-detail-modal';
import { JobEditModal } from './job-edit-modal';
import { JobRunsList } from './job-runs-list';
import { StatCard } from './stat-card';
import { JobDetailHeader } from './job-detail-header';

export default function ProjectSchedulerJobDetailPage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const jobId = params.jobId as string;

  const {
    job, loading, error,
    triggering, showEdit, setShowEdit,
    saving, saveError,
    selectedRun, setSelectedRun,
    runsPage, setRunsPage, hasMoreRuns, recentRuns, successRate, runs,
    form, setForm,
    handleTrigger, handleSave, populateForm,
  } = useJobDetail({ projectId, jobId, getSdk });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <p className="text-[var(--danger)] text-sm">{error ?? 'Job not found'}</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <JobDetailHeader
        job={job}
        projectId={projectId}
        triggering={triggering}
        onBack={() => router.push(`/projects/${projectId}/scheduler`)}
        onEdit={() => { populateForm(job!); setShowEdit(true); }}
        onTrigger={handleTrigger}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Next run" value={job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : '—'} icon={AlarmClockIcon} />
        <StatCard label="Last run" value={job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'} icon={AlarmClockIcon} />
        <StatCard
          label="Success rate"
          value={successRate !== null ? `${successRate}%` : '—'}
          valueColor={successRate !== null ? (successRate >= 80 ? 'text-[var(--success)]' : successRate >= 50 ? 'text-[var(--warning)]' : 'text-[var(--danger)]') : undefined}
          icon={CheckmarkCircle02Icon}
        />
        <StatCard label="Timeout" value={`${job.timeoutSeconds}s`} icon={AlertCircleIcon} />
      </div>

      {/* Execution history */}
      <JobRunsList
        runs={runs}
        recentRuns={recentRuns}
        hasMoreRuns={hasMoreRuns}
        onLoadMore={() => setRunsPage(p => p + 1)}
        onSelectRun={setSelectedRun}
      />

      {/* Edit Modal */}
      <JobEditModal
        job={job}
        saving={saving}
        saveError={saveError}
        onSave={handleSave}
        onClose={() => setShowEdit(false)}
        form={form}
        setForm={setForm}
      />

      {/* Run detail modal */}
      {selectedRun && (
        <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}