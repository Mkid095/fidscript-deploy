import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookSignatureService } from './webhook-signature.service';

/**
 * The webhook signature, tested.
 *
 * The check was optional — it ran only when the header was present — and it
 * was computed over the re-serialized body, so even a correctly signed
 * webhook did not match. The secret was in a file that nothing read.
 */

const SECRET = 'the-webhook-secret';

function makeService(options: { env?: string; file?: string | null } = {}) {
  const config = {
    get: jest.fn((key: string, fallback: string) => {
      if (key === 'STALWART_WEBHOOK_SECRET') return options.env ?? '';
      if (key === 'STALWART_WEBHOOK_SECRET_FILE') return '/run/secrets/stalwart_webhook_secret';
      return fallback;
    }),
  } as unknown as ConfigService;

  const fs = require('fs');
  jest.spyOn(fs, 'existsSync').mockReturnValue(options.file !== null);
  jest.spyOn(fs, 'readFileSync').mockReturnValue(options.file ?? SECRET);

  return new WebhookSignatureService(config);
}

function sign(body: string, secret = SECRET): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('WebhookSignatureService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('accepts a signature over the raw body', () => {
    const service = makeService({ env: SECRET });
    const body = JSON.stringify({ from: 'a@b.c', to: 'd@e.f' });
    expect(() => service.verify(body, sign(body))).not.toThrow();
  });

  it('accepts a signature over a Buffer body', () => {
    const service = makeService({ env: SECRET });
    const body = Buffer.from(JSON.stringify({ from: 'a@b.c' }));
    expect(() => service.verify(body, sign(body.toString('utf8')))).not.toThrow();
  });

  it('refuses a webhook with NO signature', () => {
    const service = makeService({ env: SECRET });
    expect(() => service.verify('{}', undefined)).toThrow(UnauthorizedException);
  });

  it('refuses a wrong signature', () => {
    const service = makeService({ env: SECRET });
    expect(() => service.verify('{}', sign('{}', 'another-secret'))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a signature of the wrong length without a server error', () => {
    const service = makeService({ env: SECRET });
    expect(() => service.verify('{}', 'sha256=short')).toThrow(UnauthorizedException);
  });

  it('refuses a body that was re-serialized — the bytes must be the signed ones', () => {
    const service = makeService({ env: SECRET });
    const signed = JSON.stringify({ from: 'a@b.c' });
    const reserialized = JSON.stringify({ from: 'a@b.c' }) + '\n';
    expect(() => service.verify(reserialized, sign(signed))).toThrow(
      UnauthorizedException,
    );
  });

  it('reads the secret from the file the installer wrote', () => {
    const service = makeService({ file: SECRET });
    const body = '{}';
    expect(() => service.verify(body, sign(body))).not.toThrow();
  });

  it('refuses everything when the platform has no webhook secret', () => {
    const service = makeService({ env: '', file: null });
    expect(() => service.verify('{}', sign('{}'))).toThrow(UnauthorizedException);
  });
});
