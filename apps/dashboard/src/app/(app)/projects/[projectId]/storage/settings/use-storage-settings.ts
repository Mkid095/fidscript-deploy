'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { ProjectStorageConfig } from '@/types';

interface UseStorageSettingsOptions {
  projectId: string;
  getSdk: () => FidscriptSDK;
}

export function useStorageSettings({ projectId, getSdk }: UseStorageSettingsOptions) {
  const [config, setConfig] = useState<ProjectStorageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cloudinary fields
  const [cloudName, setCloudName] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudApiSecret, setCloudApiSecret] = useState('');
  const [savingCloud, setSavingCloud] = useState(false);

  // Telegram fields
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [savingTg, setSavingTg] = useState(false);

  const showBanner = useCallback((message: string, type: 'success' | 'error') => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  const loadConfig = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const cfg = await sdk.storage.getStorageConfig(projectId);
      setConfig(cfg);
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to load config', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk, showBanner]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleProviderChange = useCallback(async (provider: string) => {
    if (!projectId || !config) return;
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.updateStorageConfig(projectId, { defaultProvider: provider });
      setConfig(updated);
      showBanner('Default storage provider updated', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to update provider', 'error');
    }
  }, [projectId, config, getSdk, showBanner]);

  const handleSaveCloudinary = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSavingCloud(true);
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.setCloudinaryCredentials(projectId, {
        cloudName: cloudName.trim(),
        apiKey: cloudApiKey.trim(),
        apiSecret: cloudApiSecret.trim(),
      });
      setConfig(updated);
      setCloudName(''); setCloudApiKey(''); setCloudApiSecret('');
      showBanner('Cloudinary credentials saved', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
    } finally {
      setSavingCloud(false);
    }
  }, [projectId, getSdk, cloudName, cloudApiKey, cloudApiSecret, showBanner]);

  const handleSaveTelegram = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSavingTg(true);
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.setTelegramCredentials(projectId, {
        botToken: tgBotToken.trim(),
        chatId: tgChatId.trim(),
      });
      setConfig(updated);
      setTgBotToken(''); setTgChatId('');
      showBanner('Telegram credentials saved', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
    } finally {
      setSavingTg(false);
    }
  }, [projectId, getSdk, tgBotToken, tgChatId, showBanner]);

  const handleDeleteCloudinary = useCallback(async () => {
    if (!projectId) return;
    if (!confirm('Remove Cloudinary credentials? This will disable Cloudinary storage for this project.')) return;
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.deleteCredentials(projectId, 'cloudinary');
      setConfig(updated);
      showBanner('Cloudinary credentials removed', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to remove credentials', 'error');
    }
  }, [projectId, getSdk, showBanner]);

  const handleDeleteTelegram = useCallback(async () => {
    if (!projectId) return;
    if (!confirm('Remove Telegram credentials? This will disable Telegram storage for this project.')) return;
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.deleteCredentials(projectId, 'telegram');
      setConfig(updated);
      showBanner('Telegram credentials removed', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to remove credentials', 'error');
    }
  }, [projectId, getSdk, showBanner]);

  return {
    config, loading, banner,
    cloudName, setCloudName,
    cloudApiKey, setCloudApiKey,
    cloudApiSecret, setCloudApiSecret,
    savingCloud,
    tgBotToken, setTgBotToken,
    tgChatId, setTgChatId,
    savingTg,
    handleProviderChange,
    handleSaveCloudinary,
    handleSaveTelegram,
    handleDeleteCloudinary,
    handleDeleteTelegram,
  };
}
