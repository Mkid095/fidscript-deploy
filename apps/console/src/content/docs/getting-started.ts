import type { DocPage } from './types';

export const gettingStarted: DocPage = {
  slug: 'getting-started',
  title: 'Getting started',
  description:
    'What the platform is, what the three levels are, and how to hold your first project.',
  group: 'Start',
  blocks: [
    {
      paragraphs: [
        'FIDScript is one machine that runs the parts of an application that are not the application: the data, the mail, the messages, the packages, and the observability.',
        'You bring the code. It runs it, keeps it, and gives it a place on the internet.',
      ],
    },
    {
      heading: 'The three levels',
      paragraphs: [
        'Everything in the product is at one of three levels, and a screen belongs to exactly one of them.',
      ],
      table: {
        head: ['Level', 'Where it lives', 'The question it answers'],
        rows: [
          ['Platform', '/overview · /projects · /settings', 'What is installed, and who am I?'],
          ['Project', '/projects/[id]/…', 'What does this project do, and what does it have?'],
          ['Application', '/settings/applications', 'Is the tooling this platform relies on healthy?'],
        ],
      },
    },
    {
      heading: 'Your first project',
      paragraphs: [
        'A project is a workspace: its members, its settings, and the capabilities switched on for it.',
        'The first thing you are asked is what the project is for — because everything the project’s menu shows afterwards is derived from that answer.',
      ],
      list: [
        'Backend as a service — the data, the users, the files and the realtime for your application.',
        'Deployments — build and run your application from a repository.',
        'Both — a backend, and the application that runs on it.',
      ],
      note: {
        kind: 'note',
        title: 'The shape is not a dead end',
        body: 'It is changeable at any time, in the project’s settings. Changing it changes the menu, and nothing is deleted.',
      },
    },
    {
      heading: 'The menu is derived',
      paragraphs: [
        'The project’s sidebar is not a fixed list of items. It is built from what the project actually has, what its capabilities are switched on for, and what you are allowed to use.',
        'So a project with no functions has no "Functions" item — and the overview offers to create one instead.',
      ],
    },
    {
      heading: 'Signing in',
      paragraphs: [
        'Your session is held in a cookie that no script on the page can read. When the account has a second factor, the sign-in asks for it before it lets you in.',
      ],
      code: [
        {
          label: 'From a terminal',
          code: `npx @fidscript-deploy/cli login <your API key>
npx @fidscript-deploy/cli whoami`,
        },
      ],
    },
  ],
};
