'use client';

import { useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { QueueMessage } from './use-queues-realtime';
import type { MessageTab } from './use-queues-realtime';

interface UseQueueDetailHandlersOptions {
  projectId: string | null;
  queueId: string;
  selected: Set<string>;
  getSdk: () => FidscriptSDK;
  loadQueue: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<QueueMessage[]>>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  setActiveTab: React.Dispatch<React.SetStateAction<MessageTab>>;
  setConsuming: React.Dispatch<React.SetStateAction<boolean>>;
  setActionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeadLetter: (reason?: string) => Promise<void>;
}

export function useQueueDetailHandlers({
  projectId,
  queueId,
  selected,
  getSdk,
  loadQueue,
  setMessages,
  setSelected,
  setActiveTab,
  setConsuming,
  setActionLoading,
}: UseQueueDetailHandlersOptions) {
  const handleTabChange = useCallback(async (tab: MessageTab) => {
    setActiveTab(tab);
    setSelected(new Set());
    const sdk = getSdk();
    if (!projectId) return;
    try {
      const res = await sdk.queues.getMessages(projectId, queueId, { status: tab, limit: 50 });
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, [getSdk, projectId, queueId, setActiveTab, setSelected, setMessages]);

  const handleConsume = useCallback(async () => {
    const sdk = getSdk();
    if (!projectId) return;
    setConsuming(true);
    try {
      const msgs = await sdk.queues.consume(projectId, queueId, 10, 30);
      setActiveTab('pending');
      setMessages(msgs);
      await loadQueue();
    } catch (err) {
      console.error('Failed to consume messages', err);
    } finally {
      setConsuming(false);
    }
  }, [getSdk, projectId, queueId, setConsuming, setActiveTab, setMessages, loadQueue]);

  const handleAck = useCallback(async () => {
    if (!projectId || selected.size === 0) return;
    const sdk = getSdk();
    setActionLoading(true);
    try {
      await sdk.queues.ack(projectId, queueId, Array.from(selected));
      setMessages((prev) => prev.filter((m) => !selected.has(m.id)));
      setSelected(new Set());
      await loadQueue();
    } catch (err) {
      console.error('Failed to ack messages', err);
    } finally {
      setActionLoading(false);
    }
  }, [getSdk, projectId, queueId, selected, setActionLoading, setMessages, setSelected, loadQueue]);

  const handleRetry = useCallback(async () => {
    if (!projectId || selected.size === 0) return;
    const sdk = getSdk();
    setActionLoading(true);
    try {
      await sdk.queues.retry(projectId, queueId, Array.from(selected));
      setMessages((prev) =>
        prev.map((m) => selected.has(m.id) ? { ...m, status: 'pending' as const, attempts: 0 } : m),
      );
      setSelected(new Set());
      await loadQueue();
    } catch (err) {
      console.error('Failed to retry messages', err);
    } finally {
      setActionLoading(false);
    }
  }, [getSdk, projectId, queueId, selected, setActionLoading, setMessages, setSelected, loadQueue]);

  const handleDeadLetter = useCallback(async (reason?: string) => {
    if (!projectId || selected.size === 0) return;
    const sdk = getSdk();
    setActionLoading(true);
    try {
      await sdk.queues.deadLetter(projectId, queueId, Array.from(selected), reason);
      setMessages((prev) => prev.filter((m) => !selected.has(m.id)));
      setSelected(new Set());
      await loadQueue();
    } catch (err) {
      console.error('Failed to dead-letter messages', err);
    } finally {
      setActionLoading(false);
    }
  }, [getSdk, projectId, queueId, selected, setActionLoading, setMessages, setSelected, loadQueue]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [setSelected]);

  const toggleSelectAll = useCallback((allMessages: QueueMessage[]) => {
    setSelected((prev) =>
      prev.size === allMessages.length ? new Set() : new Set(allMessages.map((m) => m.id)),
    );
  }, [setSelected]);

  return { handleTabChange, handleConsume, handleAck, handleRetry, handleDeadLetter, toggleSelect, toggleSelectAll };
}
