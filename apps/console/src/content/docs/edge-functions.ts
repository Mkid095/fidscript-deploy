import type { DocPage } from './types';

export const edgeFunctions: DocPage = {
  slug: 'edge-functions',
  title: 'Edge functions',
  description:
    'The code the platform runs for you — a webhook, a job, a handler.',
  group: 'Build',
  blocks: [
    {
      paragraphs: [
        'A function is a piece of code the platform runs. It is not a top-level thing in the menu — it belongs to a project, and it appears in the sidebar only when the project has one.',
      ],
    },
    {
      heading: 'What a function is made of',
      table: {
        head: ['Setting', 'What it is'],
        rows: [
          ['name', 'What it is called, and how it is addressed'],
          ['runtime', 'What runs it'],
          ['entryPoint', 'The file and the export the platform calls'],
          ['memoryMb', 'How much memory it may use'],
          ['timeoutSeconds', 'How long it may run'],
          ['envVars', 'The variables it sees'],
        ],
      },
    },
    {
      heading: 'Calling one',
      paragraphs: [
        'A function is invoked, and it answers. The invocation is recorded, and the log of it is kept.',
      ],
      code: [
        {
          label: 'The API',
          code: `GET    /api/v1/projects/:id/functions
POST   /api/v1/projects/:id/functions
POST   /api/v1/projects/:id/functions/:functionId/deploy
POST   /api/v1/projects/:id/functions/:functionId/invoke`,
        },
      ],
    },
    {
      heading: 'The logs',
      paragraphs: [
        'Every invocation is logged: how long it took, whether it worked, and what it said.',
        'The project’s Logs screen is where they are read.',
      ],
    },
  ],
};
