import { Injectable } from '@nestjs/common';
import { Runtime, InvocationResult } from './runtime.interface.js';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class PythonRuntime implements Runtime {
  name = 'python';
  version = '3.11';
  supportedExtensions = ['.py'];

  async build(functionPath: string, _envVars: Record<string, string>): Promise<string> {
    // In production, this would install dependencies
    return functionPath;
  }

  async invoke(functionPath: string, payload: string, timeoutSeconds: number): Promise<InvocationResult> {
    const start = Date.now();
    try {
      const handlerPath = path.join(functionPath, 'handler.py');
      const { stdout, stderr } = await execAsync(
        `python3 ${handlerPath} '${payload.replace(/'/g, "'\"'\"'")}'`,
        { timeout: timeoutSeconds * 1000 }
      );
      return {
        success: true,
        output: stdout || 'ok',
        durationMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        durationMs: Date.now() - start,
      };
    }
  }

  validateCode(code: string): boolean {
    // Basic Python syntax check would go here
    return code.includes('def');
  }
}