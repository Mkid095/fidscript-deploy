import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'net';
import { ShellRunnerService } from './shell-runner.service';

/**
 * The add-on's registry, by the name its container has on the platform's
 * own network. It is the default because the add-on is the only thing that
 * provides one — an override exists for a registry somewhere else.
 */
const DEFAULT_REGISTRY_URL = 'fidscript_registry:5000';

/**
 * The platform's image registry.
 *
 * A built image lives in the host's Docker daemon and nowhere else. If the
 * daemon's storage is pruned — and `docker system prune` is a thing people
 * run — the image is gone, and a deployment cannot be rolled back to it. The
 * `app-runtime` add-on provides a registry for exactly this: a copy that
 * survives the build host.
 *
 * The registry is OPTIONAL. Without it, the deployment engine behaves
 * exactly as it always has: build, run, forget. With it, the image is also
 * pushed, so it is stored durably and can be pulled by another node.
 *
 * The deployment still runs the local image. Pushing is for durability, not
 * for the run — a network round trip and a registry dependency on every
 * deploy would be a new way to fail, for no gain on a single node.
 */
@Injectable()
export class ImageRegistryService {
  private readonly logger = new Logger(ImageRegistryService.name);
  /** Whether we have logged in to the registry in this process. */
  private loggedIn = false;

  constructor(
    private configService: ConfigService,
    private shell: ShellRunnerService,
  ) {}

  /** The registry's address, e.g. `fidscript_registry:5000`. */
  get registryUrl(): string {
    const url = this.configService.get<string>('APP_RUNTIME_REGISTRY_URL', '').trim();
    return url || DEFAULT_REGISTRY_URL;
  }

  /**
   * Whether a registry is there to push to.
   *
   * The address is not the test — the add-on may simply not be installed.
   * This asks the registry itself, so a platform without one is not left
   * failing a login on every build.
   */
  async isAvailable(): Promise<boolean> {
    const [host, port] = this.registryUrl.split(':');
    return new Promise((resolve) => {
      const socket = connect({ host, port: Number(port ?? 5000) });
      const finish = (result: boolean) => {
        socket.destroy();
        resolve(result);
      };
      socket.setTimeout(2000);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
    });
  }

  /**
   * Push a built image to the registry.
   *
   * @returns the registry-qualified tag, or null when there is no registry.
   * @throws when the push fails — the caller decides whether that matters.
   */
  async publish(localImageTag: string): Promise<string | null> {
    const registry = this.registryUrl;
    if (!(await this.isAvailable())) {
      this.logger.log('[registry] No registry is reachable — the image stays local.');
      return null;
    }

    const remoteTag = `${registry}/${localImageTag}`;

    await this.login();
    await this.shell.runStreaming(
      `docker tag "${localImageTag}" "${remoteTag}" && docker push "${remoteTag}"`,
      (line) => this.logger.log(`[registry] ${line}`),
      { timeout: 300_000 },
    );

    this.logger.log(`[registry] Pushed ${remoteTag}`);
    return remoteTag;
  }

  /**
   * Authenticate to the registry.
   *
   * The password never appears in a command line: it goes in on stdin.
   */
  private async login(): Promise<void> {
    if (this.loggedIn) return;
    const registry = this.registryUrl;

    const username = this.configService.get<string>('APP_RUNTIME_REGISTRY_USERNAME', 'admin');
    const password = this.configService.get<string>('APP_RUNTIME_REGISTRY_PASSWORD', '');
    if (!password) {
      throw new Error(
        'The registry password is not set. The platform reads it from ' +
          'APP_RUNTIME_REGISTRY_PASSWORD_FILE — check that the app-runtime ' +
          "add-on's secret was generated.",
      );
    }

    await this.shell.runStreaming(
      `printf '%s' "${password.replace(/"/g, '\\"')}" | docker login --username "${username}" --password-stdin "${registry}"`,
      (line) => this.logger.log(`[registry] ${line}`),
      { timeout: 60_000 },
    );
    this.loggedIn = true;
  }
}
