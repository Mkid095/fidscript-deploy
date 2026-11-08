/**
 * NodeBuildpackProvider — builds Node.js / frontend apps without a Dockerfile.
 *
 * This is the Vercel/Railway-style auto-detection build provider. Given a
 * cloned repo, it inspects config files and package.json to determine the
 * framework, then generates a tailored multi-stage Dockerfile and runs
 * `docker build`.
 *
 * Detection priority:
 *  1. next.config.*        → Next.js
 *  2. nuxt.config.*        → Nuxt
 *  3. astro.config.*       → Astro
 *  4. svelte.config.*      → SvelteKit
 *  5. vite.config.*        → Vite (covers React, Vue, Svelte, etc.)
 *  6. package.json scripts → Node.js custom
 *  7. index.html           → Static HTML
 *  8. unknown
 *
 * The public `detectFramework()` + `toBuildPlan()` methods are also used by
 * the POST /deployments/detect endpoint to show users what was detected
 * before they commit to deploying.
 */
import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  BuildProvider,
  BuildContext,
  BuildResult,
} from './build-provider.interface';
import { ShellRunnerService } from '../runner/shell-runner.service';

export type DetectedFramework =
  | 'next'
  | 'nuxt'
  | 'astro'
  | 'sveltekit'
  | 'vite'
  | 'node'
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'python'
  | 'static'
  | 'unknown';

/**
 * BuildPlan — the detection result exposed to the API/dashboard.
 * Returned by POST /deployments/detect and used to render the
 * "Detected: Next.js 15.2.0 / Build: npm run build" UI.
 */
export interface BuildPlan {
  framework: string;
  frameworkLabel: string;
  frameworkVersion?: string;
  buildCommand: string;
  /** The dependency install for the Python family. */
  installCommand?: string;
  startCommand: string;
  outputDirectory: string;
  port: number;
  runtime: string;
  monorepo?: string;
  /** The monorepo app this plan is for, when the root itself is not one. */
  buildTarget?: string;
  /** The applications a monorepo holds, when it holds more than one. */
  apps?: Array<{
    path: string;
    name: string;
    framework: string;
    frameworkLabel: string;
  }>;
  detectedAt: string;
}

interface FrameworkInfo {
  framework: DetectedFramework;
  buildCommand?: string;
  /** The dependency install the repository asks for (Python builders). */
  installCommand?: string;
  startCommand: string;
  port: number;
  outputDir: string;
  /** Monorepo tool detected (pnpm workspaces, turborepo, nx) */
  monorepo?: string;
  /** Version extracted from package.json deps (e.g. "15.2.0") */
  version?: string;
}

// Map framework IDs to human-readable labels + package names for version lookup
const FRAMEWORK_META: Record<string, { label: string; pkg: string }> = {
  next: { label: 'Next.js', pkg: 'next' },
  nuxt: { label: 'Nuxt', pkg: 'nuxt' },
  astro: { label: 'Astro', pkg: 'astro' },
  sveltekit: { label: 'SvelteKit', pkg: '@sveltejs/kit' },
  vite: { label: 'Vite', pkg: 'vite' },
  node: { label: 'Node.js', pkg: '' },
  static: { label: 'Static', pkg: '' },
  django: { label: 'Django', pkg: 'django' },
  flask: { label: 'Flask', pkg: 'flask' },
  fastapi: { label: 'FastAPI', pkg: 'fastapi' },
  python: { label: 'Python', pkg: '' },
  unknown: { label: 'Unknown', pkg: '' },
};

@Injectable()
export class NodeBuildpackProvider implements BuildProvider {
  constructor(private shell: ShellRunnerService) {}

  name = 'node-buildpack';
  private readonly logger = new Logger(NodeBuildpackProvider.name);

  // The workspace lifecycle (prepare / fetch source / cleanup) is owned by
  // BuildRunnerService. This provider only reads from `context.workspace`.

