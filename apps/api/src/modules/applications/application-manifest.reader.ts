import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * The add-on manifests, read from the installer directory.
 *
 * The manifests are a deliberately small, flat subset of YAML so they can be
 * read with awk on a fresh VPS with no YAML parser. This reader does the same
 * thing in TypeScript: it reads the flat keys and leaves the nested `secrets`
 * map alone, because the API has no use for it.
 *
 * The installer directory is mounted into the API container at
 * `/opt/fidscript` — the layout has to be the real one, because the install
 * service runs the installer's own scripts.
 */

/** The flat keys of an add-on manifest. */
export interface AddonManifest {
  id: string;
  title: string;
  summary: string;
  requires: string[];
  conflicts: string[];
}

/** Where the installer lives inside the API container. */
export const INSTALLER_DIR = process.env.INSTALLER_DIR ?? '/opt/fidscript-deploy/installer';

export const ADDONS_DIR = join(INSTALLER_DIR, 'addons');
export const DOCKER_DIR = join(INSTALLER_DIR, 'docker');

/**
 * The manifests that are actually on disk.
 *
 * The catalogue in the API says what an application *is*; the manifest says
 * what the installer needs to build it. Reading the directory means an add-on
 * added to the installer shows up even if the catalogue has not caught up —
 * it is listed, just without its console.
 */
export function readAddonManifests(): AddonManifest[] {
  if (!existsSync(ADDONS_DIR)) return [];
  const manifests: AddonManifest[] = [];
  for (const entry of readdirSync(ADDONS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(ADDONS_DIR, entry.name, 'addon.yml');
    if (!existsSync(file)) continue;
    const manifest = readManifest(file);
    if (manifest) manifests.push(manifest);
  }
  return manifests;
}

/**
 * Read one manifest's flat keys.
 *
 * `title:` and `summary:` may run onto the next line (a YAML folded scalar),
 * so a key with no value takes the next non-empty line that is not itself a
 * `key:` line.
 */
function readManifest(file: string): AddonManifest | null {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }

  const lines = text.split('\n');
  const flat: Record<string, string> = {};
  const lists: Record<string, string[]> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('#')) continue;
    const match = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;

    if (raw.trim() === '') {
      // A block list: every `- item` under it, until the next key.
      const items: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(lines[j].replace(/^\s*-\s*/, '').trim());
        j++;
      }
      lists[key] = items;
      i = j - 1;
      continue;
    }

    // A value that continues on the next line.
    if (raw.trim() === '|' || raw.trim() === '>') {
      const parts: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '') {
        parts.push(lines[j].trim());
        j++;
      }
      flat[key] = parts.join(' ');
      i = j - 1;
      continue;
    }

    flat[key] = raw.trim().replace(/^["']|["']$/g, '');
  }

  const id = flat.id;
  if (!id) return null;

  return {
    id,
    title: flat.title ?? id,
    summary: flat.summary ?? '',
    requires: lists.requires ?? [],
    conflicts: lists.conflicts ?? [],
  };
}
