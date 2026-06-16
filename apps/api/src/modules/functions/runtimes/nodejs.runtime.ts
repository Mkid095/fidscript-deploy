import { Injectable } from '@nestjs/common';
import { Runtime, InvocationResult } from './runtime.interface.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class NodeJsRuntime implements Runtime {
  name = 'nodejs';
  version = '18';
  supportedExtensions = ['.js', '.mjs'];

  async build(functionPath: string, _envVars: Record<string, string>): Promise<string> {
    const outputPath = path.join(functionPath, 'dist');
    await fs.mkdir(outputPath, { recursive: true });
    // In production, this would bundle the code
    return outputPath;
  }

  async invoke(functionPath: string, payload: string, timeoutSeconds: number): Promise<InvocationResult> {
    const start = Date.now();
    try {
      const handlerPath = path.join(functionPath, 'handler.js');
      const { stdout, stderr } = await execAsync(
        `node -e "require('${handlerPath}').handler(${payload})"`,
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
    try {
      new Function(code);
      return true;
    } catch {
      return false;
    }
  }
}