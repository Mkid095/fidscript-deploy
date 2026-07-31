'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, AlertRule, Alert, NotificationChannel } from '@/types';

const METRICS = ['cpu', 'memory', 'disk', 'deployment_failed', 'function_error_rate'];
const INTERVALS = ['30s', '1m', '5m', '15m'];

interface UseMonitoringDataOptions {
  selectedProjectId: string | null;
  shellProjectId: string | null;
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>;
}

export function useMonitoringData({ selectedProjectId, shellProjectId, getSdk }: UseMonitoringDataOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const effectiveProjectId = shellProjectId ?? pickedProjectId;
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<Record<string, Alert>>({});
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingRules, setLoadingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formMetric, setFormMetric] = useState('');
  const [formCondition, setFormCondition] = useState('above');
  const [formThreshold, setFormThreshold] = useState('');
  const [formSeverity, setFormSeverity] = useState('warning');
  const [formDuration, setFormDuration] = useState('60');
  const [formChannel, setFormChannel] = useState('');

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0) setPickedProjectId((data.projects ?? [])[0].id);
      } catch { /* ignore */ }
      finally { setLoadingProjects(false); }
    }
    loadProjects();
  }, [getSdk, shellProjectId]);

  useEffect(() => {
    if (!effectiveProjectId) return;
    async function loadChannels() {
      try {
        const sdk = getSdk();
        const ch = await sdk.monitoring.listNotificationChannels(effectiveProjectId);
        setChannels(ch);
      } catch { /* channels may not exist yet */ }
    }
    loadChannels();
  }, [effectiveProjectId, getSdk]);

  useEffect(() => {
    if (!effectiveProjectId) return;
    async function loadRules() {
      setLoadingRules(true);
      setError(null);
      try {
        const sdk = getSdk();
        const [rulesData, alertsData] = await Promise.all([
          sdk.monitoring.listAlertRules(effectiveProjectId),
          sdk.monitoring.getAlerts(effectiveProjectId),
        ]);
        setRules(rulesData);
        const alertMap: Record<string, Alert> = {};
        for (const alert of alertsData) {
          if (alert.status === 'firing') {
            const key = `${alert.severity}`;
            if (!alertMap[key] || alert.firedAt! > alertMap[key].firedAt!) {
              alertMap[key] = alert;
            }
          }
        }
        setAlerts(alertMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alert rules');
      } finally {
        setLoadingRules(false);
      }
    }
    loadRules();
  }, [effectiveProjectId, getSdk]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMetric || !formThreshold || !effectiveProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      await sdk.monitoring.createAlertRule(effectiveProjectId, {
        name: formName.trim(),
        metric: formMetric,
        condition: formCondition,
        threshold: parseFloat(formThreshold),
        severity: formSeverity,
        durationSeconds: parseInt(formDuration.replace(/[^\d]/g, ''), 10),
        channels: formChannel ? [formChannel] : [],
      });
      const data = await sdk.monitoring.listAlertRules(effectiveProjectId);
      setRules(data);
      resetForm();
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create alert rule');
    } finally {
      setCreating(false);
    }
  }, [effectiveProjectId, getSdk, formName, formMetric, formCondition, formThreshold, formSeverity, formDuration, formChannel]);

  function resetForm() {
    setFormName('');
    setFormMetric('');
    setFormCondition('above');
    setFormThreshold('');
    setFormSeverity('warning');
    setFormDuration('1m');
    setFormChannel('');
  }

  return {
    projects, pickedProjectId, setPickedProjectId,
    effectiveProjectId,
    rules, alerts, loadingProjects, loadingRules, error,
    showCreate, setShowCreate,
    creating, createError,
    channels,
    formName, setFormName,
    formMetric, setFormMetric,
    formCondition, setFormCondition,
    formThreshold, setFormThreshold,
    formSeverity, setFormSeverity,
    formDuration, setFormDuration,
    formChannel, setFormChannel,
    handleCreate, resetForm,
    METRICS, INTERVALS,
  };
}
