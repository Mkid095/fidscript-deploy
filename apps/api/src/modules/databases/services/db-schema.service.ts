/**
 * DbSchemaService — introspects a managed database's schema.
 *
 * Queries Postgres' information_schema + pg_catalog to return:
 *  - Schemas (excluding system schemas)
 *  - Tables (with row counts, sizes)
 *  - Columns (with types, defaults, nullable, primary keys)
 *  - Indexes
 *  - Foreign keys / relationships
 *  - Views
 *  - Extensions
 *
 * All queries run as the database's own user (not admin) so RLS policies
 * would be respected once implemented.
 */
import { Injectable, Logger } from '@nestjs/common';
import { DbPoolService } from './db-pool.service';

export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view';
  rowCount?: number;
  sizeBytes?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  ordinalPosition: number;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string | null;
  characterMaximumLength?: number | null;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  comment?: string | null;
}

export interface ForeignKeyInfo {
  name: string;
  columnName: string;
  referencesTable: string;
  referencesColumn: string;
}

export interface IndexInfo {
  name: string;
  columnName: string;
  isUnique: boolean;
  indexType: string;
}

export interface SchemaIntrospection {
  schema: string;
  table: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  rowCount: number;
  sizeBytes: number;
}

@Injectable()
export class DbSchemaService {
  private readonly logger = new Logger(DbSchemaService.name);

  constructor(private poolService: DbPoolService) {}

  /** List all user tables + views (excludes system schemas). */
  async listTables(databaseId: string): Promise<TableInfo[]> {
    const pool = await this.poolService.getPool(databaseId);
    const result = await pool.query<TableInfo>(`
      SELECT
        t.table_schema AS schema,
        t.table_name AS name,
        t.table_type AS type,
        COALESCE(s.n_live_tup, 0)::bigint AS "rowCount",
        COALESCE(pg_total_relation_size(format('%I.%I', t.table_schema, t.table_name)), 0)::bigint AS "sizeBytes"
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s
        ON s.schemaname = t.table_schema AND s.relname = t.table_name
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND t.table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY t.table_schema, t.table_name
    `);
    return result.rows;
  }

  /** Get full schema introspection for a single table. */
  async getTableSchema(databaseId: string, schema: string, table: string): Promise<SchemaIntrospection> {
    const [columns, foreignKeys, indexes, stats] = await Promise.all([
      this.getColumns(databaseId, schema, table),
      this.getForeignKeys(databaseId, schema, table),
      this.getIndexes(databaseId, schema, table),
      this.getTableStats(databaseId, schema, table),
    ]);

    return {
      schema,
      table,
      columns,
      foreignKeys,
      indexes,
      rowCount: stats.rowCount,
      sizeBytes: stats.sizeBytes,
    };
  }

  /** Get columns for a table. */
  async getColumns(databaseId: string, schema: string, table: string): Promise<ColumnInfo[]> {
    const pool = await this.poolService.getPool(databaseId);
    const result = await pool.query<ColumnInfo>(`
      SELECT
        c.column_name AS name,
        c.ordinal_position AS "ordinalPosition",
        c.data_type AS "dataType",
        (c.is_nullable = 'YES') AS "isNullable",
        c.column_default AS "columnDefault",
        c.character_maximum_length AS "characterMaximumLength",
        EXISTS(
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
            AND kcu.column_name = c.column_name
        ) AS "isPrimaryKey",
        (c.is_identity = 'YES') AS "isIdentity",
        col_description(format('%I.%I', $1, $2)::regclass, c.ordinal_position) AS comment
      FROM information_schema.columns c
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `, [schema, table]);
    return result.rows;
  }

  /** Get foreign key relationships for a table. */
  async getForeignKeys(databaseId: string, schema: string, table: string): Promise<ForeignKeyInfo[]> {
    const pool = await this.poolService.getPool(databaseId);
    const result = await pool.query<ForeignKeyInfo>(`
      SELECT
        tc.constraint_name AS name,
        kcu.column_name AS "columnName",
        ccu.table_name AS "referencesTable",
        ccu.column_name AS "referencesColumn"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    `, [schema, table]);
    return result.rows;
  }

  /** Get indexes for a table. */
  async getIndexes(databaseId: string, schema: string, table: string): Promise<IndexInfo[]> {
    const pool = await this.poolService.getPool(databaseId);
    const result = await pool.query<IndexInfo>(`
      SELECT
        i.relname AS name,
        a.attname AS "columnName",
        ix.indisunique AS "isUnique",
        am.amname AS "indexType"
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_am am ON am.oid = i.relam
      WHERE n.nspname = $1 AND t.relname = $2
      ORDER BY i.relname, a.attname
    `, [schema, table]);
    return result.rows;
  }

  /** Get row count + size for a table. */
  private async getTableStats(databaseId: string, schema: string, table: string): Promise<{ rowCount: number; sizeBytes: number }> {
    const pool = await this.poolService.getPool(databaseId);
    const result = await pool.query<{ rowCount: number; sizeBytes: string }>(`
      SELECT
        COALESCE(s.n_live_tup, 0)::int AS "rowCount",
        COALESCE(pg_total_relation_size(format('%I.%I', $1, $2)), 0)::text AS "sizeBytes"
      FROM pg_stat_user_tables s
      WHERE s.schemaname = $1 AND s.relname = $2
    `, [schema, table]);
    return {
      rowCount: result.rows[0]?.rowCount ?? 0,
      sizeBytes: parseInt(result.rows[0]?.sizeBytes ?? '0', 10),
    };
  }

  /** Get installed Postgres extensions. */
  async getExtensions(databaseId: string): Promise<{ name: string; version: string; enabled: boolean }[]> {
    const pool = await this.poolService.getPool(databaseId);
    const result = await pool.query<{ extname: string; extversion: string }>(`
      SELECT extname, extversion FROM pg_extension ORDER BY extname
    `);
    return result.rows.map(r => ({ name: r.extname, version: r.extversion, enabled: true }));
  }

  /** Check if realtime trigger exists on a table. */
  async hasRealtimeTrigger(databaseId: string, schema: string, table: string): Promise<boolean> {
    const pool = await this.poolService.getPool(databaseId);
    const result = await pool.query(`
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'rt_${table}'
        AND event_object_schema = $1
        AND event_object_table = $2
      LIMIT 1
    `, [schema, table]);
    return result.rows.length > 0;
  }
}
