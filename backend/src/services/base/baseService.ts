/**
 * BaseService – Generic CRUD Service Pattern
 *
 * Provides reusable CRUD operations that all entity services can extend.
 * Designed for the existing pg Pool pattern used throughout IntelliPlan.
 *
 * @example
 * ```ts
 * // Create a typed service for a specific entity
 * const projectService = createBaseService<Project, CreateProjectDTO, UpdateProjectDTO>({
 *   tableName: 'projects',
 *   selectColumns: '*',
 *   softDelete: true,
 * });
 *
 * // Use it
 * const project = await projectService.findById('uuid-here');
 * const all = await projectService.findAll({ limit: 20, offset: 0 });
 * ```
 */

import { Pool, PoolClient } from 'pg';

// ─── Types ─────────────────────────────────────────────

export interface BaseServiceConfig {
  /** Database table name */
  tableName: string;
  /** Columns to SELECT (default: '*') */
  selectColumns?: string;
  /** Whether the table uses soft-delete via deleted_at (default: true) */
  softDelete?: boolean;
  /** Default ORDER BY clause (default: 'created_at DESC') */
  defaultOrderBy?: string;
  /** Column used for ownership filtering (e.g. 'owner_id', 'tenant_id') */
  ownerColumn?: string;
}

export interface FindAllOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  /** Owner/tenant ID for scoped queries */
  ownerId?: string;
  /** Include soft-deleted records */
  includeDeleted?: boolean;
  /** Additional WHERE conditions as [column, value] pairs */
  filters?: [string, unknown][];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Service Factory ───────────────────────────────────

/**
 * Creates a base service with standard CRUD operations for a given table.
 *
 * This is NOT a replacement for custom service logic – it's a foundation.
 * Complex queries (joins, aggregations) should still be written manually.
 */
export function createBaseService<
  TEntity extends { id: string },
  TCreate = Partial<TEntity>,
  TUpdate = Partial<TEntity>,
