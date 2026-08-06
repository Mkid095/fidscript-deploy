'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ChevronRightIcon, CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { Card, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useStorageSettings } from './use-storage-settings';
import { StorageSettingsProvider } from './storage-settings-provider';
import { StorageSettingsCloudinary } from './storage-settings-cloudinary';
import { StorageSettingsTelegram } from './storage-settings-telegram';

function Banner({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded border text-xs ${
      type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    }`}>
      <HugeiconsIcon icon={type === 'success' ? CheckmarkCircle01Icon : CancelCircleIcon} size={12} />
      {message}
    </div>
  );
}

export default function StorageSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getSdk } = useAuth();

  const {
    config, loading, banner,
    cloudName, setCloudName,
    cloudApiKey, setCloudApiKey,
    cloudApiSecret, setCloudApiSecret,
    savingCloud,
    cloudTestResult, testingCloud, handleTestCloudinary,
    tgBotToken, setTgBotToken,
    tgChatId, setTgChatId,
    savingTg,
    tgTestResult, testingTg, handleTestTelegram,
    handleProviderChange,
    handleSaveCloudinary,
    handleSaveTelegram,
    handleDeleteCloudinary,
    handleDeleteTelegram,
  } = useStorageSettings({ projectId, getSdk });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-dim)] mb-2">
        <Link href={`/projects/${projectId}/storage`} className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={11} />
          Storage
        </Link>
        <HugeiconsIcon icon={ChevronRightIcon} size={10} />
        <span className="text-[var(--text)] font-medium">Settings</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-0.5">Storage Settings</h1>
        <p className="text-xs text-[var(--text-dim)]">Configure storage providers and credentials for this project.</p>
      </div>

      {banner && <Banner message={banner.message} type={banner.type} />}

      <StorageSettingsProvider config={config} onProviderChange={handleProviderChange} />

      <StorageSettingsCloudinary
        cloudinaryCredsSet={config?.cloudinaryCredsSet ?? false}
        savingCloud={savingCloud}
        cloudName={cloudName} setCloudName={setCloudName}
        cloudApiKey={cloudApiKey} setCloudApiKey={setCloudApiKey}
        cloudApiSecret={cloudApiSecret} setCloudApiSecret={setCloudApiSecret}
        onSave={handleSaveCloudinary}
        onDelete={handleDeleteCloudinary}
        onTest={handleTestCloudinary}
        testResult={cloudTestResult}
        testing={testingCloud}
      />

      <StorageSettingsTelegram
        telegramCredsSet={config?.telegramCredsSet ?? false}
        savingTg={savingTg}
        tgBotToken={tgBotToken} setTgBotToken={setTgBotToken}
        tgChatId={tgChatId} setTgChatId={setTgChatId}
        onSave={handleSaveTelegram}
        onDelete={handleDeleteTelegram}
        onTest={handleTestTelegram}
        testResult={tgTestResult}
        testing={testingTg}
      />
    </div>
  );
}
