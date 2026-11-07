import type { DocPage } from './types';

export const configuration: DocPage = {
  slug: 'configuration',
  title: 'Configuration',
  description: 'The variables a project carries, and the ones a deployment adds.',
  group: 'Build',
  blocks: [
    {
      paragraphs: [
        'A project holds variables. A deployment holds variables that win over the project’s, and the application sees the result.',
        'Everything is stored encrypted, and the console masks the values.',
      ],
    },
    {
      heading: 'The project’s variables',
      paragraphs: [
        'They are in the project’s settings, under Environment. The owner and the admins may read the value; everybody else sees that it is there and nothing more.',
      ],
      code: [
        {
          label: 'The API',
          code: `GET  /api/v1/projects/:id/env-vars
PUT  /api/v1/projects/:id/env-vars
DELETE /api/v1/projects/:id/env-vars/:key`,
        },
      ],
    },
    {
      heading: 'The build configuration',
      paragraphs: [
        'Some settings belong to the project as a whole rather than to one deployment: how long the platform waits for an application to start, and which variables an application must have before it is built.',
      ],
      table: {
        head: ['Setting', 'What it is'],
        rows: [
          ['buildTarget', 'What is built — the thing the platform packs'],
          ['startupTimeoutSeconds', 'How long the platform waits for the application to answer'],
          ['requiredEnvVars', 'The variables a deployment must have before it is built'],
        ],
      },
    },
    {
      heading: 'A new project’s variables',
      paragraphs: [
        'A project that has a database gets its connection written into its environment for you: the URL, the host, the port, the name, the user and the password.',
        'The application reads them as they are — the platform does not rewrite them into a shape of its own.',
      ],
      code: [
        {
          label: 'What an application sees',
          code: `DATABASE_URL=postgresql://…@pgbouncer:6432/proj_…?sslmode=require
DB_HOST=pgbouncer
DB_PORT=6432
DB_NAME=proj_…
DB_USER=proj_…
DB_PASSWORD=…`,
        },
      ],
    },
    {
      heading: 'Secrets in a deployment',
      paragraphs: [
        'The variables set on the deployment are the project’s, with the deployment’s on top. A value that is a secret stays masked everywhere except where it is used.',
      ],
      note: {
        kind: 'warning',
        title: 'A value in a repository is a published value',
        body: 'Variables that hold a secret belong in the project’s environment or in the deployment’s — not in the repository.',
      },
    },
  ],
};
