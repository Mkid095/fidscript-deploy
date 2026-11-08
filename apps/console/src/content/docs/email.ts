import type { DocPage } from './types';

export const email: DocPage = {
  slug: 'email',
  title: 'Email',
  description:
    'Mail on your own domain — domains, records, mailboxes, aliases and sending.',
  group: 'Build',
  blocks: [
    {
      paragraphs: [
        'The mail server is behind all of this and is never named. The project has domains, mailboxes and aliases, and that is the whole of it.',
      ],
    },
    {
      heading: 'The first domain',
      paragraphs: [
        'Adding a mail domain answers with the records to set: a TXT record that proves you own the domain, and an MX record that routes the mail.',
        'Set them, and then check the records. The domain goes from pending to verified when they are right.',
      ],
      table: {
        head: ['Record', 'What it is for'],
        rows: [
          ['TXT', 'Proves you own the domain'],
          ['MX', 'Routes the mail to the platform'],
          ['SPF', 'Says which servers may send for the domain'],
          ['DKIM', 'Signs the messages, so they are not forged'],
          ['DMARC', 'Says what to do when a message fails'],
        ],
      },
      note: {
        kind: 'note',
        title: 'The platform can write them for you',
        body: 'Connect the account that holds the domain — a Cloudflare API token — and the platform writes the records itself. See Domains.',
      },
    },
    {
      heading: 'Mailboxes',
      paragraphs: [
        'A mailbox is an address the mail arrives at, and a place it is read. It belongs to a domain, so the domain comes first.',
        'The password is set once and never shown again — the platform keeps only its hash.',
      ],
    },
    {
      heading: 'Aliases',
      paragraphs: [
        'An alias is an address that forwards somewhere else: to a mailbox, to another address, or to a webhook. It is how a project answers at an address it does not read.',
      ],
    },
    {
      heading: 'Sending',
      paragraphs: [
        'A key sends mail on the project’s behalf. It is made in the project’s Email screen, and it is shown once.',
        'The same key is used from a script, with the SMTP or the JMAP address the project shows.',
      ],
      code: [
        {
          label: 'The API',
          code: `POST /api/v1/projects/:id/email/send
{
  "from": "hello@store.example.com",
  "to": "someone@example.com",
  "subject": "Your order",
  "text": "It is on its way."
}`,
        },
      ],
    },
    {
      heading: 'Deliverability',
      paragraphs: [
        'The platform counts what it sent and what happened to it: delivered, opened, clicked, bounced.',
        'A message that bounces is a message that did not arrive. The count is how you find out.',
      ],
    },
    {
      heading: 'The API',
      code: [
        {
          label: 'The endpoints',
          code: `GET  /api/v1/projects/:id/email/status
GET  /api/v1/projects/:id/email/domains
POST /api/v1/projects/:id/email/domains
POST /api/v1/projects/:id/email/domains/:domainId/verify
GET  /api/v1/projects/:id/email/mailboxes
GET  /api/v1/projects/:id/email/aliases
GET  /api/v1/projects/:id/email/messages`,
        },
      ],
    },
  ],
};
