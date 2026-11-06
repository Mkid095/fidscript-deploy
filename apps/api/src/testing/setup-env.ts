import * as crypto from 'crypto';

/**
 * The environment the integration tests run in.
 *
 * It is set **before** anything is imported, because the services read it
 * while they are being constructed — the encryption key above all: it
 * fails closed, which is right in production and fatal in a test that
 * forgot to bring one.
 *
 * The secrets here are the tests' own. A test must not be able to reach the
 * platform's, and it must not need them either.
 */
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  `postgresql://fidscript:${process.env.TEST_DB_PASSWORD ?? ''}@postgres:5432/${
    process.env.TEST_DB_NAME ?? 'fidscript_test'
  }`;

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? Buffer.alloc(32, 11).toString('base64');
process.env.NODE_ENV = 'test';

// The platform's own services are not what the tests are about, and a test
// must not reach the live mail server or the live object store.
process.env.STALWART_SMTP_HOST = '';
process.env.MINIO_ENDPOINT = '';
process.env.S3_ENDPOINT = '';
