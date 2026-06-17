import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';

@Injectable()
export class DomainVerificationChecksService {
  constructor(private dnsProvider: DnsProvider) {}

  async checkOwnership(domain: { domain: string; dnsMode: string }): Promise<boolean> {
    const txtName = `_fidscript-verification.${domain.domain}`;
    const prefix = `FIDScript verified`;
    if (domain.dnsMode === 'cloudflare_auto') {
      const zoneId = await this.dnsProvider.getZoneId(domain.domain);
      if (!zoneId) return false;
      const records = await this.dnsProvider.listRecords({ zoneId, name: txtName, type: 'TXT' });
      return records.some(r => r.content.startsWith(prefix));
    }
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtName)}&type=TXT`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 },
      );
      if (resp.data?.Answer?.length > 0) {
        return resp.data.Answer.some((a: any) =>
          typeof a.data === 'string' && a.data.startsWith(prefix),
        );
      }
    } catch { /* ignore */ }
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short TXT ${txtName} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      return out.includes(prefix);
    } catch { return false; }
  }

  async checkDnsPropagation(domain: { domain: string; dnsMode: string }): Promise<boolean> {
    if (domain.dnsMode === 'cloudflare_auto') {
      const zoneId = await this.dnsProvider.getZoneId(domain.domain);
      if (!zoneId) return false;
      const records = await this.dnsProvider.listRecords({ zoneId, name: domain.domain });
      return records.length > 0;
    }
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.domain)}&type=A`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 },
      );
      return (resp.data?.Answer?.length ?? 0) > 0;
    } catch { /* ignore */ }
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short ${domain.domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      return out.length > 0;
    } catch { return false; }
  }

  async checkDnsResolution(domain: { domain: string }): Promise<boolean> {
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/cdn-cgi/trace?name=${encodeURIComponent(domain.domain)}`,
        { timeout: 8_000 },
      );
      return resp.status === 200;
    } catch { /* ignore */ }
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short ${domain.domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      return out.length > 0;
    } catch { return false; }
  }

  async checkHttpRouting(domain: { domain: string }): Promise<boolean> {
    try {
      const response = await axios.get(`http://${domain.domain}/.well-known/fidscript`, {
        timeout: 10_000,
        validateStatus: s => s < 500,
      });
      if (response.status === 200) return true;
      if (response.status === 404 && typeof response.data === 'string' && response.data.includes('fidscript')) return true;
      return response.status < 400 || response.status === 404;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('NXDOMAIN')) return false;
      const axiosErr = err as any;
      if (axiosErr?.response) return true;
      return false;
    }
  }
}
