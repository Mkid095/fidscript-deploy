import type { IReverseProxyProvider } from './providers/reverse-proxy.provider';
import type { ICertificateProvider } from './providers/certificate.provider';

// Plain string tokens — valid NestJS injection tokens (string | symbol | class).
// Step constructors receive concrete instances via useExisting in the module.
export const PROXY_PROVIDER = 'PROXY_PROVIDER';
export const CERTIFICATE_PROVIDER = 'CERTIFICATE_PROVIDER';
