'use client';

import { PublishMessageModal } from './publish-message-modal';
import { PurgeQueueModal } from './purge-queue-modal';
import { QueueDetailModalCreate } from './queue-detail-modal-create';
import { QueueDetailModalDelete } from './queue-detail-modal-delete';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Queue } from './use-queues-realtime';

interface QueueDetailModalsProps {
  queueId: string;
  queue: Queue | null;
  projectId: string | null;
  showPublish: boolean;
  showPurge: boolean;
  getSdk: () => FidscriptSDK;
  onClosePublish: () => void;
  onClosePurge: () => void;
  onPublished: () => void;
  onPurged: () => void;
}

export function QueueDetailModals({
  queueId,
  queue,
  projectId,
  showPublish,
  showPurge,
  getSdk,
  onClosePublish,
  onClosePurge,
  onPublished,
  onPurged,
}: QueueDetailModalsProps) {
  return (
    <>
      {showPublish && queue && (
        <PublishMessageModal
          queueId={queueId}
          queueName={queue.name}
          projectId={projectId!}
          getSdk={getSdk}
          onClose={onClosePublish}
          onPublished={onPublished}
        />
      )}

      {showPurge && queue && (
        <PurgeQueueModal
          queueId={queueId}
          queueName={queue.name}
          projectId={projectId!}
          getSdk={getSdk}
          onClose={onClosePurge}
          onPurged={onPurged}
        />
      )}

      <QueueDetailModalCreate onClose={() => {}} />
      <QueueDetailModalDelete
        queueId={queueId}
        queueName={queue?.name ?? ''}
        projectId={projectId!}
        onClose={() => {}}
        onDeleted={() => {}}
        getSdk={getSdk}
      />
    </>
  );
}
