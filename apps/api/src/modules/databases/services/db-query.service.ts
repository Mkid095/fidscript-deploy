/**
 * DbQueryService — executes SQL against a managed database with safety guards.
 *
 * The SafeQueryExecutor blocks dangerous statements (DROP DATABASE, ALTER SYSTEM,
 * COPY PROGRAM, CREATE ROLE, etc.) while allowing DML + table-level DDL.
 *
 * This is the foundation for:
 *  - The SQL Editor dashboard page
 *  - The POST /databases/:id/query endpoint
 *  - Internal data operations
 */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DbPoolService } from './db-pool.service';

export interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  columns?: string[];
  command?: string;
}

// Statements that must NEVER run against a user database.
const FORBIDDEN_PATTERNS = [
  /\bDROP\s+DATABASE\b/i,
  /\bALTER\s+SYSTEM\b/i,
  /\bCOPY\s+.*\bTO\s+PROGRAM\b/i,
  /\bCOPY\s+.*\bFROM\s+PROGRAM\b/i,
  /\bCREATE\s+ROLE\b/i,
  /\bCREATE\s+USER\b/i,
  /\bDROP\s+ROLE\b/i,
  /\bDROP\s+USER\b/i,
  /\bALTER\s+ROLE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bCREATE\s+SCHEMA\s+pg_/i,
  /\bpg_read_file\b/i,
  /\bpg_sleep\b/i,
  /\bdblink\b/i,
];

// Max rows returned from any single query (prevents memory exhaustion).
const MAX_RESULT_ROWS = 10_000;

@Injectable()
export class DbQueryService {
  private readonly logger = new Logger(DbQueryService.name);

  constructor(private poolService: DbPoolService) {}

  /**
   * Execute a SQL statement safely. Blocks dangerous operations.
   * Automatically limits results to MAX_RESULT_ROWS.
   */
  async execute(databaseId: string, sql: string): Promise<QueryResult> {
    this.validateSql(sql);

    const pool = await this.poolService.getPool(databaseId);
    const startTime = Date.now();

    try {
      const result = await pool.query(sql);
      const executionTimeMs = Date.now() - startTime;

      // Truncate large result sets to prevent memory issues
      const rows = result.rows.slice(0, MAX_RESULT_ROWS);
      const columns = result.fields?.map(f => f.name) ?? [];

      return {
        rows,
        rowCount: result.rowCount ?? rows.length,
        executionTimeMs,
        columns,
        command: result.command,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Query failed on database ${databaseId}: ${msg}`);
      throw new BadRequestException(`Query error: ${msg}`);
    }
  }

  /**
   * Execute a parameterized query (for internal use by DbDataService).
   * Parameterized queries bypass the SQL text validation since values
   * are separated from the SQL string.
   */
  async executeParameterized(
    databaseId: string,
    sql: string,
    params: any[],
  ): Promise<QueryResult> {
    // Still validate the SQL template (not the params)
    this.validateSql(sql);

    const pool = await this.poolService.getPool(databaseId);
    const startTime = Date.now();

    try {
      const result = await pool.query(sql, params);
      const executionTimeMs = Date.now() - startTime;
      const rows = result.rows.slice(0, MAX_RESULT_ROWS);

      return {
        rows,
        rowCount: result.rowCount ?? rows.length,
        executionTimeMs,
        columns: result.fields?.map(f => f.name) ?? [],
        command: result.command,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Query error: ${msg}`);
    }
  }

  /**
   * Validate SQL against forbidden patterns.
   * Throws BadRequestException if a dangerous statement is detected.
   */
  private validateSql(sql: string): void {
    const trimmed = sql.trim();

    if (!trimmed) {
      throw new BadRequestException('SQL statement is empty');
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new BadRequestException(
          `Blocked: this SQL statement contains a forbidden operation (${pattern.source}). ` +
          `Dangerous operations (DROP DATABASE, ALTER SYSTEM, CREATE ROLE, etc.) are not allowed.`,
        );
      }
    }
  }
}