  // ─── Public: pre-deploy detection ─────────────────────────────────────────

  /**
   * Detect the framework from a workspace path and return a BuildPlan.
   * Used by POST /deployments/detect to show the user what was detected.
   */
  async detectFramework(ws: string): Promise<FrameworkInfo> {
    return this.detect(ws);
  }

  /** Convert a FrameworkInfo into the API-facing BuildPlan shape. */
  toBuildPlan(info: FrameworkInfo): BuildPlan {
    const meta = FRAMEWORK_META[info.framework] ?? FRAMEWORK_META.unknown;
    return {
      framework: info.framework,
      frameworkLabel: meta.label,
      frameworkVersion: info.version,
      buildCommand: info.buildCommand || 'npm run build',
      installCommand: info.installCommand,
      startCommand: info.startCommand,
      outputDirectory: info.outputDir,
      port: info.port,
      runtime: 'Node 20',
      monorepo: info.monorepo,
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * The applications a monorepo holds.
   *
   * A repository that is more than one application — a web front end and an
   * API behind it — is detected as one, and this is where the rest are
   * found: the workspace globs are expanded, and every directory with a
   * package.json is asked what it is. The wizard offers them, so a
   * repository that needs a front end AND a backend leaves the wizard as
   * two deployments instead of half an application.
   */
  async listMonorepoApps(ws: string): Promise<
    Array<{
      path: string;
      name: string;
      framework: string;
      frameworkLabel: string;
    }>
  > {
    const tool = this.detectMonorepo(ws);
    if (!tool) return [];

    const globs: string[] = [];
    if (tool === 'pnpm') {
      // pnpm-workspace.yaml: `packages:` — a small YAML list; parse the
      // entries without pulling in a YAML dependency.
      try {
        const yaml = readFileSync(join(ws, 'pnpm-workspace.yaml'), 'utf-8');
        const inPackages = yaml.split('\n').reduce<string[]>((acc, row) => {
          const match = /^\s*-\s*['"]?([^\s'"]+)['"]?\s*$/.exec(row);
          if (match) acc.push(match[1]);
          return acc;
        }, []);
        globs.push(...inPackages);
      } catch {
        /* no readable pnpm-workspace.yaml */
      }
    }
    const pkg = this.readPackage(ws);
    if (Array.isArray(pkg?.workspaces)) globs.push(...pkg.workspaces);
    else if (
      pkg?.workspaces &&
      typeof pkg.workspaces === 'object' &&
      Array.isArray((pkg.workspaces as any).packages)
    ) {
      globs.push(...(pkg.workspaces as any).packages);
    }

    // Expand the globs. Only the shapes that actually appear in the wild:
    // a literal directory, or one `*` level under a literal root.
    const dirs = new Set<string>();
    for (const pattern of globs) {
      const clean = pattern.replace(/\/+$/, '');
      if (!clean.includes('*')) {
        if (existsSync(join(ws, clean, 'package.json'))) dirs.add(clean);
        continue;
      }
      const [root, leaf] = clean.split('*');
      try {
        for (const entry of readdirSync(join(ws, root || '.'), {
          withFileTypes: true,
        })) {
          if (!entry.isDirectory()) continue;
          if (
            leaf &&
            leaf !== '/' &&
            !leaf
              .replace(/^\/+/, '')
              .split('/')
              .every((part) => !part || part === '*')
          )
            continue;
          const rel = `${root}${entry.name}`;
          if (existsSync(join(ws, rel, 'package.json'))) dirs.add(rel);
        }
      } catch {
        /* the glob's root does not exist */
      }
    }

    const found = await Promise.all(
      Array.from(dirs)
        .sort()
        .map(async (rel) => {
          const appWs = join(ws, rel);
          const appPkg = this.readPackage(appWs);
          const detected = await this.detect(appWs);
          const meta =
            FRAMEWORK_META[detected.framework] ?? FRAMEWORK_META.unknown;
          return {
            path: rel,
            name: appPkg?.name ?? rel.split('/').pop() ?? rel,
            framework: detected.framework,
            frameworkLabel: meta.label,
          };
        }),
    );
    // A workspace member that runs nothing is a library, not an application
    // — the picker is for the things that answer.
    return found.filter((app) => app.framework !== 'unknown');
  }

  // ─── Public BuildProvider interface ────────────────────────────────────────

  async validate(context: BuildContext): Promise<void> {
    // The runner has already fetched the source into context.workspace.
    const detected = await this.detect(context.workspace);
    if (detected.framework === 'unknown') {
      throw new Error(
        'Could not detect a supported framework. ' +
          'Ensure your repository has one of: next.config.js, nuxt.config.ts, astro.config.mjs, vite.config.ts, package.json, or an index.html file. ' +
          'Alternatively, add a Dockerfile and specify its path in Advanced settings.',
      );
    }
    this.logger.log(
      `[NodeBuildpackProvider] Validate OK — detected: ${detected.framework} (port=${detected.port}, outputDir=${detected.outputDir})`,
    );
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const { envVars, onLog, workspace: ws } = context;
    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (l: string) => {
      logs.push(l);
      onLog(l);
    };

    try {
      const detected = await this.detect(ws);

      // Write .env file if env vars are present — passed as a build secret
      // so values aren't exposed in build args/logs, and also COPY'd into
      // the runtime stage for apps that read .env at startup.
      if (envVars.length > 0) {
        const envPath = join(ws, '.fidscript.env');
        writeFileSync(
          envPath,
          envVars.map((e) => `${e.key}=${e.value}`).join('\n'),
          { mode: 0o600 },
        );
        addLog(
          `[NodeBuildpackProvider] Wrote ${envVars.length} env vars to .fidscript.env`,
        );
      }

      const dockerfile = this.generateDockerfile(detected, context.buildTarget);
      const dfPath = join(ws, 'Dockerfile');
      writeFileSync(dfPath, dockerfile, { mode: 0o644 });
      addLog(
        `[NodeBuildpackProvider] Detected framework: ${detected.framework} (${JSON.stringify({ port: detected.port, outputDir: detected.outputDir, buildCmd: detected.buildCommand, startCmd: detected.startCommand, monorepo: detected.monorepo })})`,
      );
      addLog(
        `[NodeBuildpackProvider] Generated Dockerfile for ${detected.framework}`,
      );

      const imageTag = `fidscript/${context.projectSlug}:${context.releaseVersion}`;
      const buildArgs = detected.monorepo
        ? ` --build-arg BUILD_TARGET=${context.buildTarget || 'web'}`
        : '';
      const envSecret =
        envVars.length > 0
          ? ` --secret id=envfile,src="${join(ws, '.fidscript.env')}"`
          : '';
      addLog(
        `[NodeBuildpackProvider] docker build${buildArgs} -t "${imageTag}" -f "${dfPath}" "${ws}"`,
      );

      // Asynchronous and streaming: a build can run for ten minutes, and
      // blocking the api for that long stops every other request — including
      // the one watching this build.
      await this.shell.runStreaming(
        `docker build${buildArgs}${envSecret} -t "${imageTag}" -f "${dfPath}" "${ws}"`,
        addLog,
        { timeout: 600_000 },
      );

      return {
        imageTag,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: true,
        // The port the app was detected to listen on. The deployment
        // profile's default is only right for Next.js and static sites.
        port: detected.port,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[NodeBuildpackProvider] Build error: ${msg}`);
      return {
        imageTag: `fidscript/${context.projectSlug}:${context.releaseVersion}`,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: false,
        error: msg,
      };
    }
  }

  // ─── Framework detection ───────────────────────────────────────────────────

  /**
   * Detect the framework from files in the workspace root.
   * Checks config files first, then package.json scripts, then static HTML.
   */
  private async detect(ws: string): Promise<FrameworkInfo> {
    // 1. Next.js
    if (this.hasConfigFile(ws, 'next.config')) return this.detectNext(ws);

    // 2. Nuxt
    if (this.hasConfigFile(ws, 'nuxt.config')) return this.detectNuxt(ws);

    // 3. Astro
    if (this.hasConfigFile(ws, 'astro.config')) return this.detectAstro(ws);

    // 4. SvelteKit (svelte.config + @sveltejs/kit dependency)
    if (this.hasConfigFile(ws, 'svelte.config'))
      return this.detectSvelteKit(ws);

    // 5. Vite
    if (this.hasConfigFile(ws, 'vite.config')) return this.detectVite(ws);

    // 5b. Python — requirements.txt, pyproject.toml, Pipfile. A repository
    // that carries any of them is a Python application even when a stray
    // package.json sits beside it.
    const python = this.detectPythonMarker(ws);
    if (python) return python;

    // 6. Fall back to package.json script inspection
    if (existsSync(join(ws, 'package.json'))) {
      const pkg = this.readPackage(ws);
      const scripts = pkg?.scripts || {};
      const allScripts = Object.values(scripts).join(' ');

      if (allScripts.includes('next ')) return this.detectNext(ws);
      if (allScripts.includes('nuxt ')) return this.detectNuxt(ws);
      if (allScripts.includes('astro ')) return this.detectAstro(ws);
      if (allScripts.includes('vite ')) return this.detectVite(ws);
      // React Native / Expo — treat as node (expo has its own build system)
      if (
        allScripts.includes('expo ') ||
        pkg?.dependencies?.['expo'] ||
        pkg?.devDependencies?.['expo']
      ) {
        return this.detectNode(ws);
      }
      // Plain Node.js with build/start/dev scripts
      if (scripts.dev || scripts.start || scripts.build)
        return this.detectNode(ws);
    }

    // 7. Static HTML — last resort before unknown
    if (existsSync(join(ws, 'index.html'))) return this.detectStatic();

    // 8. A monorepo root is not itself an application — it holds them. Say
    // so, so the caller can look inside instead of giving up.
    const monorepo = this.detectMonorepo(ws);
    if (monorepo)
      return {
        framework: 'unknown',
        startCommand: '',
        port: 3000,
        outputDir: '',
        monorepo,
      };

    return {
      framework: 'unknown',
      startCommand: '',
      port: 3000,
      outputDir: '',
    };
  }

  /** Check if any of .js/.mjs/.ts/.cjs variants of a config file exist. */
  private hasConfigFile(ws: string, baseName: string): boolean {
    return ['.js', '.mjs', '.ts', '.cjs'].some((ext) =>
      existsSync(join(ws, `${baseName}${ext}`)),
    );
  }

  /** Extract a version string from package.json dependencies/devDependencies. */
  private getVersion(
    pkg: Record<string, any> | null,
    depName: string,
  ): string | undefined {
    if (!pkg || !depName) return undefined;
    const raw = pkg.dependencies?.[depName] || pkg.devDependencies?.[depName];
    if (!raw) return undefined;
    // Strip workspace:, ^, ~, >= prefixes
    const cleaned = raw.replace(/^(workspace:)?[~^>=<\s]+/, '');
    return cleaned || undefined;
  }

  private detectNext(ws: string): FrameworkInfo {
    const monorepo = this.detectMonorepo(ws);
    const pkg = this.readPackage(ws);
    const scripts = pkg?.scripts || {};
    const version = this.getVersion(pkg, 'next');

    if (monorepo === 'turbo' || monorepo === 'pnpm') {
      return {
        framework: 'next',
        buildCommand: scripts.build || 'npm run build',
        startCommand: 'npx next start',
        port: 3000,
        outputDir: '.next',
        monorepo,
        version,
      };
    }

    return {
      framework: 'next',
      buildCommand: scripts.build || 'npm run build',
      startCommand: scripts.start || 'npx next start',
      port: 3000,
      outputDir: '.next',
      monorepo,
      version,
    };
  }

  private detectNuxt(ws: string): FrameworkInfo {
    const pkg = this.readPackage(ws);
    const scripts = pkg?.scripts || {};
    return {
      framework: 'nuxt',
      buildCommand: scripts.build || 'nuxt build',
      startCommand: scripts.start || 'node .output/server/index.mjs',
      port: 3000,
      outputDir: '.output',
      version: this.getVersion(pkg, 'nuxt'),
    };
  }

  private detectAstro(ws: string): FrameworkInfo {
    const pkg = this.readPackage(ws);
    const scripts = pkg?.scripts || {};
    return {
      framework: 'astro',
      buildCommand: scripts.build || 'astro build',
      startCommand: scripts.preview || 'npx astro preview --host --port 4321',
      port: 4321,
      outputDir: 'dist',
      version: this.getVersion(pkg, 'astro'),
    };
  }

  private detectSvelteKit(ws: string): FrameworkInfo {
    const pkg = this.readPackage(ws);
    const scripts = pkg?.scripts || {};
    return {
      framework: 'sveltekit',
      buildCommand: scripts.build || 'vite build',
      startCommand: scripts.preview || 'npx vite preview --host --port 5173',
      port: 5173,
      outputDir: 'build',
      version: this.getVersion(pkg, '@sveltejs/kit'),
    };
  }

  private detectVite(ws: string): FrameworkInfo {
    const pkg = this.readPackage(ws);
    const scripts = pkg?.scripts || {};
    return {
      framework: 'vite',
      buildCommand: scripts.build || 'npm run build',
      startCommand: scripts.preview || 'npx vite preview --host',
      port: 4173,
      outputDir: 'dist',
      version: this.getVersion(pkg, 'vite'),
    };
  }

  private detectNode(ws: string): FrameworkInfo {
    const pkg = this.readPackage(ws);
    const scripts = pkg?.scripts || {};
    return {
      framework: 'node',
      buildCommand: scripts.build,
      startCommand: scripts.start ? 'npm start' : 'node server.js',
      port: 3000,
      outputDir: '.',
    };
  }

  private detectStatic(): FrameworkInfo {
    return {
      framework: 'static',
      startCommand: 'npx serve -s . -l 8080',
      port: 8080,
      outputDir: '.',
    };
  }

  /** The Python application a workspace holds, if it holds one. */
  private detectPythonMarker(ws: string): FrameworkInfo | null {
    const hasRequirements = existsSync(join(ws, 'requirements.txt'));
    const hasPyproject = existsSync(join(ws, 'pyproject.toml'));
    const hasPipfile = existsSync(join(ws, 'Pipfile'));
    const hasManage = existsSync(join(ws, 'manage.py'));
    if (!hasRequirements && !hasPyproject && !hasPipfile) return null;

    const deps = this.readPythonDeps(ws);
    const isDjango = hasManage || deps.some((d) => d.startsWith('django'));
    const isFlask = deps.some((d) => d === 'flask');
    const isFastapi = deps.some((d) => d === 'fastapi' || d === 'uvicorn');

    const install = hasRequirements
      ? 'pip install --no-cache-dir -r requirements.txt'
      : hasPyproject
        ? 'pip install --no-cache-dir .'
        : 'pip install --no-cache-dir pipenv && pipenv install --system --deploy';
    const setInstall = (info: FrameworkInfo): FrameworkInfo => ({
      ...info,
      installCommand: install,
    });

    if (isDjango) {
      const wsgi = this.guessDjangoModule(ws);
      return setInstall({
        framework: 'django',
        startCommand: `gunicorn --workers 2 --threads 4 --bind 0.0.0.0:${'${PORT:-8000}'} ${wsgi}.wsgi:application`,
        port: 8000,
        outputDir: '.',
      });
    }
    if (isFastapi) {
      const module = this.guessPythonModule(ws, ['main', 'app']);
      const app = this.pythonHasText(join(ws, `${module}.py`), '@app.')
        ? module
        : 'main';
      return setInstall({
        framework: 'fastapi',
        startCommand: `uvicorn ${app}:app --host 0.0.0.0 --port ${'${PORT:-8000}'}`,
        port: 8000,
        outputDir: '.',
      });
    }
    if (isFlask) {
      const module = this.guessPythonModule(ws, ['app', 'wsgi', 'server']);
      return setInstall({
        framework: 'flask',
        startCommand: `gunicorn --workers 2 --threads 4 --bind 0.0.0.0:${'${PORT:-8000}'} ${module}:app`,
        port: 8000,
        outputDir: '.',
      });
    }
    return setInstall({
      framework: 'python',
      startCommand: `sh -c "python main.py || python app.py"`,
      port: 8000,
      outputDir: '.',
    });
  }

  /** The dependency names a requirements.txt / pyproject.toml / Pipfile declares. */
  private readPythonDeps(ws: string): string[] {
    const deps: string[] = [];
    try {
      const req = readFileSync(join(ws, 'requirements.txt'), 'utf-8');
      for (const line of req.split('\n')) {
        const name = line
          .trim()
          .split(/[=<>~!\[\s]/)[0]
          .toLowerCase();
        if (name && !name.startsWith('#') && !name.startsWith('-'))
          deps.push(name);
      }
    } catch {
      /* no requirements.txt */
    }
    try {
      const pyproject = readFileSync(join(ws, 'pyproject.toml'), 'utf-8');
      for (const match of pyproject.matchAll(
        /"(?:django|flask|fastapi|uvicorn)[=<>~!][^"]*"/gi,
      )) {
        deps.push(match[0].replace(/["=<>~!].*/, '').toLowerCase());
      }
    } catch {
      /* no pyproject.toml */
    }
    try {
      const pipfile = readFileSync(join(ws, 'Pipfile'), 'utf-8');
      for (const match of pipfile.matchAll(
        /^(?:django|flask|fastapi|uvicorn)\s*=/gim,
      )) {
        deps.push(match[0].split('=')[0].trim().toLowerCase());
      }
    } catch {
      /* no Pipfile */
    }
    return deps;
  }

  /** The Django settings module: the directory whose settings.py sits next to manage.py. */
  private guessDjangoModule(ws: string): string {
    try {
      const entries = readdirSync(ws, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          existsSync(join(ws, entry.name, 'settings.py'))
        ) {
          return entry.name;
        }
      }
      // manage.py names it: `os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'x.wsgi...')`
      const manage = readFileSync(join(ws, 'manage.py'), 'utf-8');
      const match =
        /DJANGO_SETTINGS_MODULE['"],\s*['"]([A-Za-z0-9_.]+)\.wsgi/.exec(manage);
      if (match) return match[1];
    } catch {
      /* fall through */
    }
    return 'app';
  }

  /** The most likely application module, by the names Python servers use. */
  private guessPythonModule(ws: string, candidates: string[]): string {
    for (const candidate of candidates) {
      for (const ext of ['.py', '/__init__.py']) {
        if (existsSync(join(ws, `${candidate}${ext}`))) return candidate;
      }
    }
    return candidates[0];
  }

  private pythonHasText(path: string, needle: string): boolean {
    try {
      return readFileSync(path, 'utf-8').includes(needle);
    } catch {
      return false;
    }
  }

  /**
   * Detect monorepo tool from workspace root files.
   * Priority: pnpm-lock.yaml > turbo.json > nx.json > lerna > npm workspaces.
   * A repo can have both turbo.json AND pnpm-lock.yaml — pnpm wins for install
   * (npm can't handle workspace:* deps) but turbo still orchestrates builds.
   */
  private detectMonorepo(ws: string): string | undefined {
    if (existsSync(join(ws, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(join(ws, 'turbo.json'))) return 'turbo';
    if (existsSync(join(ws, 'nx.json'))) return 'nx';
    if (existsSync(join(ws, 'lerna.json'))) return 'lerna';
    const pkg = this.readPackage(ws);
    if (pkg?.workspaces) return 'npm';
    return undefined;
  }

  private readPackage(ws: string): Record<string, any> | null {
    const pkgPath = join(ws, 'package.json');
    if (!existsSync(pkgPath)) return null;
    try {
      return JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  // ─── Dockerfile generation ─────────────────────────────────────────────────

  private generateDockerfile(
    info: FrameworkInfo,
    buildTarget?: string,
  ): string {
    switch (info.framework) {
      case 'next':
        return this.dockerfileNext(info, buildTarget);
      case 'nuxt':
        return this.dockerfileNuxt(info);
      case 'astro':
        return this.dockerfileStaticLike(info);
      case 'sveltekit':
        return this.dockerfileSvelteKit(info);
      case 'vite':
        return this.dockerfileVite(info);
      case 'static':
        return this.dockerfileStatic();
      case 'django':
      case 'flask':
      case 'fastapi':
      case 'python':
        return this.dockerfilePython(info);
      case 'node':
      default:
        return this.dockerfileNode(info);
    }
  }

  // ── Next.js ──

  private dockerfileNext(info: FrameworkInfo, buildTarget?: string): string {
    if (info.monorepo === 'turbo' || info.monorepo === 'pnpm') {
      return this.dockerfileNextMonorepo(info, buildTarget);
    }
    const installCmd = `npm ci || npm install --legacy-peer-deps`;
    return `
# ─── Stage 1: Dependencies ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN ${installCmd}

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next telemetry disable 2>/dev/null || true
RUN ${info.buildCommand || 'npm run build'}

# ─── Stage 3: Runtime ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 fidscript
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \\
  CMD wget -qO- http://localhost:${info.port}/ || exit 1
USER fidscript
CMD ["sh", "-c", "${info.startCommand}"]
`;
  }

  private dockerfileNextMonorepo(
    info: FrameworkInfo,
    buildTarget?: string,
  ): string {
    const isPnpm = info.monorepo === 'pnpm';
    const target = buildTarget || 'web';
    const installCmd = isPnpm
      ? `corepack enable && corepack prepare pnpm@latest --activate && pnpm install --ignore-scripts`
      : `npm ci || npm install --legacy-peer-deps`;
    const activatePnpm = isPnpm
      ? `corepack enable && corepack prepare pnpm@latest --activate`
      : 'true';
    const buildCmd = isPnpm
      ? `pnpm run build`
      : `${info.buildCommand || 'npm run build'}`;
    const depsCopy = isPnpm
      ? 'COPY . .'
      : 'COPY package.json package-lock.json* ./';
    return `
# ─── Stage 1: Install monorepo deps ─────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
${depsCopy}
RUN ${installCmd}

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ${activatePnpm} && \\
    npx next telemetry disable 2>/dev/null || true && \\
    ${buildCmd}

# ─── Stage 3: Runtime ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 fidscript
COPY --from=builder /app .
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \\
  CMD wget -qO- http://localhost:${info.port}/ || exit 1
USER fidscript
CMD ["sh", "-c", "${info.startCommand}"]
`;
  }

  // ── Nuxt ──

  private dockerfileNuxt(info: FrameworkInfo): string {
    const installCmd = `npm ci || npm install --legacy-peer-deps`;
    return `
# ─── Stage 1: Dependencies ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN ${installCmd}

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── Stage 3: Runtime ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 fidscript
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/nuxt.config.ts ./
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \\
  CMD wget -qO- http://localhost:${info.port}/ || exit 1
USER fidscript
CMD ["sh", "-c", "${info.startCommand}"]
`;
  }

  // ── Astro (static output → served by `serve`) ──

  private dockerfileStaticLike(info: FrameworkInfo): string {
    const installCmd = `npm ci || npm install --legacy-peer-deps`;
    return `
# ─── Stage 1: Dependencies ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN ${installCmd}

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ${info.buildCommand || 'npm run build'}

# ─── Stage 3: Runtime (static file server) ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve && \\
    addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 fidscript
COPY --from=builder /app/${info.outputDir} ./
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD wget -qO- http://localhost:${info.port}/ || exit 1
USER fidscript
CMD ["sh", "-c", "npx serve -s . -l ${info.port}"]
`;
  }

  // ── SvelteKit (adapter-node → node server) ──

  private dockerfileSvelteKit(info: FrameworkInfo): string {
    const installCmd = `npm ci || npm install --legacy-peer-deps`;
    return `
# ─── Stage 1: Dependencies ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN ${installCmd}

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ${info.buildCommand || 'npm run build'}

# ─── Stage 3: Runtime ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 fidscript
COPY --from=builder /app/${info.outputDir} ./${info.outputDir}
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:${info.port}/ || exit 1
USER fidscript
CMD ["sh", "-c", "node ${info.outputDir}/index.js"]
`;
  }

  // ── Vite ──

  private dockerfileVite(info: FrameworkInfo): string {
    const installCmd = `npm ci || npm install --legacy-peer-deps`;
    return `
# ─── Stage 1: Dependencies ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN ${installCmd}

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ${info.buildCommand || 'npm run build'}

# ─── Stage 3: Runtime (static file server) ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve && \\
    addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 fidscript
COPY --from=builder /app/${info.outputDir} ./
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD wget -qO- http://localhost:${info.port}/ || exit 1
USER fidscript
CMD ["sh", "-c", "npx serve -s . -l ${info.port}"]
`;
  }

  // ── Node.js custom ──

  private dockerfileNode(info: FrameworkInfo): string {
    const installCmd = `npm ci || npm install --legacy-peer-deps`;
    const buildStep = info.buildCommand ? `RUN ${info.buildCommand}` : '';
    return `
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN ${installCmd}
COPY . .
${buildStep}
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:${info.port}/ || exit 1
CMD ["sh", "-c", "${info.startCommand}"]
`;
  }

  // ── Python — Django, Flask, FastAPI, and plain services ──

  /**
   * One runtime for the Python family. The start command differs (gunicorn
   * for the WSGI pair, uvicorn for FastAPI); the shape is the same: slim
   * image, dependencies, the process bound to the port the platform
   * health-checks.
   */
  private dockerfilePython(info: FrameworkInfo): string {
    return `
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=${info.port}
COPY requirements.txt* pyproject.toml* Pipfile* ./
RUN ${info.installCommand ?? 'pip install --no-cache-dir -r requirements.txt'}
COPY . .
EXPOSE ${info.port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${'${PORT:-8000}'}')" || exit 1
CMD ["sh", "-c", "${info.startCommand}"]
`;
  }

  /** The dependency install the repository asks for, in the order it asks. */
  private pythonInstallCommand(): string {
    // The workspace was copied whole: requirements.txt wins when present,
    // pyproject next, Pipfile last — the same order detection read them.
    return 'pip install --no-cache-dir -r requirements.txt 2>/dev/null || pip install --no-cache-dir . 2>/dev/null || pip install --no-cache-dir pipenv && pipenv install --system --deploy';
  }

  // ── Static HTML ──

  private dockerfileStatic(): string {
    return `
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve
COPY . .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD wget -qO- http://localhost:8080/ || exit 1
CMD ["sh", "-c", "npx serve -s . -l 8080"]
`;
  }
}
