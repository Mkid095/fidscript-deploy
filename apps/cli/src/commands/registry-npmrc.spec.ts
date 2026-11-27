import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { configureNpmrc, removeNpmrcAuth, MANAGED_SCOPES } from './registry-npmrc';

/**
 * The npm routing the link writes: managed lines are ours to replace, every
 * other line in the file is somebody else's, and a token the link does not
 * hold is worse than no token at all.
 */

let dir: string;
const file = () => join(dir, 'npmrc');
const REG = 'https://registry.fidscript.com';

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'registry-npmrc-'));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('configureNpmrc', () => {
  it('creates the file when there is none: scope lines + the auth line', () => {
    rmSync(file(), { force: true });
    configureNpmrc(REG, 'tok.1', file());
    const content = readFileSync(file(), 'utf8');
    expect(content).toContain('@fidscript-deploy:registry=https://registry.fidscript.com');
    expect(content).toContain('@fidscript:registry=https://registry.fidscript.com');
    expect(content).toContain('//registry.fidscript.com/:_authToken=tok.1');
  });

  it('replaces stale scope lines and keeps every other line', () => {
    writeFileSync(file(), 'registry=https://registry.npmjs.org\n@soostori:registry=https://other.example\n# a comment\n');
    configureNpmrc(REG, 'tok.2', file());
    const content = readFileSync(file(), 'utf8');
    const lines = content.split('\n');
    // Unrelated lines, untouched.
    expect(lines).toContain('registry=https://registry.npmjs.org');
    expect(lines).toContain('@soostori:registry=https://other.example');
    expect(lines).toContain('# a comment');
    // Managed scopes point at the link's registry, exactly once each.
    for (const scope of MANAGED_SCOPES) {
      const matches = lines.filter((l) => l.startsWith(`${scope}:registry=`));
      expect(matches).toHaveLength(1);
      expect(matches[0]).toBe(`${scope}:registry=${REG}`);
    }
    expect(lines.filter((l) => l.startsWith('//registry.fidscript.com/:_authToken='))).toHaveLength(1);
  });

  it('is idempotent: a second link writes nothing new', () => {
    const once = readFileSync(file(), 'utf8');
    configureNpmrc(REG, 'tok.3', file());
    const twice = readFileSync(file(), 'utf8');
    expect(twice).toBe(once.replace('tok.2', 'tok.3'));
    expect(twice.split('\n').filter((l) => l.startsWith('@fidscript-deploy:registry='))).toHaveLength(1);
  });

  it('drops a stale token for the same host when no token is written', () => {
    writeFileSync(file(), `//registry.fidscript.com/:_authToken=dead\n@fidscript-deploy:registry=${REG}\n`);
    configureNpmrc(REG, undefined, file());
    const content = readFileSync(file(), 'utf8');
    expect(content).not.toContain('_authToken=dead');
    expect(content).toContain(`@fidscript-deploy:registry=${REG}`);
    // A token for a different registry is nobody's to drop.
    writeFileSync(file(), `//elsewhere.example/:_authToken=theirs\n`);
    configureNpmrc(REG, undefined, file());
    expect(readFileSync(file(), 'utf8')).toContain('//elsewhere.example/:_authToken=theirs');
  });
});

describe('removeNpmrcAuth', () => {
  it('removes the dead token, keeps the routing', () => {
    writeFileSync(file(), `@fidscript-deploy:registry=${REG}\n@fidscript:registry=${REG}\n//registry.fidscript.com/:_authToken=tok.9\n`);
    expect(removeNpmrcAuth(REG, file())).toBe(true);
    const content = readFileSync(file(), 'utf8');
    expect(content).not.toContain('_authToken=tok.9');
    expect(content).toContain(`@fidscript-deploy:registry=${REG}`);
  });

  it('says nothing was removed when there is nothing of ours', () => {
    writeFileSync(file(), `registry=https://registry.npmjs.org\n`);
    expect(removeNpmrcAuth(REG, file())).toBe(false);
    expect(existsSync(file())).toBe(true);
  });
});
