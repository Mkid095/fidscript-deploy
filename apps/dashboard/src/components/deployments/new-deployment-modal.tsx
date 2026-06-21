'use client';

import { useState } from 'react';
import { Modal, Button } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

interface Props {
  project: Project;
  onClose: () => void;
  onCreated: () => void;
}

type SourceType = 'git' | 'archive';

export function NewDeploymentModal({ project, onClose, onCreated }: Props) {
  const { getSdk } = useAuth();
  const [sourceType, setSourceType] = useState<SourceType>('git');
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [dockerfilePath, setDockerfilePath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gitUrl.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const sdk = getSdk();
      await sdk.deployments.create(project.id, {
        source: {
          type: sourceType,
          ...(sourceType === 'git' && {
            git: {
              url: gitUrl.trim(),
              branch: branch.trim() || 'main',
              ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }),
            },
          }),
        },
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deployment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={true} title="New Deployment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Source type */}
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Source type</label>
          <div className="flex gap-3">
            {(['git', 'archive'] as SourceType[]).map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  value={s}
                  checked={sourceType === s}
                  onChange={() => setSourceType(s)}
                  className="accent-red-500"
                />
                <span className="text-sm text-slate-300 capitalize">{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Git URL */}
        {sourceType === 'git' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Git repository URL</label>
              <input
                value={gitUrl}
                onChange={e => setGitUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Branch</label>
              <input
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">
                Dockerfile path <span className="text-slate-600 normal-case">(optional)</span>
              </label>
              <input
                value={dockerfilePath}
                onChange={e => setDockerfilePath(e.target.value)}
                placeholder="./Dockerfile"
                className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors"
              />
            </div>

            {/* What will build preview */}
            {gitUrl && (
              <div className="rounded-lg bg-[#080a0d] border border-[#1e2130] p-3 space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase mb-2">What will build</p>
                <p className="text-xs text-slate-500 font-mono">
                  {gitUrl} @ {branch || 'main'}
                </p>
                <p className="text-xs text-slate-600 font-mono">
                  → Dockerfile{dockerfilePath ? ` at ${dockerfilePath}` : ' (auto-detect)'}
                </p>
                <p className="text-xs text-slate-600 font-mono">
                  → Image: fidscript/{project.slug}:{Date.now().toString(36)}-xxxx
                </p>
              </div>
            )}
          </div>
        )}

        {sourceType === 'archive' && (
          <div className="rounded-lg bg-[#080a0d] border border-[#1e2130] p-4 text-center">
            <p className="text-sm text-slate-500">Archive deployment coming soon.</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={!gitUrl.trim() || submitting}
          >
            {submitting ? 'Deploying…' : 'Deploy'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
