import { execFileSync } from 'child_process';

/**
 * The test database.
 *
 * The tests must never touch the platform's data, so they get a database
 * of their own: created before the suite, migrated, and dropped when the
 * suite ends.
 *
 * The database lives in the platform's PostgreSQL, reached over the
 * platform's Docker network — the tests run in a container on it, because
 * the platform's other services (NATS, Redis) are on it too and the
 * application needs them.
 *
 * The role is the tests' own, with a password of their own: the tests
 * never need the platform's database password, and never have it.
 */

/** The name of the test database and of its role. */
export const TEST_DB_NAME = process.env.TEST_DB_NAME ?? 'fidscript_test';
export const TEST_DB_ROLE = process.env.TEST_DB_ROLE ?? 'fidscript_test';
export const TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? 'fidscript_test_password';

/** The URL of the test database. */
export function testDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    `postgresql://${TEST_DB_ROLE}:${TEST_DB_PASSWORD}@postgres:5432/${TEST_DB_NAME}`
  );
}

/**
 * Run a statement against the platform's PostgreSQL.
 *
 * The statement goes through the platform's own database container, which
 * authenticates locally and needs no password here.
 */
export function runAdminSql(sql: string): void {
  const container = process.env.TEST_DB_CONTAINER ?? 'fidscript_postgres';
  execFileSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'fidscript', '-d', 'postgres', '-c', sql],
    { stdio: 'ignore' },
  );
}

/** Create the test role and database. */
export function createTestDatabase(): void {
  runAdminSql(
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_DB_ROLE}') THEN ` +
      `CREATE ROLE ${TEST_DB_ROLE} WITH LOGIN PASSWORD '${TEST_DB_PASSWORD}' CREATEDB; END IF; END $$;`,
  );
  runAdminSql(`CREATE DATABASE ${TEST_DB_NAME} OWNER ${TEST_DB_ROLE}`);
}

/** Drop the test database and role. */
export function dropTestDatabase(): void {
  runAdminSql(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
  runAdminSql(`DROP ROLE IF EXISTS ${TEST_DB_ROLE}`);
}

/** Apply the platform's migrations to the test database. */
export function migrateTestDatabase(): void {
  execFileSync(
    'npx',
    ['prisma', 'migrate', 'deploy'],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
      stdio: 'ignore',
    },
  );
}
