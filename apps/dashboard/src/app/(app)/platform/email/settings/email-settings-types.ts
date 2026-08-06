import type { StorageBackend } from '@fidscript-deploy/sdk';

export interface EmailSettingsFormState {
  selectedProvider: StorageBackend;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  showCloudinarySecret: boolean;
  botToken: string;
  chatId: string;
  showBotToken: boolean;
}

export interface EmailSettingsFormProps extends EmailSettingsFormState {
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  testResult: { ok: boolean; message: string } | null;
  testing: boolean;
  setSelectedProvider: (v: StorageBackend) => void;
  setCloudName: (v: string) => void;
  setApiKey: (v: string) => void;
  setApiSecret: (v: string) => void;
  setShowCloudinarySecret: (v: boolean | ((prev: boolean) => boolean)) => void;
  setBotToken: (v: string) => void;
  setChatId: (v: string) => void;
  setShowBotToken: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSave: (e: React.FormEvent) => void;
  onTest: () => void;
}
