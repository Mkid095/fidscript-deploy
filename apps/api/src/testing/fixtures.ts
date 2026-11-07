import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';

/**
 * The fixtures the integration tests build on.
 *
 * Everything is created through the platform's own database — the same
 * tables the application reads — so a test exercises the real queries and
 * the real constraints, not a shape the test invented.
 */

/**
 * Mark the platform as configured.
 *
 * The login and the registration are closed until the platform has been
 * set up — the guard that says "Platform is not yet configured" — so a
 * test that signs anybody in has to say the platform is ready.
 */
export async function configurePlatform(prisma: PrismaClient): Promise<void> {
  await prisma.installationStatus.upsert({
    where: { id: 'installation' },
    create: { id: 'installation', lifecycle: 'CONFIGURED' },
    update: { lifecycle: 'CONFIGURED' },
  });
}

/** A person with a password, ready to sign in. */
export async function createUser(
  prisma: PrismaClient,
  options: { email?: string; role?: 'USER' | 'ADMIN' | 'OWNER' } = {},
): Promise<{ id: string; email: string; password: string; role: string }> {
  const email = options.email ?? `user-${crypto.randomUUID()}@example.test`;
  const password = 'Verification-Only-1';
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 4),
      name: 'Test Person',
      role: options.role ?? 'USER',
      emailVerifiedAt: new Date(),
    },
  });
  return { id: user.id, email, password, role: user.role };
}

/** A project owned by the given person. */
export async function createProject(
  prisma: PrismaClient,
  ownerId: string,
  name = 'Test Project',
): Promise<{ id: string; slug: string }> {
  const slug = `test-${crypto.randomUUID().slice(0, 8)}`;
  const project = await prisma.project.create({
    data: { name, slug, type: 'BACKEND', ownerId },
  });
  return { id: project.id, slug: project.slug };
}

/** A member of a project, with a role. */
export async function addMember(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
  role: 'admin' | 'developer' | 'viewer',
): Promise<void> {
  await prisma.projectMember.create({ data: { projectId, userId, role } });
}

/**
 * A project API key.
 *
 * The key is returned in the clear — the platform only ever stores its
 * hash — so the test can use it the way a client would.
 */
export async function mintProjectKey(
  prisma: PrismaClient,
  projectId: string,
  options: { name?: string; permissions?: string[] } = {},
): Promise<{ id: string; key: string; permissions: string[] }> {
  // The platform hashes the key's **body** — the part after the `fpk_` —
  // and keeps the first few characters of it as a non-secret index.
  const body = crypto.randomBytes(24).toString('hex');
  const raw = `fpk_${body}`;
  const key = await prisma.projectApiKey.create({
    data: {
      projectId,
      name: options.name ?? 'test-key',
      keyHash: await bcrypt.hash(body, 4),
      keyPrefix: body.slice(0, 8),
      permissions: options.permissions ?? [],
    },
  });
  return { id: key.id, key: raw, permissions: options.permissions ?? [] };
}
