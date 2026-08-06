'use client';

import { Card, Button, Input } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudIcon, CheckmarkCircle01Icon, CancelCircle01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';

interface Props {
  cloudinaryCredsSet: boolean;
  savingCloud: boolean;
  cloudName: string;
  cloudApiKey: string;
  cloudApiSecret: string;
  setCloudName: (v: string) => void;
  setCloudApiKey: (v: string) => void;
  setCloudApiSecret: (v: string) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
  onTest: () => void;
  testResult: { ok: boolean; detail?: string; error?: string } | null;
  testing: boolean;
}

export function StorageSettingsCloudinary({
  cloudinaryCredsSet, savingCloud,
  cloudName, cloudApiKey, cloudApiSecret,
  setCloudName, setCloudApiKey, setCloudApiSecret,
  onSave, onDelete, onTest, testResult, testing,
}: Props) {
  const canTest = cloudName.trim().length > 0 && cloudApiKey.trim().length > 0 && cloudApiSecret.trim().length > 0;

  return (
    <Card className="border border-[var(--rail)]" padding="lg">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[var(--rail)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <HugeiconsIcon icon={CloudIcon} size={14} className="text-[var(--text-dim)]" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-[var(--text)]">Cloudinary</h2>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Connect your Cloudinary account to use it as a storage provider.</p>
        </div>
      </div>

      {cloudinaryCredsSet && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-medium text-emerald-400">Cloudinary credentials are configured</span>
        </div>
      )}

      <div className="mb-4 px-3 py-2 rounded bg-[var(--surface-2)] border border-[var(--rail)] flex items-start gap-2">
        <HugeiconsIcon icon={InformationCircleIcon} size={12} className="text-[var(--text-dim)] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
          Find these in the{' '}
          <a href="https://console.cloudinary.com/" target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">Cloudinary console</a>
          {' '}under <span className="font-mono text-[var(--text)]">Programmable Media → API Keys</span>.
          The cloud name is shown on the dashboard card (e.g. <span className="font-mono">my-cloud</span>, not the full URL).
        </p>
      </div>

      <form onSubmit={onSave} noValidate className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">Cloud Name</label>
          <Input value={cloudName} onChange={e => setCloudName(e.target.value)} placeholder="e.g. my-cloud"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">API Key</label>
          <Input value={cloudApiKey} onChange={e => setCloudApiKey(e.target.value)} placeholder="e.g. 123456789012345"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">API Secret</label>
          <Input type="password" value={cloudApiSecret} onChange={e => setCloudApiSecret(e.target.value)} placeholder="Your Cloudinary API secret"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs" />
        </div>
        {testResult && (
          <div className={`flex items-start gap-2 px-3 py-2 rounded border text-[10px] ${
            testResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <HugeiconsIcon icon={testResult.ok ? CheckmarkCircle01Icon : CancelCircle01Icon} size={12} className="flex-shrink-0 mt-0.5" />
            <span>{testResult.ok ? testResult.detail : testResult.error}</span>
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="primary" size="sm" loading={savingCloud}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
            {savingCloud ? 'Saving...' : 'Save Cloudinary Credentials'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onTest}
            loading={testing} disabled={!canTest || testing}
            className="text-[var(--text-dim)] hover:text-[var(--text)]">
            {testing ? 'Testing…' : 'Test Connection'}
          </Button>
          {cloudinaryCredsSet && (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
              Remove
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
