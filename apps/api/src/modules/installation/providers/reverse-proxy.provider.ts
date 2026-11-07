/**
 * Reverse-proxy provider interface — e.g. Traefik.
 * The orchestrator uses this to configure routing rules during installation.
 */
export interface IReverseProxyProvider {
  name: string;

  /**
   * Write the platform routing configuration.
   * For Traefik: renders and writes dynamic.yml.
   * Idempotent — safe to call on re-configuration.
   */
  configurePlatformRouting(domain: string): Promise<void>;

  /**
   * Remove platform routing configuration.
   */
  removePlatformRouting(domain: string): Promise<void>;

  /**
   * Reload the proxy to pick up configuration changes.
   */
  reload(): Promise<void>;

  /**
   * Check if the configuration file is writable.
   */
  isWritable(): Promise<boolean>;
}
