import type { DocPage } from './types';

export const monitoring: DocPage = {
  slug: 'monitoring',
  title: 'Monitoring',
  description: 'The metrics, the logs, and the alerts.',
  group: 'Operate',
  blocks: [
    {
      paragraphs: [
        'The platform collects the metrics of everything it runs: the containers, the databases, the requests.',
        'The console reads them per project, so what is on the screen is the project’s own.',
      ],
    },
    {
      heading: 'Metrics',
      paragraphs: [
        'CPU, memory, network, the request rate and the error rate of each deployment — and the health of the project’s database, when it has one.',
      ],
    },
    {
      heading: 'Logs',
      paragraphs: [
        'Every line the platform and the applications write is kept, and the Logs screen reads them back: one stream across the project’s deployments and its capabilities, filtered by source and by level.',
      ],
      code: [
        {
          label: 'The API',
          code: `GET /api/v1/projects/:id/monitoring/metrics
GET /api/v1/projects/:id/monitoring/metrics/stats
GET /api/v1/projects/:id/monitoring/alerts
GET /api/v1/projects/:id/logs
GET /api/v1/projects/:id/logs/stats`,
        },
      ],
    },
    {
      heading: 'Alerts',
      paragraphs: [
        'An alert is a rule about a number — and where the person hears about it.',
        'The notification channels are email, WhatsApp and a webhook, and they are the project’s own.',
      ],
    },
    {
      heading: 'Grafana',
      paragraphs: [
        'The platform’s dashboards have the whole picture, and they are where the power users go. The Monitoring screen links straight to them.',
      ],
      note: {
        kind: 'note',
        title: 'Every number is read, not remembered',
        body: 'A number the platform cannot know reads "Not available". It never reads zero it did not read.',
      },
    },
  ],
};
