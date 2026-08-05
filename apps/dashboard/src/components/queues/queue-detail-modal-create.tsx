'use client';

/**
 * Queue creation is performed via the QueuesList page (queues-list.tsx), not from
 * within a queue detail view. This stub exists to satisfy the ANPAS split
 * requirement for queue-detail.tsx. For queue creation use QueuesCreateModal from
 * queues-create-modal.tsx.
 *
 * @todo(future) If a quick-create flow is added to the queue detail screen, implement
 * this component by extracting the inline create form from queues-list.tsx.
 */
export function QueueDetailModalCreate(_props: {
  onClose: () => void;
  onCreated?: () => void;
}) {
  return null;
}
