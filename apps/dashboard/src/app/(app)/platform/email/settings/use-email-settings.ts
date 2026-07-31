'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StorageBackend, AdminAttachmentConfig } from '@fidscript-deploy/sdk';

interface UseEmailSettingsOptions {
  sdk: ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>;
}

export function useEmailSettings({ sdk }: UseEmailSettingsOptions) {
  const [config, setConfig] = useState<AdminAttachmentConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<StorageBackend>('internal');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cloudinary fields
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);

  // Telegram fields
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    setConfigError(null);
    try {
      const data = await sdk.email.attachmentConfig.get();
      setConfig(data);
      setSelectedProvider(data.provider);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoadingConfig(false);
    }
  }, [sdk]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTestResult(null);
    try {
      const body: { provider: StorageBackend; credentials?: Record<string, string> } = { provider: selectedProvider };
      if (selectedProvider === 'cloudinary') {
        if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
          setSaveError('Cloudinary: cloudName, apiKey, and apiSecret are all required.');
          setSaving(false);
          return;
        }
        body.credentials = { cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
      } else if (selectedProvider === 'telegram') {
        if (!botToken.trim() || !chatId.trim()) {
          setSaveError('Telegram: botToken and chatId are both required.');
          setSaving(false);
          return;
        }
        body.credentials = { botToken: botToken.trim(), chatId: chatId.trim() };
      }
      await sdk.email.attachmentConfig.update(body);
      await loadConfig();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [sdk, selectedProvider, cloudName, apiKey, apiSecret, botToken, chatId, loadConfig]);

  const handleTest = useCallback(async () => {
    if (selectedProvider === 'internal') {
      setTestResult({ ok: true, message: 'Internal storage is always available (MinIO).' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const data = await sdk.email.attachmentConfig.test() as { ok: boolean; message?: string };
      setTestResult({ ok: data.ok, message: data.message ?? JSON.stringify(data) });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  }, [sdk, selectedProvider]);

  return {
    config, loadingConfig, configError,
    selectedProvider, setSelectedProvider,
    saving, saveError, saveSuccess,
    cloudName, setCloudName,
    apiKey, setApiKey,
    apiSecret, setApiSecret,
    showCloudinarySecret, setShowCloudinarySecret,
    botToken, setBotToken,
    chatId, setChatId,
    showBotToken, setShowBotToken,
    testing, testResult,
    handleSave, handleTest, loadConfig,
  };
}
