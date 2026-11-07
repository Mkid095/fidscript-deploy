/**
 * Publishing — the write half of the registry.
 *
 * npm already knows how to build a tarball, hash it and upload it. Writing
 * that again here would be a worse version of npm. So these commands drive
 * npm itself, with the token handed over through the environment and a
 * temporary npmrc — the token never lands in the project's `.npmrc`, in a
 * shell history, or in a file the operator has to remember to delete.
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export interface PublishOptions {
  registryUrl: string;
  token: string;
  /** The package directory. Defaults to the current one. */
  dir?: string;
  /** The dist-tag to publish under. Defaults to npm's own default. */
  tag?: string;
  /** `--access`, for registries that care about it. */
  access?: 'public' | 'restricted';
  /** Skip the safety net that refuses to republish a version. */
  force?: boolean;
}

export interface PublishResult {
  ok: boolean;
  output: string;
}

/**
 * Runs npm with a temporary npmrc that points at the registry and carries
 * the token as `${NODE_AUTH_TOKEN}` — the placeholder npm expands from the
 * environment, so the token itself is never written to disk.
 */
export function runNpm(args: string[], options: PublishOptions): PublishResult {
  const host = hostOf(options.registryUrl);
  const dir = mkdtempSync(join(tmpdir(), 'fidscript-registry-'));
  const npmrcPath = join(dir, '.npmrc');
  writeFileSync(
    npmrcPath,
    [`registry=${options.registryUrl}`, `//${host}/:_authToken=\${NODE_AUTH_TOKEN}`, ''].join('\n'),
    'utf8',
  );

  try {
    const result = spawnSync('npm', [...args, '--userconfig', npmrcPath], {
      cwd: options.dir ?? process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, NODE_AUTH_TOKEN: options.token },
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    if (result.error) return { ok: false, output: result.error.message };
    return { ok: result.status === 0, output };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Publishes the package in `dir` to the registry. */
export function publishPackage(options: PublishOptions): PublishResult {
  const args = ['publish'];
  if (options.tag) args.push('--tag', options.tag);
  if (options.access) args.push('--access', options.access);
  if (options.force) args.push('--force');
  return runNpm(args, options);
}

/** Removes one version of a package. */
export function unpublishVersion(options: PublishOptions, spec: string): PublishResult {
  return runNpm(['unpublish', spec], options);
}

/** Removes a whole package. */
export function removePackage(options: PublishOptions, name: string): PublishResult {
  return runNpm(['unpublish', name, '--force'], options);
}

/** The tarball npm would publish, without publishing it. */
export function packPackage(options: PublishOptions): PublishResult {
  return runNpm(['pack', '--dry-run'], options);
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}
