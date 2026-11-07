/**
 * Certificate provider interface — reads certificate state from the proxy.
 * Certificates are issued asynchronously by Traefik's ACME provider.
 */
export interface ICertificateProvider {
  name: string;

  /**
   * Trigger certificate issuance for a domain.
   * Does NOT wait for the cert to be issued — starts the ACME challenge.
   * The verifier polls until the cert is active.
   */
  triggerIssuance(domain: string): Promise<void>;

  /**
   * Poll until the certificate for the domain is active and serving.
   * Returns true when the cert is ready, false when still pending.
   */
  waitForCertificate(domain: string, timeoutMs?: number): Promise<boolean>;

  /**
   * Check if a certificate is currently active for the domain.
   */
  isCertificateActive(domain: string): Promise<boolean>;
}
