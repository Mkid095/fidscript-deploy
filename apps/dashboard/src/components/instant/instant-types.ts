/** The Instant app behind a project, as the API reports it. */
export interface InstantAppStatus {
  appId: string;
  title: string;
  status: string;
  createdAt: string;
}

/** The configuration a deployed application needs to reach its data plane. */
export interface InstantClientConfig {
  apiHost: string;
  dashboardUrl: string;
  appId: string;
}
