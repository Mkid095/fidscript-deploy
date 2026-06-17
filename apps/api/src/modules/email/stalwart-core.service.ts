/**
 * Stalwart JMAP core: HTTP client + raw method call executor.
 * All Stalwart management operations go through POST /jmap with bearer auth.
 *
 * Stalwart docs: https://stalw.art/docs/management/
 * JMAP spec:     https://jmap.io/
 */
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface JmapResponse {
  sessionState: string;
  methodResponses: Array<[string, Record<string, unknown>, string]>;
}

@Injectable()
export class StalwartJmapService {
  private readonly logger = new Logger(StalwartJmapService.name);
  protected readonly client: AxiosInstance;

  constructor(protected configService: ConfigService) {
    const baseURL =
      this.configService.get('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080') + '/jmap';
    const adminToken = this.configService.get('STALWART_ADMIN_TOKEN', '');

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      timeout: 15000,
    });
  }

  /**
   * Execute one or more JMAP method calls in a single request.
   */
  async jmapCall(methodCalls: Array<[string, Record<string, unknown>]>): Promise<JmapResponse> {
    const payload = {
      using: [
        'urn:ietf:params:jmap:core',
        'urn:ietf:params:jmap:mail',
        'urn:stalwart:jmap',
      ],
      methodCalls: methodCalls.map((mc, i) => [...mc, String(i)]),
    };

    try {
      const response = await this.client.post<JmapResponse>('', payload);
      const methodResponses = response.data.methodResponses;

      for (const [methodName, result] of methodResponses) {
        if (methodName.endsWith('/error') || (result && (result as Record<string, unknown>).type === 'error')) {
          const error = result as { type: string; description?: string };
          throw new InternalServerErrorException(
            `Stalwart JMAP error in ${methodName}: ${error.description ?? JSON.stringify(error)}`,
          );
        }
      }

      return response.data;
    } catch (err: unknown) {
      if (err instanceof InternalServerErrorException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Stalwart JMAP call failed: ${msg}`);
      throw new InternalServerErrorException(`Stalwart JMAP call failed: ${msg}`);
    }
  }

  // ── Domain operations ────────────────────────────────────────────

  async createDomain(domain: string): Promise<{ id: string; name: string }> {
    const res = await this.jmapCall([
      ['x:Domain/set', { create: { d1: { name: domain } } }],
    ]);
    const data = res.methodResponses[0][1] as { created?: Record<string, { id: string; name: string }> };
    const d = data?.created?.d1;
    if (!d) throw new InternalServerErrorException('Stalwart did not return domain id');
    return d;
  }

  async deleteDomain(stalwartDomainId: string): Promise<void> {
    await this.jmapCall([['x:Domain/set', { destroy: [stalwartDomainId] }]]);
  }

  async listDomains(): Promise<Array<{ id: string; name: string }>> {
    const res = await this.jmapCall([['x:Domain/get', {}]]);
    const data = res.methodResponses[0][1] as { list?: Array<{ id: string; name: string }> };
    return data?.list ?? [];
  }
}
