/**
 * DbDataService — high-level CRUD operations with a Supabase-style query builder.
 *
 * Powers the SDK's `.from(table).select()/.insert()/.update()/.delete()`
 * API. Supports a chainable query builder:
 *
 *   db.from('users')
 *     .select('id, name, email')
 *     .eq('active', true)
 *     .in('role', ['admin', 'owner'])
 *     .like('email', '%@example.com')
 *     .order('created_at', 'desc')
 *     .limit(10)
 *
 * All identifiers are validated against a strict allowlist pattern to prevent
 * SQL injection. Values are always passed as parameters, never interpolated.
 *
 * Update/delete are based on WHERE conditions (not just primary key) so
 * composite keys and complex filters work.
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { DbQueryService, QueryResult } from './db-query.service';

const IDENT_RE = /^[a-z_][a-z0-9_]*$/;
const MAX_RESULT_ROWS = 1000;
const MAX_LIMIT = 1000;

export type Op =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'is' | 'in' | 'notIn';

export interface Filter {
  column: string;
  op: Op;
  value: any;
}

export interface SelectOptions {
  columns?: string[];
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface DataResult {
  rows: Record<string, any>[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Chainable query builder — created by `db.from(table).select(...)` and
 * mutated by `.eq()`, `.in()`, `.limit()`, etc.
 */
export class QueryBuilder<T = any> {
  readonly filters: Filter[] = [];
  private _limit = 50;
  private _page = 1;
  private _orderBy?: string;
  private _order: 'asc' | 'desc' = 'asc';

  constructor(private readonly table: string) { validateIdent(table, 'table'); }

  select(..._cols: string[]): this { return this; }

  // ── Filter chain ────────────────────────────────────────────────────────
  eq(column: string, value: any): this { this.push(column, 'eq', value); return this; }
  neq(column: string, value: any): this { this.push(column, 'neq', value); return this; }
  gt(column: string, value: any): this { this.push(column, 'gt', value); return this; }
  gte(column: string, value: any): this { this.push(column, 'gte', value); return this; }
  lt(column: string, value: any): this { this.push(column, 'lt', value); return this; }
  lte(column: string, value: any): this { this.push(column, 'lte', value); return this; }
  like(column: string, pattern: string): this { this.push(column, 'like', pattern); return this; }
  ilike(column: string, pattern: string): this { this.push(column, 'ilike', pattern); return this; }
  is(column: string, value: any): this { this.push(column, 'is', value); return this; }
  in(column: string, values: any[]): this { this.push(column, 'in', values); return this; }
  notIn(column: string, values: any[]): this { this.push(column, 'notIn', values); return this; }
  or(...builders: QueryBuilder<T>[]): this {
    const nested: Filter[] = [];
    for (const b of builders) {
      // Each builder's filters get wrapped into a single OR group
      if (b.filters.length > 0) {
        nested.push({ column: '__OR_GROUP__', op: 'in', value: b.filters });
      }
    }
    if (nested.length > 0) {
      this.filters.push({ column: '__OR__', op: 'in', value: builders.flatMap(b => b.filters) });
    }
    return this;
  }

  // ── Order + paginate ───────────────────────────────────────────────────
  order(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    validateIdent(column, 'orderBy');
    this._orderBy = column;
    this._order = direction;
    return this;
  }
  limit(n: number): this { this._limit = Math.min(Math.max(1, n), MAX_LIMIT); return this; }
  page(n: number): this { this._page = Math.max(1, n); return this; }

  /** Read final values (used by DbDataService). */
  getLimit(): number { return this._limit; }
  getPage(): number { return this._page; }
  getOrderBy(): string | undefined { return this._orderBy; }
  getOrder(): 'asc' | 'desc' { return this._order; }

  private push(column: string, op: Op, value: any): void {
    validateIdent(column, 'where column');
    this.filters.push({ column, op, value });
  }
}

function validateIdent(name: string, label: string): void {
  if (!IDENT_RE.test(name)) {
    throw new BadRequestException(`Invalid ${label}: "${name}". Only lowercase letters, digits, and underscores are allowed.`);
  }
}

function quoteIdent(name: string): string {
  validateIdent(name, 'identifier');
  return `"${name}"`;
}

@Injectable()
export class DbDataService {
  constructor(private queryService: DbQueryService) {}

  // ── SELECT ──────────────────────────────────────────────────────────────

