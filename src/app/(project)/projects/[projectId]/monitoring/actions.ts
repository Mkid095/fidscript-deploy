'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The alert rules, and the places the word goes.
 *
 * A rule says when to speak up; a channel says where. Both are the
 * project's own.
 */

export async function createAlertRuleAction(
  projectId: string,
  input: {
    name: string;
    metric: string;
    condition: 'above' | 'below' | 'equals';
    threshold: number;
    severity: 'critical' | 'warning' | 'info';
    channels: string[];
  },
): Promise<{ ok?: boolean; error?: string }> {
  if (!input.name.trim()) return { error: 'The rule needs a name.' };
  if (!input.metric.trim()) return { error: 'The rule needs a metric.' };

  try {
    await api.post(`/projects/${projectId}/monitoring/alerts/rules`, {
      name: input.name.trim(),
      metric: input.metric.trim(),
      condition: input.condition,
      threshold: Number(input.threshold),
      severity: input.severity,
      channels: input.channels,
      enabled: true,
    });
    revalidatePath(`/projects/${projectId}/monitoring`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The rule could not be made.',
    };
  }
}

export async function deleteAlertRuleAction(
  projectId: string,
  ruleId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/monitoring/alerts/rules/${ruleId}`);
    revalidatePath(`/projects/${projectId}/monitoring`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The rule could not be removed.',
    };
  }
}

export async function createNotificationChannelAction(
  projectId: string,
  input: { name: string; type: 'email' | 'slack' | 'webhook'; config: Record<string, string> },
): Promise<{ ok?: boolean; error?: string }> {
  if (!input.name.trim()) return { error: 'The channel needs a name.' };

  try {
    await api.post(`/projects/${projectId}/monitoring/channels`, {
      name: input.name.trim(),
      type: input.type,
      config: input.config,
    });
    revalidatePath(`/projects/${projectId}/monitoring`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The channel could not be made.',
    };
  }
}

export async function deleteNotificationChannelAction(
  projectId: string,
  channelId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/monitoring/channels/${channelId}`);
    revalidatePath(`/projects/${projectId}/monitoring`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The channel could not be removed.',
    };
  }
}
