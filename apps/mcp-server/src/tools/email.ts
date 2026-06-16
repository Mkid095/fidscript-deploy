export const emailTools = [
  {
    name: 'send_email',
    description: 'Send an email',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, to: { type: 'string' }, subject: { type: 'string' }, text: { type: 'string' }, html: { type: 'string' } },
      required: ['projectId', 'to', 'subject'],
    },
  },
  {
    name: 'list_mailboxes',
    description: 'List email mailboxes',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'create_mailbox',
    description: 'Create email mailbox',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' } },
      required: ['projectId', 'email'],
    },
  },
  {
    name: 'delete_mailbox',
    description: 'Delete mailbox',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, mailboxId: { type: 'string' } },
      required: ['projectId', 'mailboxId'],
    },
  },
  {
    name: 'list_email_aliases',
    description: 'List email aliases',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'create_email_alias',
    description: 'Create email alias',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, alias: { type: 'string' }, forwardsTo: { type: 'array', items: { type: 'string' } } },
      required: ['projectId', 'alias', 'forwardsTo'],
    },
  },
  {
    name: 'verify_email_domain',
    description: 'Verify domain for email (DKIM/SPF/DMARC)',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, domain: { type: 'string' } },
      required: ['projectId', 'domain'],
    },
  },
  {
    name: 'get_email_logs',
    description: 'Get email logs',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, limit: { type: 'number' } },
      required: ['projectId'],
    },
  },
];