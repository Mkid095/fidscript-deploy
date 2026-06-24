'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import Link from 'next/link';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { Project } from '@/types';

// Domain type — not re-exported from SDK, define locally
interface Domain {
  id: string;
  name: string;
  projectId?: string;
  dnsStatus: string;
  sslStatus: string;
  status?: string;
  ownerId: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  VERIFIED: 'bg-blue-900 text-blue-400',
  ACTIVE: 'bg-emerald-900 text-emerald-400',
  FAILED: 'bg-red-900 text-red-400',
};

const DNS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-900 text-yellow-400',
  CONFIGURED: 'bg-emerald-900 text-emerald-400',
  UNKNOWN: 'bg-slate-700 text-slate-400',
};

export default function EmailPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (shellProjectId) return;
    async function load() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data);
        if (data.length > 0 && !pickedProjectId) {
          setPickedProjectId(data[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSdk, shellProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;

    async function loadDomains() {
      setLoadingDomains(true);
      setError(null);
      try {
        const sdk = getSdk();
        const allDomains = await sdk.domains.list();
        // Filter to domains belonging to this project
        const projectDomains = allDomains.filter(d => d.projectId === selectedProjectId);
        setDomains(projectDomains);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load domains');
      } finally {
        setLoadingDomains(false);
      }
    }
    loadDomains();
  }, [selectedProjectId, getSdk]);

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.domains.create(selectedProjectId, newDomain.trim());
      setDomains(prev => [...prev, created]);
      setNewDomain('');
      setShowAdd(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

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
          <h1 className="text-xl font-bold text-slate-200 mb-1">Email</h1>
          <p className="text-sm text-slate-500">
            {domains.length} domain{domains.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          Add Domain
        </Button>
      </div>

      {/* Project selector — hidden when the project shell already chose a project */}
      {!shellProjectId && (
        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1">Project</label>
          <select
            value={pickedProjectId}
            onChange={e => setPickedProjectId(e.target.value)}
            className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm min-w-52"
          >
            <option value="">Select a project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {loadingDomains ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : domains.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title="No email domains"
            description="Add a domain to start managing email for this project."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
                Add Domain
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {domains.map(domain => (
            <Link key={domain.id} href={`/email/${domain.id}`} className="no-underline">
              <div className="rounded-lg border border-[#1e2130] bg-[#0f1117] p-5 cursor-pointer transition-colors duration-150 hover:border-blue-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-0.5">{domain.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{domain.id.slice(0, 12)}…</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[domain.status ?? 'UNKNOWN'] ?? 'bg-slate-700 text-slate-300'}`}>
                    {domain.status ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">DNS:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${DNS_COLORS[domain.dnsStatus] ?? 'bg-slate-700 text-slate-400'}`}>
                    {domain.dnsStatus ?? 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Domain Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setNewDomain(''); setAddError(null); }}
        title="Add Domain"
      >
        <form onSubmit={handleAddDomain} noValidate>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Domain name</label>
            <Input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="mail.example.com"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          {addError && (
            <p className="text-red-400 text-xs mb-4">{addError}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowAdd(false); setAddError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={adding}>
              {adding ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
