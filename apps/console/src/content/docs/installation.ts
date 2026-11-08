import type { DocPage } from './types';

export const installation: DocPage = {
  slug: 'installation',
  title: 'Installation',
  description:
    'The one wizard, from an empty machine to a platform that serves.',
  group: 'Start',
  blocks: [
    {
      paragraphs: [
        'The platform is installed once, through one wizard. It is at /setup, and it is the same wizard on every machine.',
      ],
    },
    {
      heading: 'The steps',
      list: [
        'Discover — what the server already knows about itself: its address, Docker, its proxy, its certificate, and whether Cloudflare is connected.',
        'Validate — the checks that have to pass before the platform can be written: DNS, the proxy, the certificate, the email and the health.',
        'Account — the administrator’s address, and the password they will sign in with.',
        'Applications — what this platform will provide. This is the only time they are offered as a choice.',
        'Install — the live progress, one row per application.',
        'Verify — every application, and what to fix if one failed.',
        'Done — a screen you can land on, which says it worked.',
      ],
    },
    {
      heading: 'The setup token',
      paragraphs: [
        'Before the platform is configured, the setup routes are open to anybody who can reach them — so they are guarded by a token.',
        'The installer generates it, prints it once, and you type it into the wizard. It is the shared secret that says you are the one doing the setup.',
      ],
      note: {
        kind: 'note',
        title: 'A configured platform has no setup',
        body: 'Once the platform is configured, the setup routes are closed and the wizard says so. A re-configuration is an operator’s act, through the settings.',
      },
    },
    {
      heading: 'What the applications are',
      paragraphs: [
        'The applications are products the operator installs once. Each one is either linked out to, wrapped, or both — the test is whether the application already has a correct interface for that job.',
      ],
      table: {
        head: ['Application', 'What it powers', 'How the platform treats it'],
        rows: [
          [
            'Instant BaaS',
            'The realtime backend',
            'Link out — FIDScript provisions the app and deep-links to its console',
          ],
          [
            'Deployment engine',
            'Git push to a running app',
            'Native — it is the platform’s own',
          ],
          [
            'Stalwart',
            'Mail on your own domain',
            'Wrapped — the mail server stays invisible',
          ],
          [
            'Verdaccio',
            'A private npm registry',
            'Wrapped — the console is the only face of it',
          ],
          [
            'Viventure',
            'WhatsApp channels',
            'Both — instances inside the project, the console for the rest',
          ],
          [
            'Observability',
            'Metrics, logs, dashboards',
            'Wrapped — Grafana for the power users',
          ],
          ['App runtime', 'The image registry', 'Invisible — health only'],
        ],
      },
    },
    {
      heading: 'The applications later',
      paragraphs: [
        'After the wizard, the applications live in Settings → Applications. Adding one there makes its capability available to every project.',
        'If an application fails to install, the wizard shows the reason and a retry for that application alone. It does not block the rest.',
      ],
    },
  ],
};
