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
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import {
  BuildProvider,
  BuildContext,
  BuildResult,
} from './build-provider.interface';

export type DetectedFramework =
  | 'next'
  | 'nuxt'
  | 'astro'
  | 'sveltekit'
  | 'vite'
  | 'node'
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
  startCommand: string;
  outputDirectory: string;
  port: number;
  runtime: string;
  monorepo?: string;
  detectedAt: string;
}

interface FrameworkInfo {
  framework: DetectedFramework;
  buildCommand?: string;
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
  next:      { label: 'Next.js',   pkg: 'next' },
  nuxt:      { label: 'Nuxt',      pkg: 'nuxt' },
  astro:     { label: 'Astro',     pkg: 'astro' },
  sveltekit: { label: 'SvelteKit', pkg: '@sveltejs/kit' },
  vite:      { label: 'Vite',      pkg: 'vite' },
  node:      { label: 'Node.js',   pkg: '' },
  static:    { label: 'Static',    pkg: '' },
  unknown:   { label: 'Unknown',   pkg: '' },
};

@Injectable()
export class NodeBuildpackProvider implements BuildProvider {
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
      startCommand: info.startCommand,
      outputDirectory: info.outputDir,
      port: info.port,
      runtime: 'Node 20',
      monorepo: info.monorepo,
      detectedAt: new Date().toISOString(),
    };
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
    this.logger.log(`[NodeBuildpackProvider] Validate OK — detected: ${detected.framework} (port=${detected.port}, outputDir=${detected.outputDir})`);
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const { envVars, onLog, workspace: ws } = context;
    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      const detected = await this.detect(ws);

      // Write .env file if env vars are present — passed as a build secret
      // so values aren't exposed in build args/logs, and also COPY'd into
      // the runtime stage for apps that read .env at startup.
      if (envVars.length > 0) {
        const envPath = join(ws, '.fidscript.env');
        writeFileSync(envPath, envVars.map(e => `${e.key}=${e.value}`).join('\n'), { mode: 0o600 });
        addLog(`[NodeBuildpackProvider] Wrote ${envVars.length} env vars to .fidscript.env`);
      }

      const dockerfile = this.generateDockerfile(detected, context.buildTarget);
      const dfPath = join(ws, 'Dockerfile');
      writeFileSync(dfPath, dockerfile, { mode: 0o644 });
      addLog(`[NodeBuildpackProvider] Detected framework: ${detected.framework} (${JSON.stringify({ port: detected.port, outputDir: detected.outputDir, buildCmd: detected.buildCommand, startCmd: detected.startCommand, monorepo: detected.monorepo })})`);
      addLog(`[NodeBuildpackProvider] Generated Dockerfile for ${detected.framework}`);

      const imageTag = `fidscript/${context.projectSlug}:${context.releaseVersion}`;
      const buildArgs = detected.monorepo ? ` --build-arg BUILD_TARGET=${context.buildTarget || 'web'}` : '';
      const envSecret = envVars.length > 0 ? ` --secret id=envfile,src="${join(ws, '.fidscript.env')}"` : '';
      addLog(`[NodeBuildpackProvider] docker build${buildArgs} -t "${imageTag}" -f "${dfPath}" "${ws}"`);

      const output = NodeBuildpackProvider.exec(
        `docker build${buildArgs}${envSecret} -t "${imageTag}" -f "${dfPath}" "${ws}"`,
        { timeout: 600_000 },
      );
      addLog(output);

      return {
        imageTag,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: true,
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

  /**
   * Run a shell command synchronously, returning stdout. Mirrors the semantics
   * of DockerBuildWorkspaceService.exec so that build providers stay shell-call
   * capable without depending on the workspace service (which the runner owns).
   */
  private static exec(cmd: string, opts?: { timeout?: number; env?: Record<string, string> }): string {
    try {
      return execSync(cmd, {
        timeout: opts?.timeout ?? 300_000,
        stdio: 'pipe',
        env: { ...process.env, DOCKER_BUILDKIT: '1', ...opts?.env },
      } as any).toString();
    } catch (err: any) {
      throw new Error(
        `Command failed: ${cmd}\n` +
        `${err?.stderr?.toString() || err?.message || String(err)}`,
      );
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
    if (this.hasConfigFile(ws, 'svelte.config')) return this.detectSvelteKit(ws);

    // 5. Vite
    if (this.hasConfigFile(ws, 'vite.config')) return this.detectVite(ws);

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
      if (allScripts.includes('expo ') || pkg?.dependencies?.['expo'] || pkg?.devDependencies?.['expo']) {
        return this.detectNode(ws);
      }
      // Plain Node.js with build/start/dev scripts
      if (scripts.dev || scripts.start || scripts.build) return this.detectNode(ws);
    }

    // 7. Static HTML — last resort before unknown
    if (existsSync(join(ws, 'index.html'))) return this.detectStatic();

    return { framework: 'unknown', startCommand: '', port: 3000, outputDir: '' };
  }

  /** Check if any of .js/.mjs/.ts/.cjs variants of a config file exist. */
  private hasConfigFile(ws: string, baseName: string): boolean {
    return ['.js', '.mjs', '.ts', '.cjs'].some(ext =>
      existsSync(join(ws, `${baseName}${ext}`)),
    );
  }

  /** Extract a version string from package.json dependencies/devDependencies. */
  private getVersion(pkg: Record<string, any> | null, depName: string): string | undefined {
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

  private generateDockerfile(info: FrameworkInfo, buildTarget?: string): string {
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

  private dockerfileNextMonorepo(info: FrameworkInfo, buildTarget?: string): string {
    const isPnpm = info.monorepo === 'pnpm';
    const target = buildTarget || 'web';
    const installCmd = isPnpm
      ? `corepack enable && corepack prepare pnpm@latest --activate && pnpm install --ignore-scripts`
      : `npm ci || npm install --legacy-peer-deps`;
    const activatePnpm = isPnpm
      ? `corepack enable && corepack prepare pnpm@latest --activate`
      : 'true';
    const buildCmd = isPnpm ? `pnpm run build` : `${info.buildCommand || 'npm run build'}`;
    const depsCopy = isPnpm ? 'COPY . .' : 'COPY package.json package-lock.json* ./';
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
