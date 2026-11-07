import type { DocPage } from './types';

export const scheduler: DocPage = {
  slug: 'scheduler',
  title: 'Scheduler',
  description: 'Work that runs on a schedule.',
  group: 'Platform',
  blocks: [
    {
      paragraphs: [
        'A schedule is a rule that runs something at a time you write down: every minute, every hour, on the first of the month.',
        'The job it runs is usually a function, and the job that runs it is the same one that would run it by hand.',
      ],
    },
    {
      heading: 'What a schedule holds',
      table: {
        head: ['Setting', 'What it is'],
        rows: [
          ['name', 'What the schedule is called'],
          ['schedule', 'When it runs — a cron expression'],
          ['target', 'What it runs — usually a function'],
          ['timezone', 'Which clock the schedule is read in'],
        ],
      },
    },
    {
      heading: 'Every run is recorded',
      paragraphs: [
        'A schedule that runs and does not, is a schedule you want to know about. Every run is recorded with how long it took and whether it worked.',
        'A schedule that is already running is not run twice — the platform holds one lease at a time.',
      ],
      code: [
        {
          label: 'The CLI',
          code: `npx @fidscript-deploy/cli cron list -p <project>
npx @fidscript-deploy/cli cron create -p <project> --name nightly --schedule "0 2 * * *"`,
        },
      ],
    },
    {
      heading: 'The API',
      code: [
        {
          label: 'The endpoints',
          code: `GET  /api/v1/projects/:id/cron
POST /api/v1/projects/:id/cron
PATCH /api/v1/projects/:id/cron/:cronId
DELETE /api/v1/projects/:id/cron/:cronId`,
        },
      ],
    },
  ],
};
