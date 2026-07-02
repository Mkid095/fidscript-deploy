import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainChecksService } from './domain-checks.service';

export type WizardStage =
  | 'domain_entered'    // Domain added, no purpose selected
  | 'purpose_selected'  // Purpose chosen
  | 'provider_selected' // Provider chosen
  | 'records_configured' // Required records match current DNS
  | 'verifying'         // Full verification in progress
  | 'active';           // Domain fully active

export type WizardRecordStatus = 'ok' | 'missing' | 'pending' | 'unknown';

export interface WizardRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl: number;
  category: 'deployment' | 'email' | 'verification';
  status: WizardRecordStatus;
}

export interface WizardStatus {
  domainId: string;
  domain: string;
  stage: WizardStage;
  types: string[];
  provider: string | null;
  records: WizardRecord[];
  // Progress percentages for each verification category
  dnsProgress: number;   // 0-100
  sslProgress: number;   // 0-100
  routingProgress: number; // 0-100
  emailProgress: number; // 0-100
  overallProgress: number; // 0-100
  sslExpiresInDays: number | null;
  estimatedTimeRemaining: string | null; // e.g. "2-5 minutes"
}

/**
 * DomainWizardService
 *
 * Drives the DNS Wizard — the guided domain onboarding flow.
 *
 * Responsibilities:
 * - Return required DNS records for a domain based on its purpose types
 * - Live-check propagation status of each record via DNS queries
 * - Return wizard stage and overall progress percentage
 * - Estimate time remaining based on DNS propagation
 */
@Injectable()
export class DomainWizardService {
  private readonly logger = new Logger(DomainWizardService.name);

  constructor(
    private prisma: PrismaService,
    private checks: DomainChecksService,
  ) {}

  // ── Required records by type ────────────────────────────────────────────────

