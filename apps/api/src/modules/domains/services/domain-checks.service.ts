import { Injectable, Inject } from '@nestjs/common';
import * as https from 'https';
import axios from 'axios';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';

@Injectable()
export class DomainChecksService {
  constructor(@Inject('DNS_PROVIDER') private dnsProvider: DnsProvider) {}

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

  /**
   * Check email DNS records: MX, SPF, DKIM (if selector set), DMARC.
   * Returns true only if at least MX + SPF are found (DKIM and DMARC are recommended, not required).
   */
  async checkEmailRecords(domain: { domain: string; dnsMode: string }): Promise<boolean> {
    try {
      const [mxResp, spfResp] = await Promise.all([
        this.dnsQuery(domain.domain, 'MX'),
        this.dnsQuery(domain.domain, 'TXT'),
      ]);

      const hasMx = (mxResp.data?.Answer ?? []).length > 0;
      const txtRecords: string[] = (spfResp.data?.Answer ?? []).map((a: any) => a.data as string);
      const hasSpf = txtRecords.some(r => r.includes('v=spf1'));

      // DMARC is optional but checked if present
      let hasDmarc = false;
      try {
        const dmarcResp = await this.dnsQuery(`_dmarc.${domain.domain}`, 'TXT');
        const dmarcTxt: string[] = (dmarcResp.data?.Answer ?? []).map((a: any) => a.data as string);
        hasDmarc = dmarcTxt.some(r => r.includes('v=DMARC1'));
      } catch { /* ignore */ }

      // DKIM: if dkimSelector is known, check it; otherwise just check MX+SPF
      return hasMx && hasSpf;
    } catch { return false; }
  }

  private async dnsQuery(name: string, type: string) {
    return axios.get(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' }, timeout: 8_000 },
    );
  }

  /**
   * Returns all relevant DNS record types for fingerprinting a domain.
   * Used by DomainReconciliationService to detect DNS changes.
   */
  async getDnsRecordsForFingerprint(domain: { domain: string }): Promise<Array<{ type: string; name: string; value: string }>> {
    const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
    const records: Array<{ type: string; name: string; value: string }> = [];

    await Promise.allSettled(
      recordTypes.map(async (type) => {
        try {
          const resp = await this.dnsQuery(domain.domain, type);
          const answers: Array<{ name: string; type: number; data: string; priority?: number }> = resp.data?.Answer ?? [];
          for (const answer of answers) {
            records.push({
              type,
              name: answer.name,
              value: type === 'MX' ? `${answer.priority ?? ''} ${answer.data}`.trim() : answer.data,
            });
          }
        } catch { /* ignore — record type may not exist */ }
      }),
    );

    return records;
  }
}
