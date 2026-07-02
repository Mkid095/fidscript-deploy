/**
 * Type stub for @aws-sdk/client-route-53.
 *
 * The actual package is installed at deploy time (optional dependency).
 * This declaration lets TypeScript compile without the package present
 * during development. The Route53 provider uses dynamic imports so the
 * module is only loaded when Route53 is actually used.
 */
declare module '@aws-sdk/client-route-53' {
  export class Route53Client {
    constructor(config: {
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string };
    });
    send<T>(command: unknown): Promise<T>;
  }

  export class ListHostedZonesCommand {
    constructor(input?: unknown);
  }

  export class ChangeResourceRecordSetsCommand {
    constructor(input: unknown);
  }

  export class ListResourceRecordSetsCommand {
    constructor(input: unknown);
  }
}