  /**
   * Returns the list of required DNS records for a domain based on its purpose types.
   */
  getRequiredRecords(
    domainName: string,
    types: string[],
    provider: string,
  ): Omit<WizardRecord, 'status'>[] {
    const records: Omit<WizardRecord, 'status'>[] = [];
    const isApex = !domainName.startsWith('www.');

    // Deployment records (Apex or subdomain)
    if (types.includes('DEPLOYMENT') || types.includes('API') || types.includes('REDIRECT')) {
      if (isApex) {
        records.push({
          id: 'a_deploy',
          type: 'A',
          name: '@',
          value: 'YOUR_SERVER_IP',
          ttl: 300,
          category: 'deployment',
        });
      }
      records.push({
        id: 'cname_deploy',
        type: 'CNAME',
        name: domainName.startsWith('www.') ? 'www' : domainName.split('.')[0],
        value: isApex ? 'YOUR_DEPLOYMENT_CNAME' : `${domainName.split('.')[0]}.apps.local`,
        ttl: 300,
        category: 'deployment',
      });
    }

    // Verification TXT record (always required)
    records.push({
      id: 'txt_verify',
      type: 'TXT',
      name: `_fidscript-verification.${domainName}`,
      value: `FIDScript verified ${domainName}`,
      ttl: 300,
      category: 'verification',
    });

    // Email records
    if (types.includes('EMAIL') || types.includes('INBOUND_EMAIL')) {
      records.push(
        { id: 'mx1', type: 'MX', name: '@', value: `mx1.${domainName}`, priority: 10, ttl: 300, category: 'email' },
        { id: 'mx2', type: 'MX', name: '@', value: `mx2.${domainName}`, priority: 20, ttl: 300, category: 'email' },
        {
          id: 'spf',
          type: 'TXT',
          name: '@',
          value: `v=spf1 mx include:${domainName} ~all`,
          ttl: 300,
          category: 'email',
        },
        {
          id: 'dkim',
          type: 'TXT',
          name: `default._domainkey.${domainName}`,
          value: 'v=DKIM1; k=ed25519; p=YOUR_DKIM_PUBLIC_KEY',
          ttl: 300,
          category: 'email',
        },
        {
          id: 'dmarc',
          type: 'TXT',
          name: '_dmarc',
          value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domainName}`,
          ttl: 300,
          category: 'email',
        },
      );
    }

    // Tracking domain
    if (types.includes('TRACKING')) {
      records.push({
        id: 'cname_tracking',
        type: 'CNAME',
        name: domainName.startsWith('www.') ? 'www' : domainName.split('.')[0],
        value: `track.${domainName}`,
        ttl: 300,
        category: 'deployment',
      });
    }

    return records;
  }

  // ── Propagation check ────────────────────────────────────────────────────────

  /**
   * Check the live propagation status of each required record via DNS queries.
   */
  async checkRecordPropagation(
    domainName: string,
    requiredRecords: Omit<WizardRecord, 'status'>[],
  ): Promise<WizardRecord[]> {
    const results = await Promise.allSettled(
      requiredRecords.map(async (record) => {
        const status = await this.checkSingleRecord(domainName, record);
        return { ...record, status };
      }),
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      // On error, mark as unknown (may be expected for records not yet added)
      return { ...requiredRecords[i], status: 'unknown' as WizardRecordStatus };
    });
  }

  private async checkSingleRecord(
    domainName: string,
    record: Omit<WizardRecord, 'status'>,
  ): Promise<WizardRecordStatus> {
    try {
      const queryName = record.type === 'MX'
        ? domainName
        : record.type === 'TXT' && record.name.startsWith('_')
        ? record.name
        : record.name === '@'
        ? domainName
        : `${record.name}.${domainName}`.replace(/^\.@\./, domainName);

      const { execSync } = require('child_process');
      let out = '';
      try {
        const typeFlag = record.type === 'MX' ? 'MX' : record.type === 'TXT' ? 'TXT' : record.type === 'CNAME' ? 'CNAME' : record.type === 'A' ? 'A' : 'A';
        out = execSync(`dig +short ${record.name === '@' ? domainName : record.name} ${record.type} +timeout=5 +tries=2 2>/dev/null`, {
          timeout: 10_000,
        }).toString().trim();
      } catch {
        // dig not available, try nslookup
        try {
          out = execSync(`nslookup -type=${record.type} ${record.name === '@' ? domainName : `${record.name}.${domainName}`} 2>/dev/null | grep -A1 "Name:" | tail -1`, {
            timeout: 10_000,
          }).toString().trim();
        } catch {
          out = '';
        }
      }

      if (!out) return 'missing';

      // Normalize comparison: ignore TTL differences, whitespace
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').trim();
      const expectedValue = normalize(record.value);
      const actualValues = out.split('\n').map(normalize);

      const found = actualValues.some(v =>
        v.includes(expectedValue.replace(/YOUR_SERVER_IP|YOUR_DEPLOYMENT_CNAME|YOUR_DKIM_PUBLIC_KEY/gi, '').toLowerCase()) ||
        expectedValue.includes(v.replace(/YOUR_SERVER_IP|YOUR_DEPLOYMENT_CNAME|YOUR_DKIM_PUBLIC_KEY/gi, '').toLowerCase()),
      );

      return found ? 'ok' : 'pending';
    } catch {
      return 'missing';
    }
  }

  // ── Wizard status ────────────────────────────────────────────────────────────

  /**
   * Compute the full wizard status for a domain.
   */
  async getWizardStatus(domainId: string): Promise<WizardStatus | null> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) return null;

    const types: string[] = (domain.type as string[]) ?? [];
    const requiredRecords = this.getRequiredRecords(domain.domain, types, domain.dnsMode);
    const recordsWithStatus = await this.checkRecordPropagation(domain.domain, requiredRecords);

    const stage = this.deriveStage(domain, recordsWithStatus);
    const { dnsProgress, routingProgress, sslProgress, emailProgress } = this.computeProgress(recordsWithStatus, domain);

    return {
      domainId: domain.id,
      domain: domain.domain,
      stage,
      types,
      provider: domain.dnsMode === 'cloudflare_auto' ? 'cloudflare' : 'manual',
      records: recordsWithStatus,
      dnsProgress,
      routingProgress,
      sslProgress,
      emailProgress,
      overallProgress: Math.round((dnsProgress + routingProgress + sslProgress + emailProgress) / 4),
      sslExpiresInDays: domain.sslExpiresAt
        ? Math.ceil((domain.sslExpiresAt.getTime() - Date.now()) / 86_400_000)
        : null,
      estimatedTimeRemaining: this.estimateTimeRemaining(stage, recordsWithStatus),
    };
  }

  private deriveStage(domain: { dnsStatus: string; sslStatus: string }, records: WizardRecord[]): WizardStage {
    if (domain.dnsStatus === 'ACTIVE' && domain.sslStatus === 'ACTIVE') return 'active';
    const missingCritical = records.filter(r => r.category !== 'email' && r.status === 'missing').length;
    const pendingCount = records.filter(r => r.status === 'pending').length;
    if (missingCritical > 0) return 'records_configured';
    if (pendingCount > 0) return 'verifying';
    return 'records_configured';
  }

  private computeProgress(
    records: WizardRecord[],
    domain: { dnsStatus: string; sslStatus: string },
  ) {
    const deploymentRecords = records.filter(r => r.category === 'deployment');
    const emailRecords = records.filter(r => r.category === 'email');
    const verifyRecords = records.filter(r => r.category === 'verification');

    const dnsProgress = deploymentRecords.length
      ? Math.round((deploymentRecords.filter(r => r.status === 'ok').length / deploymentRecords.length) * 100)
      : 100;

    const emailProgress = emailRecords.length
      ? Math.round((emailRecords.filter(r => r.status === 'ok').length / emailRecords.length) * 100)
      : 100;

    const routingProgress = domain.dnsStatus === 'ACTIVE' ? 100 : domain.dnsStatus === 'VALIDATING' ? 50 : 0;
    const sslProgress = domain.sslStatus === 'ACTIVE' ? 100 : domain.sslStatus === 'TLS_PENDING' ? 50 : 0;

    return { dnsProgress, emailProgress, routingProgress, sslProgress };
  }

  private estimateTimeRemaining(stage: WizardStage, records: WizardRecord[]): string | null {
    if (stage === 'active') return null;
    if (stage === 'verifying') {
      const pending = records.filter(r => r.status === 'pending').length;
      if (pending > 0) return '2-5 minutes';
      return '30-60 seconds';
    }
    if (stage === 'records_configured') return '1-5 minutes';
    return null;
  }
}
