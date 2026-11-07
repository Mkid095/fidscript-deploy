import { Injectable } from '@nestjs/common';
import { DnsRecord } from '@/modules/domains/providers/dns-provider.interface';

@Injectable()
export class CloudflareDnsMappersService {
  stripTrailingDot(name: string): string {
    return name.endsWith('.') ? name.slice(0, -1) : name;
  }

  mapRecord(raw: any): DnsRecord {
    return {
      id: raw.id,
      type: raw.type,
      name: raw.name,
      content: raw.content,
      proxied: raw.proxied,
      ttl: raw.ttl,
    };
  }
}
