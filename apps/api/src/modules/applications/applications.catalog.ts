/**
 * The applications an operator can have on a platform.
 *
 * The **catalogue** is the product view: what an application is called, what
 * it does, and where its console is. The installer's manifests
 * (`installer/addons/<id>/addon.yml`) carry the title and the summary, and this
 * file carries the rest — where the console lives, and which icon the
 * dashboard draws.
 *
 * An application is either part of the **core** (the platform itself — the
 * deployment engine and the mail server are always there) or an **add-on**
 * the operator installs from this screen.
 */

/** How an application reaches the operator. */
export interface ApplicationPresentation {
  /**
   * The hostname under the platform's domain, or null when the application
   * has no console of its own (an internal registry, say).
   */
  host: string | null;
  /** A path on that host, when the console is not at the root. */
  path: string | null;
  /**
   * A published port, when the console is not routed through the edge.
   * Null means the hostname above is the way in.
   */
  port: number | null;
  /** The icon the dashboard draws. */
  icon: string;
  /** Whether the operator can install it from this screen. */
  installable: boolean;
  /**
   * The application's own API host, when it speaks one over HTTP. This is
   * the data plane's address — what an agent or a library connects to, as
   * opposed to the console a human opens.
   */
  apiHost: string | null;
  /** The application's own MCP server, when it has one. */
  mcp: ApplicationMcp | null;
}

/**
 * An application's MCP server.
 *
 * The platform has an MCP server of its own (the control plane: deployments,
 * queues, mail). An application with its own protocol has one too — the data
 * plane's MCP speaks queries and permissions. Both belong in the same hub,
 * so an agent operator finds them in one place rather than guessing which
 * is which.
 */
export interface ApplicationMcp {
  /** The npm package that provides the server. */
  package: string;
  /**
   * The hosts the server reads from its environment, by the variable name
   * it uses. The values are host labels — they are resolved against the
   * platform's domain.
   */
  hosts: Record<string, string>;
}

/**
 * The applications that are part of the platform itself.
 *
 * They are always present — there is nothing to install — but they belong on
 * the same screen, because the operator's question is "what can this platform
 * do for me", not "what is in the core".
 */
export const CORE_APPLICATIONS: Record<string, ApplicationPresentation> = {
  deployment: {
    host: null, // the dashboard itself
    path: '/projects',
    port: null,
    icon: 'rocket',
    installable: false,
    apiHost: null,
    mcp: null,
  },
  email: {
    host: 'stalwart-admin',
    path: '/admin',
    port: null,
    icon: 'mail',
    installable: false,
    apiHost: null,
    mcp: null,
  },
};

/** The applications the operator installs from the Applications screen. */
export const ADDON_APPLICATIONS: Record<string, ApplicationPresentation> = {
  whatsapp: {
    host: 'whatsapp',
    path: null,
    port: null,
    icon: 'chat',
    installable: true,
    apiHost: null,
    mcp: null,
  },
  instant: {
    host: 'instant',
    path: null,
    port: null,
    icon: 'hierarchy',
    installable: true,
    // The data plane's own address. The Instant server answers queries,
    // realtime and storage on this host.
    apiHost: 'apiinstant',
    // The data plane's MCP server. It is the package the Instant console's
    // own setup page tells an agent to install.
    mcp: {
      package: '@fidscript/instant-mcp',
      hosts: {
        INSTANT_API_HOST: 'apiinstant',
        INSTANT_DASH_HOST: 'instant',
        INSTANT_MAVEN_HOST: 'maven',
      },
    },
  },
  'package-manager': {
    host: 'registry',
    path: null,
    port: null,
    icon: 'package',
    installable: true,
    apiHost: null,
    mcp: null,
  },
  observability: {
    host: null,
    path: null,
    // Grafana is published on the host rather than routed through the edge.
    port: 3000,
    icon: 'analytics',
    installable: true,
    apiHost: null,
    mcp: null,
  },
  'app-runtime': {
    // An internal image registry — no console to open.
    host: null,
    path: null,
    port: null,
    icon: 'cube',
    installable: true,
    apiHost: null,
    mcp: null,
  },
};
