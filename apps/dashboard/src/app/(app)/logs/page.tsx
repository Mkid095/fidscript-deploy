'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useLogsData } from './use-logs-data';
import { LogFilters } from './log-filters';
import { LogList } from './log-list';
import { downloadLogs } from './download-logs';
import { streamInfoFor, type StreamKey } from './stream-taxonomy';

const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type Level = typeof LEVELS[number];

export default function LogsPage() {
  const searchParams = useSearchParams();
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const [streamKey, setStreamKey] = useState<StreamKey>('default');
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(LEVELS));
  const [searchTerm, setSearchTerm] = useState('');
  const [pickedProjectId, setPickedProjectId] = useState(searchParams.get('project') ?? '');

  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const d = useLogsData(selectedProjectId, streamKey, activeLevels, setActiveLevels, getSdk, shellProjectId, searchTerm);

  function handleProjectChange(id: string) {
    setPickedProjectId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('project', id);
    window.location.href = url.toString();
  }

  function handleDownload() {
    const stream = streamInfoFor(streamKey);
    downloadLogs(d.logs, { projectId: selectedProjectId, stream: stream.label, search: searchTerm });
  }

  if (d.loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-[var(--text-muted)]">Loading…</div>
      </div>
    );
  }

  if (!shellProjectId && d.projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-sm text-[var(--text-muted)] mb-4">Create a project first to view logs.</p>
          <Link href="/projects"><Button variant="primary" size="sm">Go to Projects</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Logs</h1>
          <p className="text-sm text-[var(--text-muted)]">{d.logs.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={d.loadLogs}>Refresh</Button>
          <Button variant="ghost" size="sm" onClick={d.clearLogs}>Clear</Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} disabled={d.logs.length === 0}>
            <HugeiconsIcon icon={Download01Icon} size={13} className="mr-1.5" />
            Download
          </Button>
        </div>
      </div>

      <LogFilters
        projects={d.projects}
        pickedProjectId={pickedProjectId}
        shellProjectId={shellProjectId}
        streamKey={streamKey}
        activeLevels={activeLevels}
        live={d.live}
        searchTerm={searchTerm}
        onProjectChange={handleProjectChange}
        onStreamChange={setStreamKey}
        onToggleLevel={d.toggleLevel}
        onLiveChange={d.setLive}
        onSearchChange={setSearchTerm}
      />

      <LogList
        logs={d.logs}
        loading={d.loadingLogs}
        error={d.error}
        autoScroll
        onClear={d.clearLogs}
      />
    </div>
  );
}