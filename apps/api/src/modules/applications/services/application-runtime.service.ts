import { Injectable, Logger } from '@nestjs/common';
import { ShellRunnerService } from '@/modules/deployments/runner/shell-runner.service';

/**
 * The containers that mean an application is running.
 *
 * The installer's record is not the whole truth: an application can be
 * running as its OWN stack — the Instant BaaS, the WhatsApp platform and the
 * npm registry each have a compose project of their own, and the installer
 * never knew about them. The screen said "not installed" for three
 * applications that were running the whole time.
 */
const APPLICATION_CONTAINERS: Record<string, string[]> = {
  instant: ['fidscript_instant_server', 'self-hosting-server-1'],
  whatsapp: ['fidscript_evolution_api', 'fidscript_whatsapp_frontend', 'whatsapp-nextmavens'],
  'package-manager': ['fidscript_npm_registry', 'nextmavens-verdaccio'],
  observability: ['fidscript_prometheus', 'fidscript_grafana'],
  'app-runtime': ['fidscript_registry'],
};

/** What is running on this host, by container name. */
@Injectable()
export class ApplicationRuntimeService {
  private readonly logger = new Logger(ApplicationRuntimeService.name);

  constructor(private shell: ShellRunnerService) {}

  /**
   * The containers that are running right now.
   *
   * A failure here is not fatal: the catalogue falls back to the installer's
   * record, which is the next best thing to know.
   */
  async runningContainers(): Promise<Set<string>> {
    try {
      const out = await this.shell.runStreaming(
        'docker ps --format "{{.Names}}"',
        () => {},
        { timeout: 10_000 },
      );
      return new Set(out.split('\n').map((n: string) => n.trim()).filter(Boolean));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[applications] Could not list the running containers: ${msg}`);
      return new Set();
    }
  }

  /** Whether one of an application's containers is up. */
  isRunning(applicationId: string, running: Set<string>): boolean {
    return (APPLICATION_CONTAINERS[applicationId] ?? []).some((name) => running.has(name));
  }
}
