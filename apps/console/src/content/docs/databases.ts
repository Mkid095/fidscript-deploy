import type { DocPage } from './types';

export const databases: DocPage = {
  slug: 'databases',
  title: 'Databases',
  description: 'The managed Postgres a project holds, and how an application reaches it.',
  group: 'Build',
  blocks: [
    {
      paragraphs: [
        'A project can have a managed Postgres. It is created for the project, and its connection is written into the project’s environment.',
        'It is an explicit capability: the platform’s own data lives in the platform’s own database, and this one is yours.',
      ],
    },
    {
      heading: 'What the platform creates',
      table: {
        head: ['Thing', 'What it is'],
        rows: [
          ['The database', 'A Postgres database, named after the project'],
          ['The user', 'A user that may use only that database'],
          ['The variables', 'DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD'],
        ],
      },
      note: {
        kind: 'note',
        title: 'The connection goes through the pooler',
        body: 'DB_PORT is the pooler’s port, not Postgres’s. The pooler is what keeps a burst of connections from taking the database down.',
      },
    },
    {
      heading: 'Reading it in an application',
      code: [
        {
          label: 'Node',
          code: `import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query('select now()');
await pool.end();`,
        },
      ],
    },
    {
      heading: 'The API',
      code: [
        {
          label: 'The endpoints',
          code: `GET    /api/v1/projects/:id/databases
GET    /api/v1/projects/:id/databases/:databaseId
POST   /api/v1/projects/:id/databases`,
        },
      ],
    },
    {
      heading: 'Backups',
      paragraphs: [
        'A backup can be started and its result watched. The platform writes a backup before it changes anything it cannot undo.',
      ],
      code: [
        {
          label: 'The CLI',
          code: `npx @fidscript-deploy/cli databases list -p <project>
npx @fidscript-deploy/cli databases backup -p <project> --id <database>`,
        },
      ],
    },
    {
      heading: 'The data of an application',
      paragraphs: [
        'An application that needs realtime data, permissions and files does not need this — it needs the project’s backend, where Instant holds all of that.',
        'This is for the cases where a raw Postgres connection is what you actually want.',
      ],
    },
  ],
};
