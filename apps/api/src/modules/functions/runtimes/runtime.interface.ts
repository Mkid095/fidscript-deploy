export interface InvocationResult {
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
  memoryUsedMb?: number;
}

export interface Runtime {
  name: string;
  version: string;
  supportedExtensions: string[];
  build(functionPath: string, envVars: Record<string, string>): Promise<string>;
  invoke(functionPath: string, payload: string, timeoutSeconds: number): Promise<InvocationResult>;
  validateCode(code: string): boolean;
}

export const RUNTIME = Symbol('RUNTIME');