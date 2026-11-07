/**
 * Smoke test for the Stalwart v0.16 email provider. Verifies that
 *   - the admin can authenticate
 *   - the platform domain is registered
 *   - we can create / read / delete a mailbox through x:Account/set
 *   - we can list mailboxes
 *
 * Run from /home/ken/fidscript-deploy/apps/api with:
 *   SMTP_SUBMISSION_USER=admin@deploy.fidscript.com \
 *   SMTP_SUBMISSION_PASS=Tqu6QQHLg8AIGK5x \
 *   STALWART_JMAP_URL=http://127.0.0.1:8090 \
 *   PLATFORM_DOMAIN=deploy.fidscript.com \
 *   npx ts-node scripts/test-email-provider.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StalwartEmailProvider } from '../src/modules/email/providers/stalwart-email.provider';
import { IEmailProvider } from '../src/modules/email/providers/i-email-provider';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const email = app.get(StalwartEmailProvider);

  console.log('--- Test: listDomains ---');
  const domains = await email.listDomains();
  console.log('domains:', domains);
  if (domains.length === 0) {
    throw new Error('No domains found; bootstrap expected at least PLATFORM_DOMAIN');
  }

  const platformDomain = domains.find((d) => d.name === 'deploy.fidscript.com')!;
  console.log('--- Test: ensureDomain (idempotent) ---');
  const d2 = await email.ensureDomain({ name: 'deploy.fidscript.com', isEnabled: true });
  console.log('ensureDomain result:', d2);
  if (d2.id !== platformDomain.id) {
    throw new Error(`ensureDomain returned different id: ${d2.id} vs ${platformDomain.id}`);
  }

  console.log('--- Test: createMailbox (test-user) ---');
  const testEmail = `test-${Date.now()}`;
  const m = await email.createMailbox({
    name: testEmail,
    domainId: platformDomain.id,
    description: 'Smoke test mailbox',
    password: 'TestPass123!',
  });
  console.log('created mailbox:', m);

  console.log('--- Test: getMailbox ---');
  const got = await email.getMailbox(m.id);
  console.log('got mailbox:', got);
  if (!got || got.id !== m.id) throw new Error('getMailbox did not find created mailbox');

  console.log('--- Test: setMailboxPassword ---');
  await email.setMailboxPassword(m.id, 'NewPass456!');
  console.log('password updated');

  console.log('--- Test: listMailboxes ---');
  const all = await email.listMailboxes(platformDomain.id);
  console.log('mailbox count for platform domain:', all.length);
  if (!all.find((x) => x.id === m.id)) throw new Error('listMailboxes did not include new mailbox');

  console.log('--- Test: deleteMailbox (cleanup) ---');
  await email.deleteMailbox(m.id);
  const after = await email.getMailbox(m.id);
  if (after) throw new Error('deleteMailbox did not remove the mailbox');
  console.log('deleted OK');

  console.log('--- All tests passed ---');
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
