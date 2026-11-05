/**
 * The platform's own Traefik routing.
 *
 * The installer writes this file when it configures the host, and the
 * platform's setup flow writes it again when it configures the platform.
 * Both must write the SAME routes — when the setup flow wrote only the API
 * and the dashboard, it replaced the installer's file and the mail console,
 * the storage console, the app alias, the metrics endpoint, the install
 * script and the deployed applications' hostname all stopped answering.
 *
 * The rules are single-quoted YAML: a bare backtick is a YAML reserved
 * indicator, so `rule: `Host(...)`` is a parse error that makes Traefik
 * reject the whole file — every route then 404s.
 */
export function buildPlatformRoutes(domain: string, certResolver: string): string {
  const tls = `      tls:\n        certResolver: ${certResolver}`;
  const host = (name: string) => `      rule: 'Host(\`${name}\`)'`;
  return `# Managed by FIDScript Platform — do not edit manually
http:
  middlewares:
    security-headers:
      headers:
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    compress:
      encode gzip
  routers:
    dashboard-app:
${host(`app.${domain}`)}
      service: fidscript-dashboard
      middlewares:
        - security-headers
        - compress
      entryPoints:
        - websecure
${tls}
    dashboard-root:
${host(domain)}
      service: fidscript-dashboard
      middlewares:
        - security-headers
        - compress
      entryPoints:
        - websecure
${tls}
    deployments-wildcard:
      rule: 'HostRegexp(\`^[^.]+\\.[^.]+\\.${domain}$\`)'
      service: fidscript-api
      middlewares:
        - security-headers
        - compress
      entryPoints:
        - websecure
${tls}
    fidscript-api:
      rule: 'PathPrefix(\`/api\`) && !Path(\`/install.sh\`)'
      service: fidscript-api
      middlewares:
        - security-headers
        - compress
      entryPoints:
        - websecure
${tls}
    fidscript-api-host:
      rule: 'Host(\`api.${domain}\`) && PathPrefix(\`/api\`)'
      service: fidscript-api
      middlewares:
        - security-headers
        - compress
      entryPoints:
        - websecure
${tls}
    install-sh:
      rule: 'Path(\`/install.sh\`)'
      service: fidscript-api
      entryPoints:
        - websecure
${tls}
    metrics:
      rule: 'Host(\`${domain}\`) && PathPrefix(\`/metrics\`)'
      service: fidscript-api
      middlewares:
        - security-headers
      entryPoints:
        - websecure
${tls}
    minio-console:
${host(`storage.${domain}`)}
      service: fidscript-minio
      middlewares:
        - security-headers
        - compress
      entryPoints:
        - websecure
${tls}
    jmap:
${host(`jmap.${domain}`)}
      service: fidscript-jmap
      middlewares:
        - security-headers
      entryPoints:
        - websecure
${tls}
    stalwart-admin:
${host(`stalwart-admin.${domain}`)}
      service: fidscript-jmap
      middlewares:
        - security-headers
      entryPoints:
        - websecure
${tls}
    acme-challenge:
      rule: 'PathPrefix(\`/.well-known/acme-challenge/\`)'
      service: fidscript-acme
      middlewares:
        - security-headers
      entryPoints:
        - websecure
  services:
    fidscript-api:
      loadBalancer:
        servers:
          - url: http://fidscript_api:3001
    fidscript-dashboard:
      loadBalancer:
        servers:
          - url: http://fidscript_dashboard:3001
    fidscript-minio:
      loadBalancer:
        servers:
          - url: http://fidscript_minio:9001
    fidscript-jmap:
      loadBalancer:
        servers:
          - url: http://fidscript_stalwart:8080
    fidscript-acme:
      loadBalancer:
        servers:
          - url: http://127.0.0.1:8080
`;
}
