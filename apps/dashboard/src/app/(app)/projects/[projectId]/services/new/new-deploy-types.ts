// Types for the new deployment wizard

export interface GithubRepo {
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  updated_at?: string;
}

export interface GithubBranch {
  name: string;
}

export interface GithubStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

export interface BuildPlan {
  framework: string;
  frameworkLabel: string;
  frameworkVersion?: string;
  buildCommand: string;
  outputDirectory: string;
  port: number;
  runtime: string;
  monorepo?: string;
}
