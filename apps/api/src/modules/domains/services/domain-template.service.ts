import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface DomainTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'deployment' | 'email' | 'saas' | 'marketing' | 'api';
  capabilities: {
    deployment: boolean;
    email: boolean;
    inboundEmail: boolean;
    tracking: boolean;
    api: boolean;
    redirect: boolean;
    sandbox: boolean;
  };
  types: string[];
  records: Array<{
    type: string;
    name: string;
    valueTemplate: string; // placeholder like "{server_ip}" or "{deployment_url}"
    ttl: number;
    priority?: number;
    source: 'deployment' | 'email' | 'verification';
  }>;
  sslEnabled: boolean;
  wildcardEnabled: boolean;
  popular: boolean;
}

/**
 * Built-in domain templates.
 * These are predefined configurations that make domain onboarding fast.
 * Users pick a template and all the capabilities + DNS records are pre-configured.
 */
const BUILTIN_TEMPLATES: DomainTemplate[] = [
  {
    id: 'deployment-website',
    name: 'Deployment Website',
    description: 'A web application deployed on the platform with HTTPS.',
    icon: '🌐',
    category: 'deployment',
    capabilities: { deployment: true, email: false, inboundEmail: false, tracking: false, api: false, redirect: false, sandbox: false },
    types: ['DEPLOYMENT'],
    records: [
      { type: 'A', name: '@', valueTemplate: '{server_ip}', ttl: 300, source: 'deployment' },
      { type: 'CNAME', name: 'www', valueTemplate: '{deployment_url}', ttl: 300, source: 'deployment' },
      { type: 'TXT', name: '_fidscript-verification.{domain}', valueTemplate: 'FIDScript verified {domain}', ttl: 300, source: 'verification' },
    ],
    sslEnabled: true,
    wildcardEnabled: false,
    popular: true,
  },
  {
    id: 'email-only',
    name: 'Email Only',
    description: 'Domain configured for sending and receiving email (MX, SPF, DKIM, DMARC).',
    icon: '📧',
    category: 'email',
    capabilities: { deployment: false, email: true, inboundEmail: true, tracking: false, api: false, redirect: false, sandbox: false },
    types: ['EMAIL', 'INBOUND_EMAIL'],
    records: [
      { type: 'MX', name: '@', valueTemplate: 'mail.{platform_domain}', ttl: 3600, priority: 10, source: 'email' },
      { type: 'MX', name: '@', valueTemplate: 'mail2.{platform_domain}', ttl: 3600, priority: 20, source: 'email' },
      { type: 'TXT', name: '@', valueTemplate: 'v=spf1 mx include:{platform_domain} ~all', ttl: 3600, source: 'email' },
      { type: 'TXT', name: 'default._domainkey.{domain}', valueTemplate: '{dkim_record}', ttl: 3600, source: 'email' },
      { type: 'TXT', name: '_dmarc.{domain}', valueTemplate: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain}', ttl: 3600, source: 'email' },
      { type: 'TXT', name: '_fidscript-verification.{domain}', valueTemplate: 'FIDScript verified {domain}', ttl: 300, source: 'verification' },
    ],
    sslEnabled: true,
    wildcardEnabled: false,
    popular: true,
  },
  {
    id: 'saas-app',
    name: 'SaaS Application',
    description: 'Full SaaS setup: deployment, API, email, and wildcard subdomains.',
    icon: '🚀',
    category: 'saas',
    capabilities: { deployment: true, email: true, inboundEmail: true, tracking: false, api: true, redirect: false, sandbox: false },
    types: ['DEPLOYMENT', 'EMAIL', 'INBOUND_EMAIL', 'API'],
    records: [
      { type: 'A', name: '@', valueTemplate: '{server_ip}', ttl: 300, source: 'deployment' },
      { type: 'CNAME', name: '*', valueTemplate: '{deployment_url}', ttl: 300, source: 'deployment' },
      { type: 'MX', name: '@', valueTemplate: 'mail.{platform_domain}', ttl: 3600, priority: 10, source: 'email' },
      { type: 'TXT', name: '@', valueTemplate: 'v=spf1 mx include:{platform_domain} ~all', ttl: 3600, source: 'email' },
      { type: 'TXT', name: '_dmarc.{domain}', valueTemplate: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain}', ttl: 3600, source: 'email' },
      { type: 'TXT', name: '_fidscript-verification.{domain}', valueTemplate: 'FIDScript verified {domain}', ttl: 300, source: 'verification' },
    ],
    sslEnabled: true,
    wildcardEnabled: true,
    popular: true,
  },
  {
    id: 'marketing-site',
    name: 'Marketing Site',
    description: 'Landing page with www redirect and tracking.',
    icon: '📊',
    category: 'marketing',
    capabilities: { deployment: true, email: false, inboundEmail: false, tracking: true, api: false, redirect: true, sandbox: false },
    types: ['DEPLOYMENT', 'TRACKING', 'REDIRECT'],
    records: [
      { type: 'A', name: '@', valueTemplate: '{server_ip}', ttl: 300, source: 'deployment' },
      { type: 'CNAME', name: 'www', valueTemplate: '{deployment_url}', ttl: 300, source: 'deployment' },
      { type: 'TXT', name: '_fidscript-verification.{domain}', valueTemplate: 'FIDScript verified {domain}', ttl: 300, source: 'verification' },
    ],
    sslEnabled: true,
    wildcardEnabled: false,
    popular: false,
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'API-only domain with deployment and API capabilities.',
    icon: '🔌',
    category: 'api',
    capabilities: { deployment: true, email: false, inboundEmail: false, tracking: false, api: true, redirect: false, sandbox: false },
    types: ['API', 'DEPLOYMENT'],
    records: [
      { type: 'A', name: 'api', valueTemplate: '{server_ip}', ttl: 300, source: 'deployment' },
      { type: 'TXT', name: '_fidscript-verification.{domain}', valueTemplate: 'FIDScript verified {domain}', ttl: 300, source: 'verification' },
    ],
    sslEnabled: true,
    wildcardEnabled: false,
    popular: false,
  },
  {
    id: 'full-stack',
    name: 'Full Stack App',
    description: 'Everything: deployment, API, email, tracking, and wildcard routing.',
    icon: '⚡',
    category: 'saas',
    capabilities: { deployment: true, email: true, inboundEmail: true, tracking: true, api: true, redirect: true, sandbox: false },
    types: ['DEPLOYMENT', 'EMAIL', 'INBOUND_EMAIL', 'API', 'TRACKING', 'REDIRECT'],
    records: [
      { type: 'A', name: '@', valueTemplate: '{server_ip}', ttl: 300, source: 'deployment' },
      { type: 'CNAME', name: '*', valueTemplate: '{deployment_url}', ttl: 300, source: 'deployment' },
      { type: 'MX', name: '@', valueTemplate: 'mail.{platform_domain}', ttl: 3600, priority: 10, source: 'email' },
      { type: 'TXT', name: '@', valueTemplate: 'v=spf1 mx include:{platform_domain} ~all', ttl: 3600, source: 'email' },
      { type: 'TXT', name: '_dmarc.{domain}', valueTemplate: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain}', ttl: 3600, source: 'email' },
      { type: 'TXT', name: '_fidscript-verification.{domain}', valueTemplate: 'FIDScript verified {domain}', ttl: 300, source: 'verification' },
    ],
    sslEnabled: true,
    wildcardEnabled: true,
    popular: true,
  },
];

