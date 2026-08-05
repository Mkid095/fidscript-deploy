import { useState, useCallback } from 'react';
import type { Function_ } from '@/types';

interface UseFunctionSettingsOptions {
  fn: Function_;
  onUpdate: (data: Partial<Function_>) => Promise<void>;
  onDelete: () => void;
}

interface UseFunctionSettingsReturn {
  envVars: Record<string, string>;
  newKey: string;
  newVal: string;
  saving: boolean;
  showDelete: boolean;
  deleting: boolean;
  hasChanges: boolean;
  setNewKey: (v: string) => void;
  setNewVal: (v: string) => void;
  setShowDelete: (v: boolean) => void;
  addEnvVar: () => void;
  removeEnvVar: (key: string) => void;
  handleSaveEnvVars: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

export function useFunctionSettings({
  fn,
  onUpdate,
  onDelete,
}: UseFunctionSettingsOptions): UseFunctionSettingsReturn {
  const [envVars, setEnvVars] = useState<Record<string, string>>({ ...fn.envVars });
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addEnvVar = useCallback(() => {
    if (!newKey.trim()) return;
    setEnvVars(prev => ({ ...prev, [newKey.trim()]: newVal }));
    setNewKey('');
    setNewVal('');
  }, [newKey, newVal]);

  const removeEnvVar = useCallback((key: string) => {
    setEnvVars(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSaveEnvVars = useCallback(async () => {
    setSaving(true);
    try {
      await onUpdate({ envVars });
    } finally {
      setSaving(false);
    }
  }, [envVars, onUpdate]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      onDelete();
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }, [onDelete]);

  const hasChanges = JSON.stringify(envVars) !== JSON.stringify(fn.envVars);

  return {
    envVars, newKey, newVal, saving, showDelete, deleting, hasChanges,
    setNewKey, setNewVal, setShowDelete,
    addEnvVar, removeEnvVar, handleSaveEnvVars, handleDelete,
  };
}
