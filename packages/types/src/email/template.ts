/**
 * Email template types — shared across API, SDK, and MCP contracts.
 */

export interface TemplateVariable {
  name: string;
  required?: boolean;
  default?: string;
}

/** A transactional email template. */
export interface EmailTemplate {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  fromAddress?: string | null;
  fromName?: string | null;
  subject: string;
  htmlBody?: string | null;
  textBody?: string | null;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Template preview rendered with dummy variables. */
export interface TemplatePreview {
  subject: string;
  html: string;
  text: string;
}

/** Result of a batch send operation. */
export interface BatchSendResult {
  total: number;
  sent: number;
  failed: number;
  results: BatchSendResultItem[];
}

export interface BatchSendResultItem {
  messageId: string;
  to: string;
  status: string;
  error?: string;
}
