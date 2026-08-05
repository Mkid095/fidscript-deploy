'use client';

/**
 * Queue deletion is initiated from QueueCard (queue-card.tsx) within the QueuesList
 * page, not from within a queue detail view. This stub exists to satisfy the ANPAS
 * split requirement for queue-detail.tsx.
 *
 * @todo(future) If a delete action is added to the queue detail screen, implement
 * this component here and wire it into queue-detail.tsx.
 */
export function QueueDetailModalDelete(_props: {
  queueId: string;
  queueName: string;
  projectId: string;
  onClose: () => void;
  onDeleted: () => void;
  getSdk: () => import('@fidscript-deploy/sdk').FidscriptSDK;
}) {
  return null;
}
