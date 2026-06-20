import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    console.warn('ADMIN_EMAIL not set — skipping admin seed');
    return;
  }

  if (!password) {
    console.warn('ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user ${email} already exists — skipping seed`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Platform Admin',
      role: Role.ADMIN,
      // Force a password change on first login — the install-time ADMIN_PASSWORD
      // is a bootstrap secret; the operator should set their own. Cleared by
      // POST /auth/change-password (PREREQ-AUTH-2). See f02-auth.md.
      mustChangePassword: true,
    },
  });

  // Create the PASSWORD credential record for this user.
  // This allows force-change-password to distinguish between "has a password to change"
  // and "was magic-code only and needs to create a password".
  await prisma.userCredential.create({
    data: {
      userId: user.id,
      type: 'PASSWORD',
      secretHash: passwordHash,
    },
  });

  console.log(`Admin user ${email} created with PASSWORD credential`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });