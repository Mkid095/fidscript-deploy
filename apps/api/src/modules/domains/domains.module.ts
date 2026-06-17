import { Module } from '@nestjs/common';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { CloudflareDnsProvider } from './providers/cloudflare-dns.provider';

@Module({
  controllers: [DomainsController],
  providers: [
    CloudflareDnsProvider,
    {
      provide: 'DNS_PROVIDER',
      useExisting: CloudflareDnsProvider,
    },
    DomainsService,
  ],
  exports: [DomainsService],
})
export class DomainsModule {}
