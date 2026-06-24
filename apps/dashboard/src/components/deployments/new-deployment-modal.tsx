'use client';

import { useState } from 'react';
import { Modal, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, HardDriveIcon, GitBranchIcon, Key01Icon, File01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

interface Props {
  project: Project;
  onClose: () => void;
  onCreated: () => void;
}

type SourceType = 'git' | 'archive';

function extractRepoInfo(url: string): { repo: string; branch: string } {
  // Extract owner/repo from various git URL formats
  const sshMatch = url.match(/git@[^:]+:([^\/]+\/[^\/]+?)(?:\.git)?$/);
  const httpsMatch = url.match(/https?:\/\/[^\/]+\/([^\/]+\/[^\/]+?)(?:\.git)?$/);
  const matched = sshMatch?.[1] ?? httpsMatch?.[1] ?? url;

  // Try to extract branch from the URL path or query
  const branchMatch = url.match(/[?&]branch=([^&]+)/);
  const branch = branchMatch?.[1] ?? 'main';

  return { repo: matched, branch };
}

function PreviewPanel({ url, branch, dockerfilePath, sourceType }: {
  url: string; branch: string; dockerfilePath: string; sourceType: SourceType;
}) {
  if (!url) return null;

  if (sourceType === 'archive') {
    return (
      <div className="rounded-lg bg-[#080a0d] border border-[#1e2130] p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What will deploy</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <HugeiconsIcon icon={HardDriveIcon} size={13} className="text-slate-600" />
          <span>Archive upload</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <HugeiconsIcon icon={File01Icon} size={13} className="text-slate-600" />
          <span className="font-mono">{dockerfilePath || '(auto-detect)'}</span>
        </div>
      </div>
    );
  }

  const { repo } = extractRepoInfo(url);
  const imageName = `fidscript/${repo.replace('/', '-').toLowerCase()}`;
  const tagSuffix = Date.now().toString(36);

  return (
    <div className="rounded-lg bg-[#080a0d] border border-[#1e2130] p-4 space-y-2.5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What will build</p>

      <div className="flex items-start gap-2.5">
        <HugeiconsIcon icon={GithubIcon} size={13} className="text-slate-600 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-mono text-slate-300 truncate">{repo}</p>
          <p className="text-xs text-slate-600">github.com/{repo}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <HugeiconsIcon icon={GitBranchIcon} size={13} className="text-slate-600" />
        <span className="font-mono text-slate-300">{branch || 'main'}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <HugeiconsIcon icon={File01Icon} size={13} className="text-slate-600" />
        <span className="font-mono text-slate-300">
          {dockerfilePath
            ? `Dockerfile at ${dockerfilePath}`
            : 'Dockerfile (auto-detect)'}
        </span>
      </div>

      <div className="border-t border-[#1e2130] pt-2 mt-1">
        <p className="text-xs text-slate-600 mb-1">Resulting image tag</p>
        <div className="flex items-center gap-1.5">
          <code className="text-[10px] font-mono text-slate-400 bg-[#1e2130] px-2 py-1 rounded flex-1 truncate">
            {imageName}:{branch.replace(/\//g, '-')}-{tagSuffix}
          </code>
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="text-slate-700 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function NewDeploymentModal({ project, onClose, onCreated }: Props) {
  const { getSdk } = useAuth();
  const [sourceType, setSourceType] = useState<SourceType>('git');
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [credentials, setCredentials] = useState('');
  const [dockerfilePath, setDockerfilePath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect branch when URL changes
  function handleUrlChange(value: string) {
    setGitUrl(value);
    const { branch: detected } = extractRepoInfo(value);
    if (detected && detected !== 'main') {
      setBranch(detected);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sourceType === 'git' && !gitUrl.trim()) return;
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
              ...(credentials.trim() && { credentials: credentials.trim() }),
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
    <Modal isOpen={true} title="New deployment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source type selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase mb-2.5 tracking-wider">
            Source
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { key: 'git',     label: 'Git repository',  icon: GithubIcon,  desc: 'Clone from GitHub, GitLab, or any git URL' },
              { key: 'archive', label: 'Archive upload',   icon: HardDriveIcon, desc: 'Upload a zip or tar.gz archive' },
            ] as const).map(s => (
              <label
                key={s.key}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${sourceType === s.key
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-[#1e2130] bg-[#080a0d] hover:border-[#2a2d3a]'}
                `}
              >
                <input
                  type="radio"
                  name="sourceType"
                  value={s.key}
                  checked={sourceType === s.key}
                  onChange={() => setSourceType(s.key)}
                  className="sr-only"
                />
                <HugeiconsIcon
                  icon={s.icon}
                  size={18}
                  className={sourceType === s.key ? 'text-red-400 mt-0.5' : 'text-slate-600 mt-0.5'}
                />
                <div>
                  <p className={`text-sm font-medium ${sourceType === s.key ? 'text-slate-200' : 'text-slate-400'}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Git fields */}
        {sourceType === 'git' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5 tracking-wider">
                Repository URL <span className="text-red-500">*</span>
              </label>
              <input
                value={gitUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5 tracking-wider">
                  Branch
                </label>
                <input
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5 tracking-wider">
                  Credentials <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <input
                  value={credentials}
                  onChange={e => setCredentials(e.target.value)}
                  placeholder="Deploy key or token"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
                />
                <p className="text-[10px] text-slate-600 mt-1">For private repositories — stored encrypted, never logged.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5 tracking-wider">
                Dockerfile path <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                value={dockerfilePath}
                onChange={e => setDockerfilePath(e.target.value)}
                placeholder="./Dockerfile"
                className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
              />
            </div>

            {/* Build preview */}
            <PreviewPanel
              url={gitUrl}
              branch={branch}
              dockerfilePath={dockerfilePath}
              sourceType={sourceType}
            />
          </div>
        )}

        {/* Archive fields */}
        {sourceType === 'archive' && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-[#2a2d3a] p-8 text-center">
              <HugeiconsIcon icon={HardDriveIcon} size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 mb-1">Drag and drop your archive here</p>
              <p className="text-xs text-slate-600">zip, tar.gz — up to 500 MB</p>
              <button
                type="button"
                className="mt-4 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                onClick={() => {}}
              >
                Or browse files
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5 tracking-wider">
                Dockerfile path <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                value={dockerfilePath}
                onChange={e => setDockerfilePath(e.target.value)}
                placeholder="./Dockerfile"
                className="w-full px-4 py-2.5 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/5 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={(sourceType === 'git' && !gitUrl.trim()) || submitting}
          >
            {submitting ? 'Deploying…' : 'Deploy'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
