/**
 * Email MCP tools — exposes email operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const emailTools: Tool[] = [
  {
    name: 'email_send',
    description: 'Send a transactional email. Returns the message ID and queue status.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        to: { type: 'string', description: 'Recipient email address' },
        from: { type: 'string', description: 'Sender email address (optional, uses project default if omitted)' },
        replyTo: { type: 'string', description: 'Reply-To address (optional)' },
        subject: { type: 'string', description: 'Email subject line' },
        text: { type: 'string', description: 'Plain text body' },
        html: { type: 'string', description: 'HTML body' },
      },
      required: ['projectId', 'to', 'subject'],
    },
  },
  {
    name: 'email_send_template',
    description: 'Send an email using a pre-defined template with variable interpolation.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        templateId: { type: 'string', description: 'Template ID' },
        to: { type: 'string', description: 'Recipient email address' },
        from: { type: 'string', description: 'Override sender address (optional)' },
        replyTo: { type: 'string', description: 'Reply-To address (optional)' },
        variables: { type: 'object', description: 'Template variables as key-value pairs' },
      },
      required: ['projectId', 'templateId', 'to'],
    },
  },
  {
    name: 'email_inbox',
    description: 'List recent email messages in a project inbox.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Max messages to return (default 20)' },
        unread: { type: 'boolean', description: 'Only show unread messages' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'email_status',
    description: 'Get delivery status and attempt history for a specific email message.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        messageId: { type: 'string', description: 'Message ID' },
      },
      required: ['projectId', 'messageId'],
    },
  },
  {
    name: 'email_templates',
    description: 'List all email templates available in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'email_domains',
    description: 'List all email domains registered in a project with DNS verification status.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'email_analytics',
    description: 'Get email delivery analytics — delivery rate, bounce rate, open/click rates, status breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        days: { type: 'number', description: 'Number of days to analyze (default 30)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'email_suppressions',
    description: 'List suppressed email addresses (bounces, complaints, manual blocks) for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
];

export async function handleEmailTool(
  name: string,
  args: Record<string, unknown>,
  sdk: FidscriptSDK,
): Promise<unknown> {
  switch (name) {
    case 'email_send':
      return sdk.email.send(args.projectId as string, {
        to: args.to as string,
        from: args.from as string | undefined,
        replyTo: args.replyTo as string | undefined,
        subject: args.subject as string,
        text: args.text as string | undefined,
        html: args.html as string | undefined,
      });

    case 'email_send_template':
      return sdk.email.sendTemplated(
        args.projectId as string,
        args.templateId as string,
        {
          to: args.to as string,
          from: args.from as string | undefined,
          replyTo: args.replyTo as string | undefined,
          variables: (args.variables as Record<string, string>) ?? {},
        },
      );

    case 'email_inbox':
      return sdk.email.listMessages(args.projectId as string, {
        limit: (args.limit as number) ?? 20,
        unread: args.unread as boolean | undefined,
      });

    case 'email_status':
      return sdk.email.getMessageStatus(
        args.projectId as string,
        args.messageId as string,
      );

    case 'email_templates':
      return sdk.email.listTemplates(args.projectId as string);

    case 'email_domains':
      return sdk.email.listDomains(args.projectId as string);

    case 'email_analytics':
      return sdk.email.getDeliveryOverview(
        args.projectId as string,
        (args.days as number) ?? 30,
      );

    case 'email_suppressions':
      return sdk.email.listSuppressions(args.projectId as string);

    default:
      throw new Error(`Unknown email tool: ${name}`);
  }
}
