/**
 * DomainsHost part 3 — Templates + Webhooks.
 * Continuation of the host interface split.
 */

export interface DomainsHostPart3 {
  // Templates
  listTemplates(options?: { category?: string; popularOnly?: boolean }): Promise<{
    templates: Array<{
      id: string; name: string; description: string; icon: string; category: string;
      capabilities: Record<string, boolean>; types: string[];
      records: Array<{ type: string; name: string; valueTemplate: string; ttl: number; priority?: number }>;
      sslEnabled: boolean; wildcardEnabled: boolean; popular: boolean;
    }>;
  }>;
  getTemplate(id: string): Promise<{
    id: string; name: string; description: string; icon: string; category: string;
    capabilities: Record<string, boolean>; types: string[];
    records: Array<{ type: string; name: string; valueTemplate: string; ttl: number; priority?: number }>;
    sslEnabled: boolean; wildcardEnabled: boolean;
  }>;

  // Webhooks
  listWebhooks(projectId: string, domainId: string): Promise<{
    webhooks: Array<{
      id: string; url: string; events: string[]; enabled: boolean;
      lastDeliveryAt: string | null; lastDeliveryOk: boolean | null;
      deliveryCount: number; failureCount: number;
    }>;
  }>;
  createWebhook(projectId: string, domainId: string, options: {
    url: string; secret?: string; events?: string[]; enabled?: boolean;
  }): Promise<{ id: string; url: string; enabled: boolean }>;
  updateWebhook(projectId: string, domainId: string, webhookId: string, updates: {
    url?: string; events?: string[]; enabled?: boolean; secret?: string;
  }): Promise<{ success: boolean }>;
  deleteWebhook(projectId: string, domainId: string, webhookId: string): Promise<{ success: boolean }>;
  testWebhook(projectId: string, domainId: string, webhookId: string): Promise<{
    success: boolean; error?: string; deliveredAt: string;
  }>;
}