import { Injectable } from '@nestjs/common';
import * as https from 'https';
import axios from 'axios';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';

@Injectable()
export class DomainChecksService {
  constructor(private dnsProvider: DnsProvider) {}

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

  async checkSsl(domain: { domain: string }): Promise<boolean> {
    try {
      const resp = await axios.get(`https://${domain.domain}/.well-known/fidscript`, {
        timeout: 10_000,
        validateStatus: s => s < 500,
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
      });
      return resp.status < 400 || resp.status === 404;
    } catch { return false; }
  }

  async getSslExpiresInDays(domain: { domain: string }): Promise<number | null> {
    return new Promise(resolve => {
      const req = https.request(
        { hostname: domain.domain, port: 443, path: '/', method: 'HEAD', timeout: 8_000 },
        (res: any) => {
          const cert = res.getPeerCertificate?.();
          if (!cert?.valid_to) { req.destroy(); resolve(null); return; }
          const expiry = new Date(cert.valid_to);
          const days = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
          req.destroy();
          resolve(days);
        },
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    });
  }
}
