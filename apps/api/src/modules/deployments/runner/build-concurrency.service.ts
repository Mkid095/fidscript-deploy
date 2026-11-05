import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * How many builds may run at once.
 *
 * A `docker build` is heavy — it compiles, installs and bundles — and the
 * platform's own box is often a small one. Two builds at once on two cores
 * do not run twice as fast; they fight each other, and they can push the
 * machine into swap, which slows the API down with them.
 *
 * Deployments beyond the cap wait in QUEUED, which is what that state is
 * for. A project already waits for its own previous deployment; this is the
 * same idea across projects.
 */
@Injectable()
export class BuildConcurrencyService {
  private readonly logger = new Logger(BuildConcurrencyService.name);
  private active = 0;
  /** The deployments waiting for a slot, in the order they asked. */
  private readonly waiting: Array<() => void> = [];

  constructor(private configService: ConfigService) {}

  /** The cap. One build at a time on a small box, two by default. */
  get maxConcurrent(): number {
    const configured = Number(this.configService.get<string>('MAX_CONCURRENT_BUILDS', '2'));
    return Number.isFinite(configured) && configured >= 1 ? Math.floor(configured) : 2;
  }

  /** How many builds are running right now. */
  get activeCount(): number {
    return this.active;
  }

  /** How many are waiting for a slot. */
  get waitingCount(): number {
    return this.waiting.length;
  }

  /**
   * Wait for a build slot.
   *
   * @returns the function that gives the slot back. It is safe to call more
   *          than once.
   */
  async acquire(): Promise<() => void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return this.releaseOnce();
    }

    this.logger.log(
      `[queue] All ${this.maxConcurrent} build slots are busy — waiting ` +
        `(${this.waiting.length + 1} queued)`,
    );

    await new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });

    this.active++;
    return this.releaseOnce();
  }

  /** Give a build slot back, and hand it to the next in line. */
  private releaseOnce(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = Math.max(0, this.active - 1);
      const next = this.waiting.shift();
      if (next) next();
    };
  }
}
