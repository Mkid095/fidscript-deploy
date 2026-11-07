import type { DocPage } from './types';

export const domains: DocPage = {
  slug: 'domains',
  title: 'Domains & TLS',
  description: 'Where the project answers, and the DNS that makes it answer.',
  group: 'Build',
  blocks: [
    {
      paragraphs: [
        'A domain is where a deployment answers. The platform holds the certificate, renews it, and checks that the domain still points at it.',
      ],
    },
    {
      heading: 'Two ways to point a domain',
      list: [
        'By hand — the platform shows the records, with their status, and you set them at your registrar.',
        'By the platform — you connect the account that holds the domain, and the platform finds the zone, writes the records and checks them.',
      ],
    },
    {
      heading: 'Connecting your DNS account',
      paragraphs: [
        'A Cloudflare API token is the connection. It needs Zone:Read and DNS:Edit for the zone, and it is checked before it is kept — a token that cannot read the zones is refused, so the connection never pretends.',
        'It is stored encrypted and is only used for this project’s domains.',
      ],
      code: [
        {
          label: 'The API',
          code: `POST /api/v1/projects/:id/domains/connect-cloudflare
{ "apiToken": "…" }

GET  /api/v1/projects/:id/domains/connection`,
        },
      ],
      note: {
        kind: 'note',
        title: 'When the domain is not in the account',
        body: 'The platform says so plainly — the zone is not in the connected account — rather than reporting a failure and leaving you guessing.',
      },
    },
    {
      heading: 'The records',
      table: {
        head: ['Record', 'When', 'What it does'],
        rows: [
          ['CNAME', 'A subdomain', 'Points the name at the deployment'],
          ['A', 'The root of a domain', 'Points the name at the server'],
          ['TXT', 'Always', 'Proves the domain is yours'],
          ['MX', 'For mail', 'Routes the mail to the platform'],
          ['SPF', 'For mail', 'Says which servers may send for the domain'],
        ],
      },
    },
    {
      heading: 'The certificate',
      paragraphs: [
        'TLS is issued and renewed by the platform. The status of the certificate is on the domain, and it says what to fix if it cannot be issued.',
      ],
    },
    {
      heading: 'The API',
      code: [
        {
          label: 'The endpoints',
          code: `GET  /api/v1/projects/:id/domains
POST /api/v1/projects/:id/domains
POST /api/v1/projects/:id/domains/:domainId/verify
POST /api/v1/projects/:id/domains/:domainId/dns-records/auto-configure
GET  /api/v1/projects/:id/domains/:domainId/dns-records`,
        },
      ],
    },
  ],
};
