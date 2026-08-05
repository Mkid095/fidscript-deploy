/** DB-07 connection response — password never returned (DB-08 returns one-time password). */
export interface DbConnectionInfo {
  host: string;
  port: number;
  database: string;
  user: string;
  connectionString: string;
  pgbouncerHost?: string;
  pgbouncerPort?: number;
  ssl?: boolean;
  poolSize?: number;
}

export interface ConnectionPanelProps {
  databaseId: string | null;
  dbStatus: {
    healthy: boolean;
    version?: string;
    region?: string;
    uptimeSeconds?: number;
    currentConnections?: number;
    maxConnections?: number;
    totalSizeMb?: number;
  } | null;
  refreshStatus: () => void;
  onLoadConnection: () => Promise<void>;
  onRotatePassword: () => Promise<void>;
  connInfo: DbConnectionInfo | null;
  loadingConn: boolean;
  rotating: boolean;
  newPassword: string | null;
}