>(
  pool: Pool,
  config: BaseServiceConfig
) {
  const {
    tableName,
    selectColumns = '*',
    softDelete = true,
    defaultOrderBy = 'created_at DESC',
    ownerColumn,
  } = config;

  // ─── Helpers ───────────────────────────────────────

  function notDeletedCondition(alias?: string): string {
    if (!softDelete) return '';
    const prefix = alias ? `${alias}.` : '';
    return `AND ${prefix}deleted_at IS NULL`;
  }

  function buildOwnerCondition(
    paramIdx: number,
    ownerId?: string,
    alias?: string
  ): { condition: string; params: unknown[]; nextIdx: number } {
    if (!ownerColumn || !ownerId) {
      return { condition: '', params: [], nextIdx: paramIdx };
    }
    const prefix = alias ? `${alias}.` : '';
    return {
      condition: `AND ${prefix}${ownerColumn} = $${paramIdx}`,
      params: [ownerId],
      nextIdx: paramIdx + 1,
    };
  }

  // ─── CRUD Operations ──────────────────────────────

  async function findById(
    id: string,
    ownerId?: string
  ): Promise<TEntity | null> {
    const ownerCond = buildOwnerCondition(2, ownerId);

    const result = await pool.query<TEntity>(
      `SELECT ${selectColumns} FROM ${tableName}
       WHERE id = $1 ${notDeletedCondition()} ${ownerCond.condition}`,
      [id, ...ownerCond.params]
    );

    return result.rows[0] ?? null;
  }

  async function findAll(options: FindAllOptions = {}): Promise<PaginatedResult<TEntity>> {
    const {
      limit = 50,
      offset = 0,
      orderBy = defaultOrderBy,
      ownerId,
      includeDeleted = false,
      filters = [],
    } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Soft-delete filter
    if (softDelete && !includeDeleted) {
      conditions.push(`deleted_at IS NULL`);
    }

    // Owner filter
    if (ownerColumn && ownerId) {
      conditions.push(`${ownerColumn} = $${paramIdx}`);
      params.push(ownerId);
      paramIdx++;
    }

    // Additional filters
    for (const [column, value] of filters) {
      if (value === null) {
        conditions.push(`${column} IS NULL`);
      } else {
        conditions.push(`${column} = $${paramIdx}`);
        params.push(value);
        paramIdx++;
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ${tableName} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data
    const dataResult = await pool.query<TEntity>(
      `SELECT ${selectColumns} FROM ${tableName}
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return { data: dataResult.rows, total, limit, offset };
  }

  async function create(
    data: TCreate,
    client?: PoolClient
  ): Promise<TEntity> {
    const queryRunner = client ?? pool;
    const entries = Object.entries(data as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    );

    const columns = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const result = await queryRunner.query<TEntity>(
      `INSERT INTO ${tableName} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING ${selectColumns}`,
      values
    );

    return result.rows[0];
  }

  async function update(
    id: string,
    data: TUpdate,
    ownerId?: string,
    client?: PoolClient
  ): Promise<TEntity | null> {
    const queryRunner = client ?? pool;
    const entries = Object.entries(data as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    );

    if (entries.length === 0) {
      return findById(id, ownerId);
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const [key, value] of entries) {
      setClauses.push(`${key} = $${paramIdx}`);
      params.push(value);
      paramIdx++;
    }

    // Always update updated_at if the column exists
    setClauses.push(`updated_at = NOW()`);

    // WHERE id = ...
    params.push(id);
    const idCondition = `id = $${paramIdx}`;
    paramIdx++;

    // Owner condition
    const ownerCond = buildOwnerCondition(paramIdx, ownerId);
    params.push(...ownerCond.params);

    const result = await queryRunner.query<TEntity>(
      `UPDATE ${tableName}
       SET ${setClauses.join(', ')}
       WHERE ${idCondition} ${notDeletedCondition()} ${ownerCond.condition}
       RETURNING ${selectColumns}`,
      params
    );

    return result.rows[0] ?? null;
  }

  async function softDeleteById(
    id: string,
    ownerId?: string,
    client?: PoolClient
  ): Promise<boolean> {
    if (!softDelete) {
      throw new Error(
        `Table ${tableName} does not support soft-delete. Use hardDelete instead.`
      );
    }

    const queryRunner = client ?? pool;
    let paramIdx = 1;
    const params: unknown[] = [id];
    paramIdx++;

    const ownerCond = buildOwnerCondition(paramIdx, ownerId);
    params.push(...ownerCond.params);

    const result = await queryRunner.query(
      `UPDATE ${tableName} SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL ${ownerCond.condition}`,
      params
    );

    return (result.rowCount ?? 0) > 0;
  }

  async function hardDelete(
    id: string,
    ownerId?: string,
    client?: PoolClient
  ): Promise<boolean> {
    const queryRunner = client ?? pool;
    let paramIdx = 1;
    const params: unknown[] = [id];
    paramIdx++;

    const ownerCond = buildOwnerCondition(paramIdx, ownerId);
    params.push(...ownerCond.params);

    const result = await queryRunner.query(
      `DELETE FROM ${tableName} WHERE id = $1 ${ownerCond.condition}`,
      params
    );

    return (result.rowCount ?? 0) > 0;
  }

  async function restore(
    id: string,
    ownerId?: string,
    client?: PoolClient
  ): Promise<TEntity | null> {
    if (!softDelete) return null;

    const queryRunner = client ?? pool;
    let paramIdx = 1;
    const params: unknown[] = [id];
    paramIdx++;

    const ownerCond = buildOwnerCondition(paramIdx, ownerId);
    params.push(...ownerCond.params);

    const result = await queryRunner.query<TEntity>(
      `UPDATE ${tableName}
       SET deleted_at = NULL, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NOT NULL ${ownerCond.condition}
       RETURNING ${selectColumns}`,
      params
    );

    return result.rows[0] ?? null;
  }

  async function count(
    ownerId?: string,
    includeDeleted = false
  ): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (softDelete && !includeDeleted) {
      conditions.push(`deleted_at IS NULL`);
    }
    if (ownerColumn && ownerId) {
      conditions.push(`${ownerColumn} = $${paramIdx}`);
      params.push(ownerId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ${tableName} ${whereClause}`,
      params
    );

    return parseInt(result.rows[0].count, 10);
  }

  async function exists(id: string, ownerId?: string): Promise<boolean> {
    const ownerCond = buildOwnerCondition(2, ownerId);

    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM ${tableName}
        WHERE id = $1 ${notDeletedCondition()} ${ownerCond.condition}
      ) AS exists`,
      [id, ...ownerCond.params]
    );

    return result.rows[0].exists;
  }

  return {
    findById,
    findAll,
    create,
    update,
    delete: softDeleteById,
    hardDelete,
    restore,
    count,
    exists,
  };
}

export type BaseService<
  TEntity extends { id: string },
  TCreate = Partial<TEntity>,
  TUpdate = Partial<TEntity>,
> = ReturnType<typeof createBaseService<TEntity, TCreate, TUpdate>>;
