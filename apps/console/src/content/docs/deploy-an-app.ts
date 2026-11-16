import type { DocPage } from './types';

export const deployAnApp: DocPage = {
  slug: 'deploy-an-app',
  title: 'Deploy an app',
  description: 'From a repository to a running application, in four steps.',
  group: 'Build',
  blocks: [
    {
      paragraphs: [
        'A deployment is a build of your application, running and reachable. The wizard takes you from a repository to a live URL in four steps.',
      ],
    },
    {
      heading: '1 · Source',
      paragraphs: [
        'The repositories of your connected GitHub account, when there is one, and a plain address when there is not — a public repository needs no connection at all.',
        'The branch is the one it deploys, and the address is filled in for you.',
      ],
      code: [
        {
          label: 'The API',
          code: `POST /api/v1/projects/:id/deployments
{
  "source": { "type": "git", "git": { "url": "https://github.com/you/app", "branch": "main" } }
}`,
        },
      ],
    },
    {
      heading: '2 · Detect',
      paragraphs: [
        'The platform clones the repository shallowly and reads it. What it finds — the framework, the build command, the port — is the build plan, and it is shown before anything is committed.',
      ],
      note: {
        kind: 'note',
        title: 'The plan is the platform’s, not the console’s guess',
        body: 'The console shows what was detected: Next.js 15.5.29, `tsc --noEmit && next build`, port 3000.',
      },
    },
    {
      heading: '3 · Configure',
      paragraphs: [
        'The variables the deployment carries, and the subdomain it answers on. The project’s own variables are inherited; the ones set here win.',
        'Secrets are masked. A secret is not something to leave sitting on a screen, and it is not something a screenshot should carry.',
      ],
    },
    {
      heading: '4 · Deploy',
      paragraphs: [
        'The build runs, and the page follows it. The log is the platform’s own — what it saw, not a summary of it.',
        'When the build fails, the previous release keeps running, and the log says which step failed.',
      ],
    },
    {
      heading: 'After it is live',
      list: [
        'The URL it answers on, and the release it is running.',
        'A domain of your own — see Domains.',
        'Deploy on every push — the platform registers the webhook for you when the source is a GitHub repository.',
        'Roll back to the release before it, if this one was a mistake.',
      ],
    },
    {
      heading: 'From a terminal',
      code: [
        {
          label: 'The CLI',
          code: `npx @fidscript-deploy/cli deployments list -p <project>
npx @fidscript-deploy/cli deployments create -p <project> --url https://github.com/you/app`,
        },
      ],
    },
  ],
};
