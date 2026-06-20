'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Modal } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';

import type { Project } from '@/types';
// Local type definition mirroring SDK internal Function_ interface
interface Function_ {
  id: string;
  name: string;
  runtime: string;
  status: string;
  projectId?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  BUILDING: 'bg-blue-900 text-blue-400',
  ACTIVE: 'bg-emerald-900 text-emerald-400',
  FAILED: 'bg-red-900 text-red-400',
  INACTIVE: 'bg-slate-700 text-slate-400',
};

export default function FunctionsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [functions, setFunctions] = useState<Function_[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRuntime, setNewRuntime] = useState('node');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoadingProjects(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.projects.list();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;

    async function loadFunctions() {
      setLoadingFunctions(true);
      setError(null);
      try {
        const token = localStorage.getItem('fidscript_token');
        if (!token) return;
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.functions.list(selectedProjectId);
        setFunctions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load functions');
      } finally {
        setLoadingFunctions(false);
      }
    }
    loadFunctions();
  }, [selectedProjectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      const created = await sdk.functions.create(selectedProjectId, { name: newName.trim(), runtime: newRuntime });
      setFunctions(prev => [...prev, created]);
      setNewName('');
      setNewRuntime('node');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create function');
    } finally {
      setCreating(false);
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
          <h1 className="text-xl font-bold text-slate-200 mb-1">Functions</h1>
          <p className="text-sm text-slate-500">
            {functions.length} function{functions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={!selectedProjectId}>
          Create Function
        </Button>
      </div>

      {/* Project selector */}
      <div className="mb-6">
        <label className="block text-xs text-slate-400 mb-1">Project</label>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm min-w-52"
        >
          <option value="">Select a project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {loadingFunctions ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : functions.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title="No functions"
            description="Create your first serverless function for this project."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={!selectedProjectId}>
                Create Function
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="border border-[#1e2130] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Runtime</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Created</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {functions.map(fn => (
                <tr key={fn.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/functions/${fn.id}?project=${selectedProjectId}`}
                      className="text-slate-200 hover:text-blue-400 no-underline"
                    >
                      {fn.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fn.runtime}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[fn.status] ?? 'bg-slate-700 text-slate-300'}`}>
                      {fn.status ?? 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(fn.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/functions/${fn.id}?project=${selectedProjectId}`}
                      className="text-xs text-slate-400 hover:text-slate-200 no-underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Function Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(null); setNewName(''); setNewRuntime('node'); }}
        title="Create Function"
      >
        <form onSubmit={handleCreate} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">Function name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="my-function"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Runtime</label>
            <select
              value={newRuntime}
              onChange={e => setNewRuntime(e.target.value)}
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="node">Node.js</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          </div>
          {createError && <p className="text-red-400 text-xs mb-4">{createError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