/**
 * DomainTemplateService
 *
 * Provides predefined domain configuration templates.
 * Templates bundle capabilities, DNS records, and settings into a single
 * selectable preset — making domain onboarding fast and consistent.
 *
 * Templates are currently built-in (defined in code). Future versions may
 * support custom user-created templates stored in the database.
 */
@Injectable()
export class DomainTemplateService {
  private readonly logger = new Logger(DomainTemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * List all available templates.
   * Optionally filter by category or popularity.
   */
  async listTemplates(options: { category?: string; popularOnly?: boolean } = {}): Promise<DomainTemplate[]> {
    let templates = BUILTIN_TEMPLATES;
    if (options.category) {
      templates = templates.filter(t => t.category === options.category);
    }
    if (options.popularOnly) {
      templates = templates.filter(t => t.popular);
    }
    return templates;
  }

  /**
   * Get a single template by ID.
   */
  async getTemplate(id: string): Promise<DomainTemplate> {
    const template = BUILTIN_TEMPLATES.find(t => t.id === id);
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }

  /**
   * Get the list of categories with their template counts.
   */
  async getCategories(): Promise<Array<{ id: string; name: string; count: number }>> {
    const categoryMap = new Map<string, number>();
    for (const t of BUILTIN_TEMPLATES) {
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + 1);
    }
    return Array.from(categoryMap.entries()).map(([id, count]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      count,
    }));
  }
}
