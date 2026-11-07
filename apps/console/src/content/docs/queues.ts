import type { DocPage } from './types';

export const queues: DocPage = {
  slug: 'queues',
  title: 'Queues',
  description: 'Background work that outlives a request.',
  group: 'Platform',
  blocks: [
    {
      paragraphs: [
        'A queue holds messages until something is ready to take them. It is how work that takes longer than a request is carried out.',
        'The queues are the platform’s NATS bus, and they are a capability: a project uses them when they are switched on for it.',
      ],
    },
    {
      heading: 'The life of a message',
      list: [
        'A message is published to a queue.',
        'A consumer takes it, and works on it.',
        'It is acknowledged when the work is done — or it goes back, when it is not.',
      ],
      note: {
        kind: 'note',
        title: 'Nothing is lost',
        body: 'A message that is not acknowledged is redelivered. A worker that dies mid-message does not lose it.',
      },
    },
    {
      heading: 'The API',
      code: [
        {
          label: 'The endpoints',
          code: `GET  /api/v1/projects/:id/queues
POST /api/v1/projects/:id/queues
POST /api/v1/projects/:id/queues/:queueId/messages
POST /api/v1/projects/:id/queues/:queueId/consume
POST /api/v1/projects/:id/queues/:queueId/ack
GET  /api/v1/projects/:id/queues/:queueId/stats`,
        },
      ],
    },
    {
      heading: 'From a terminal',
      code: [
        {
          label: 'The CLI',
          code: `npx @fidscript-deploy/cli queues list -p <project>
npx @fidscript-deploy/cli queues read -p <project> --queue <queue>`,
        },
      ],
    },
  ],
};