  /** Create a query builder for the given table. */
  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  }

  /** Execute a SELECT — given a built query and column selection. */
  async select(databaseId: string, qb: QueryBuilder, columns?: string[]): Promise<DataResult> {
    const limit = qb.getLimit();
    const page = qb.getPage();
    const offset = (page - 1) * limit;
    const cols = columns?.length ? columns.map(c => quoteIdent(c)).join(', ') : '*';

    const { clause: whereClause, params } = this.buildWhere(qb.filters);

    let orderClause = '';
    const orderBy = qb.getOrderBy();
    if (orderBy) orderClause = ` ORDER BY ${quoteIdent(orderBy)} ${qb.getOrder().toUpperCase()}`;

    // Count for pagination metadata (only when filters present)
    let total = 0;
    if (qb.filters.length > 0) {
      const countSql = `SELECT COUNT(*)::int AS total FROM ${quoteIdent(qb.constructor.name === 'QueryBuilder' ? qb['table'] : '')}${whereClause}`;
      const countResult = await this.queryService.executeParameterized(databaseId, countSql, params);
      total = countResult.rows[0]?.total ?? 0;
    }

    const dataSql = `SELECT ${cols} FROM ${quoteIdent(this.getTableName(qb))}${whereClause}${orderClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataResult = await this.queryService.executeParameterized(databaseId, dataSql, [...params, limit, offset]);

    return { rows: dataResult.rows, total: total || dataResult.rowCount, page, limit };
  }

  // ── INSERT ──────────────────────────────────────────────────────────────

  async insert(databaseId: string, table: string, row: Record<string, any>): Promise<Record<string, any>> {
    validateIdent(table, 'table');
    const keys = Object.keys(row);
    if (keys.length === 0) throw new BadRequestException('Cannot insert an empty row');

    keys.forEach(k => validateIdent(k, 'column'));
    const colList = keys.map(k => quoteIdent(k)).join(', ');
    const paramList = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map(k => row[k]);

    const sql = `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${paramList}) RETURNING *`;
    const result = await this.queryService.executeParameterized(databaseId, sql, values);
    return result.rows[0] ?? {};
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────

  /**
   * Update rows matching the WHERE filters from the query builder.
   * Example: db.from('users').eq('id', '...').update({ name: 'Ken' })
   */
  async update(
    databaseId: string,
    qb: QueryBuilder,
    patch: Record<string, any>,
  ): Promise<Record<string, any>[]> {
    const table = this.getTableName(qb);
    validateIdent(table, 'table');

    const patchKeys = Object.keys(patch);
    if (patchKeys.length === 0) throw new BadRequestException('Cannot update with an empty patch');
    patchKeys.forEach(k => validateIdent(k, 'column'));

    const { clause: whereClause, params } = this.buildWhere(qb.filters);

    const setClause = patchKeys.map((k, i) => `${quoteIdent(k)} = $${i + 1}`).join(', ');
    const values = patchKeys.map(k => patch[k]);

    // WHERE params come after SET params
    const whereParams = params.map((p, i) => `$${values.length + i + 1}`);
    const fullParams = [...values, ...params];

    // Use the same SET values but inline WHERE params (re-numbered)
    const setClauseRenumbered = patchKeys.map((_, i) => `${quoteIdent(patchKeys[i])} = $${i + 1}`).join(', ');
    const whereRenumbered = whereClause.replace(/\$\d+/g, () => whereParams.shift() ?? '');

    const sql = `UPDATE ${quoteIdent(table)} SET ${setClauseRenumbered}${whereRenumbered} RETURNING *`;
    const result = await this.queryService.executeParameterized(databaseId, sql, fullParams);
    return result.rows;
  }

  // ── DELETE ──────────────────────────────────────────────────────────────

  /**
   * Delete rows matching the WHERE filters.
   * Example: db.from('users').eq('status', 'inactive').delete()
   */
  async delete(databaseId: string, qb: QueryBuilder): Promise<number> {
    const table = this.getTableName(qb);
    validateIdent(table, 'table');

    const { clause: whereClause, params } = this.buildWhere(qb.filters);
    const sql = `DELETE FROM ${quoteIdent(table)}${whereClause} RETURNING 1`;
    const result = await this.queryService.executeParameterized(databaseId, sql, params);
    return result.rowCount;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Extract the table name from a QueryBuilder instance (it's a public readonly field). */
  private getTableName(qb: QueryBuilder): string {
    // The QueryBuilder exposes `table` as a readonly field — access it via a bracket on the instance.
    return (qb as any).table as string;
  }

  /** Build a WHERE clause + params from a list of filters. Supports AND/OR. */
  private buildWhere(filters: Filter[]): { clause: string; params: any[] } {
    if (filters.length === 0) return { clause: '', params: [] };

    const params: any[] = [];
    const groups = new Map<string, Filter[]>();

    for (const f of filters) {
      if (f.column === '__OR__') {
        groups.set('__OR__', ((f.value as Filter[]) || []).concat(groups.get('__OR__') ?? []));
      } else {
        const key = groups.has('__OR__') ? '__OR__' : '__AND__';
        const arr = groups.get(key) ?? [];
        arr.push(f);
        groups.set(key, arr);
      }
    }

    const clauses: string[] = [];

    // AND group (the default)
    if (groups.has('__AND__')) {
      for (const f of groups.get('__AND__')!) {
        clauses.push(this.filterToClause(f, params));
      }
    }

    // OR group
    if (groups.has('__OR__')) {
      const orParts: string[] = [];
      for (const f of groups.get('__OR__')!) {
        orParts.push(this.filterToClause(f, params));
      }
      clauses.push(`(${orParts.join(' OR ')})`);
    }

    return { clause: ` WHERE ${clauses.join(' AND ')}`, params };
  }

  private filterToClause(f: Filter, params: any[]): string {
    const col = quoteIdent(f.column);
    if (f.op === 'is') {
      params.push(f.value);
      return `${col} IS $${params.length}`;
    }
    if (f.op === 'in' || f.op === 'notIn') {
      const values = (f.value as any[]) || [];
      if (values.length === 0) {
        return f.op === 'in' ? 'FALSE' : 'TRUE';
      }
      const placeholders = values.map(v => {
        params.push(v);
        return `$${params.length}`;
      }).join(',');
      return `${col} ${f.op === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`;
    }
    params.push(f.value);
    const opMap: Record<Op, string> = {
      eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
      like: 'LIKE', ilike: 'ILIKE', is: 'IS',
      in: 'IN', notIn: 'NOT IN',
    };
    return `${col} ${opMap[f.op]} $${params.length}`;
  }
}
