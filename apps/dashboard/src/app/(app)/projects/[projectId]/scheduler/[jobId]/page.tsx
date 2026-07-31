'use client';

import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlarmClockIcon, CheckmarkCircle02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import { useJobDetail } from './use-job-detail';
import { RunDetailModal } from './run-detail-modal';
import { JobEditModal } from './job-edit-modal';
import { JobRunsList } from './job-runs-list';
import { StatCard } from './stat-card';

export default function ProjectSchedulerJobDetailPage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const params = { projectId: '', jobId: '' };

  const {
    job,
    loading,
    error,
    triggering,
    showEdit,
    setShowEdit,
    saving,
    saveError,
    selectedRun,
    setSelectedRun,
    runsPage,
    setRunsPage,
    hasMoreRuns,
    recentRuns,
    successRate,
    formName, setFormName,
    formExpression, setFormExpression,
    formTimezone, setFormTimezone,
    formTargetType, setFormTargetType,
    formEndpoint, setFormEndpoint,
    formFunctionId, setFormFunctionId,
    formPayload, setFormPayload,
    formRetryAttempts, setFormRetryAttempts,
    formRetryDelay, setFormRetryDelay,
    formTimeout, setFormTimeout,
    handleTrigger,
    handleSave,
    populateForm,
  } = useJobDetail({ projectId: params.projectId, jobId: params.jobId, getSdk });

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            onClick={() => router.push(`/projects/${params.projectId}/scheduler`)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 mb-2"
          >
            ← Scheduler
          </button>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text)] truncate">{job.name}</h1>
            <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
              job.enabled
                ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
                : 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
            }`}>
              {job.enabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-dim)] font-mono">
            {job.cronExpression} · {job.timezone ?? 'UTC'} · {job.retryAttempts} retries
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => { populateForm(job!); setShowEdit(true); }}>
            Edit
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleTrigger}
            loading={triggering}
            disabled={!job.enabled}
          >
            Run now
          </Button>
        </div>
      </div>

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
        runs={recentRuns}
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
        formName={formName} setFormName={formName => setFormName(formName)}
        formExpression={formExpression} setFormExpression={setFormExpression}
        formTimezone={formTimezone} setFormTimezone={setFormTimezone}
        formTargetType={formTargetType} setFormTargetType={setFormTargetType}
        formEndpoint={formEndpoint} setFormEndpoint={setFormEndpoint}
        formFunctionId={formFunctionId} setFormFunctionId={setFormFunctionId}
        formPayload={formPayload} setFormPayload={setFormPayload}
        formRetryAttempts={formRetryAttempts} setFormRetryAttempts={setFormRetryAttempts}
        formRetryDelay={formRetryDelay} setFormRetryDelay={setFormRetryDelay}
        formTimeout={formTimeout} setFormTimeout={setFormTimeout}
      />

      {/* Run detail modal */}
      {selectedRun && (
        <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
