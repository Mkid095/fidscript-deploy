import { Injectable } from '@nestjs/common';

@Injectable()
export class DomainMxService {
  async checkMxRecords(domain: string): Promise<{ hasMx: boolean; provider: string }> {
    try {
      const resp = await (await import('axios')).default.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 },
      );
      if (resp.data?.Answer?.length > 0) {
        const mx = resp.data.Answer.map((a: any) => a.data).join(',');
        if (mx.includes('google.com')) return { hasMx: true, provider: 'GOOGLE_WORKSPACE' };
        if (mx.includes('outlook.com') || mx.includes('microsoft.com')) return { hasMx: true, provider: 'MICROSOFT_365' };
        if (mx.includes('zoho.com')) return { hasMx: true, provider: 'ZOHO' };
        if (mx.includes('amazonses.com')) return { hasMx: true, provider: 'SES' };
        if (mx.includes('mailgun.org')) return { hasMx: true, provider: 'MAILGUN' };
        return { hasMx: true, provider: 'CUSTOM' };
      }
    } catch { /* ignore */ }
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short MX ${domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      if (out && !out.includes('no MX')) {
        if (out.includes('google.com')) return { hasMx: true, provider: 'GOOGLE_WORKSPACE' };
        if (out.includes('outlook.com') || out.includes('microsoft.com')) return { hasMx: true, provider: 'MICROSOFT_365' };
        if (out.includes('zoho.com')) return { hasMx: true, provider: 'ZOHO' };
        return { hasMx: true, provider: 'CUSTOM' };
      }
    } catch { /* ignore */ }
    return { hasMx: false, provider: '' };
  }
}
