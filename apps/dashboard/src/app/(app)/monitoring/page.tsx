'use client';

import { Button, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useMonitoringData } from './use-monitoring-data';
import { AlertList } from './alert-list';
import { AlertCreateModal } from './alert-create-modal';

export default function MonitoringPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();

  const {
    projects, pickedProjectId, setPickedProjectId,
    effectiveProjectId,
    rules, alerts, loadingProjects, loadingRules, error,
    showCreate, setShowCreate,
    creating, createError,
    channels,
    formName, setFormName,
    formMetric, setFormMetric,
    formCondition, setFormCondition,
    formThreshold, setFormThreshold,
    formSeverity, setFormSeverity,
    formDuration, setFormDuration,
    formChannel, setFormChannel,
    handleCreate, resetForm,
    METRICS, INTERVALS,
  } = useMonitoringData({ selectedProjectId: null, shellProjectId, getSdk });

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Monitoring</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {rules.length} alert rule{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Alert
        </Button>
      </div>

      <div className="mb-6">
        {!shellProjectId && (
          <>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Project</label>
            <select
              value={pickedProjectId}
              onChange={e => setPickedProjectId(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm min-w-52"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}

      {loadingRules ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : (
        <AlertList
          rules={rules}
          alerts={alerts}
          selectedProjectId={effectiveProjectId}
          onCreateClick={() => setShowCreate(true)}
        />
      )}

      <AlertCreateModal
        isOpen={showCreate}
        creating={creating}
        createError={createError}
        channels={channels}
        formName={formName} setFormName={setFormName}
        formMetric={formMetric} setFormMetric={setFormMetric}
        formCondition={formCondition} setFormCondition={setFormCondition}
        formThreshold={formThreshold} setFormThreshold={setFormThreshold}
        formSeverity={formSeverity} setFormSeverity={setFormSeverity}
        formDuration={formDuration} setFormDuration={setFormDuration}
        formChannel={formChannel} setFormChannel={setFormChannel}
        onSubmit={handleCreate}
        onClose={() => setShowCreate(false)}
        onReset={resetForm}
        METRICS={METRICS}
        INTERVALS={INTERVALS}
      />
    </div>
  );
}
