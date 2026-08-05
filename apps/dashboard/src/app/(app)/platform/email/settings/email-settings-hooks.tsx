import { useState, useCallback } from 'react';
import type { StorageBackend } from '@fidscript-deploy/sdk';
import { FloppyDiskIcon, SentIcon, CloudIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export const BACKEND_INFO: Record<StorageBackend, { label: string; description: string; icon: React.ReactNode }> = {
  internal: {
    label: 'Internal (VPS)',
    description: 'Store attachments on the platform VPS using MinIO S3-compatible storage. No external service required.',
    icon: <HugeiconsIcon icon={FloppyDiskIcon} size={14} strokeWidth={1.5} />,
  },
  telegram: {
    label: 'Telegram',
    description: 'Upload attachments to a private Telegram chat via the Bot API. Free and reliable for moderate traffic.',
    icon: <HugeiconsIcon icon={SentIcon} size={14} strokeWidth={1.5} />,
  },
  cloudinary: {
    label: 'Cloudinary',
    description: 'Upload attachments to Cloudinary CDN. Fast global delivery with transformation support.',
    icon: <HugeiconsIcon icon={CloudIcon} size={14} strokeWidth={1.5} />,
  },
};

export function useEmailSettingsForm() {
  const [selectedProvider, setSelectedProvider] = useState<StorageBackend>('internal');
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const resetToInternal = useCallback(() => {
    setSelectedProvider('internal');
    setCloudName('');
    setApiKey('');
    setApiSecret('');
    setBotToken('');
    setChatId('');
  }, []);

  const isDisabled =
    (selectedProvider === 'cloudinary' && (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim())) ||
    (selectedProvider === 'telegram' && (!botToken.trim() || !chatId.trim()));

  return {
    selectedProvider, setSelectedProvider,
    cloudName, setCloudName,
    apiKey, setApiKey,
    apiSecret, setApiSecret, showCloudinarySecret, setShowCloudinarySecret,
    botToken, setBotToken, chatId, setChatId, showBotToken, setShowBotToken,
    saving, saveError, saveSuccess, testResult, testing,
    resetToInternal,
    isDisabled,
  };
}
