/**
 * QueryBuilder – Simple Query Builder for common patterns
 *
 * Handles the recurring patterns across all services:
 * - Dynamic WHERE clause building
 * - Sorting with validation
 * - Pagination
 * - Soft-delete filtering
 *
 * This is intentionally simple – NOT an ORM replacement.
 * For complex queries (joins, subqueries, CTEs), write SQL directly.
 *
 * @example
 * ```ts
 * const qb = new QueryBuilder('projects')
 *   .select('id, name, customer_name, created_at')
 *   .where('owner_id', ownerId)
 *   .whereLike('name', searchTerm)
 *   .notDeleted()
 *   .orderBy('created_at', 'desc')
 *   .paginate(limit, offset);
 *
 * const { rows } = await pool.query(qb.toSQL(), qb.getParams());
 * const total = await qb.count(pool);
 * ```
 */

import { Pool } from 'pg';

export type SortDirection = 'asc' | 'desc' | 'ASC' | 'DESC';

export class QueryBuilder {
  private tableName: string;
  private alias?: string;
  private selectClause: string = '*';
  private conditions: string[] = [];
  private params: unknown[] = [];
  private paramIndex: number = 1;
  private orderByClause?: string;
  private limitValue?: number;
  private offsetValue?: number;
  private joinClauses: string[] = [];

  constructor(tableName: string, alias?: string) {
    this.tableName = tableName;
    this.alias = alias;
  }

  // ─── SELECT ────────────────────────────────────────

  /** Set the SELECT columns */
  select(columns: string): this {
    this.selectClause = columns;
    return this;
  }

  // ─── JOIN ──────────────────────────────────────────

  /** Add a JOIN clause */
  join(joinSQL: string): this {
    this.joinClauses.push(joinSQL);
    return this;
  }

  /** Add a LEFT JOIN */
  leftJoin(table: string, alias: string, on: string): this {
    this.joinClauses.push(`LEFT JOIN ${table} ${alias} ON ${on}`);
    return this;
  }

  /** Add an INNER JOIN */
  innerJoin(table: string, alias: string, on: string): this {
    this.joinClauses.push(`JOIN ${table} ${alias} ON ${on}`);
    return this;
  }

  // ─── WHERE ─────────────────────────────────────────

  /** Add an equality condition: column = value */
  where(column: string, value: unknown): this {
    if (value === null || value === undefined) {
      this.conditions.push(`${this.prefixed(column)} IS NULL`);
    } else {
      this.conditions.push(`${this.prefixed(column)} = $${this.paramIndex}`);
      this.params.push(value);
      this.paramIndex++;
    }
    return this;
  }

  /** Add a NOT EQUAL condition: column != value */
  whereNot(column: string, value: unknown): this {
    this.conditions.push(`${this.prefixed(column)} != $${this.paramIndex}`);
    this.params.push(value);
    this.paramIndex++;
    return this;
  }

  /** Add a LIKE condition (case-insensitive via ILIKE) */
  whereLike(column: string, value: string | undefined | null): this {
    if (!value) return this;
    this.conditions.push(`${this.prefixed(column)} ILIKE $${this.paramIndex}`);
    this.params.push(`%${value}%`);
    this.paramIndex++;
    return this;
  }

  /** Add an IN condition: column IN (values) */
  whereIn(column: string, values: unknown[]): this {
    if (values.length === 0) {
      // Empty IN → always false
      this.conditions.push('FALSE');
      return this;
    }
    const placeholders = values.map((_, i) => `$${this.paramIndex + i}`);
    this.conditions.push(`${this.prefixed(column)} IN (${placeholders.join(', ')})`);
    this.params.push(...values);
    this.paramIndex += values.length;
    return this;
  }

  /** Add a >= condition */
  whereGte(column: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this.conditions.push(`${this.prefixed(column)} >= $${this.paramIndex}`);
    this.params.push(value);
    this.paramIndex++;
    return this;
  }

  /** Add a <= condition */
  whereLte(column: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this.conditions.push(`${this.prefixed(column)} <= $${this.paramIndex}`);
    this.params.push(value);
    this.paramIndex++;
    return this;
  }

  /** Add a date range condition: column BETWEEN from AND to */
  whereDateRange(column: string, from?: string, to?: string): this {
    if (from) {
      this.whereGte(column, from);
    }
    if (to) {
      this.whereLte(column, to);
    }
    return this;
  }

  /** Add a raw WHERE condition (use $N for params) */
  whereRaw(condition: string, ...params: unknown[]): this {
    // Replace $N placeholders with correct indices
    let adjustedCondition = condition;
    for (let i = params.length; i >= 1; i--) {
      adjustedCondition = adjustedCondition.replace(
        new RegExp(`\\$${i}`, 'g'),
        `$${this.paramIndex + i - 1}`
      );
    }
    this.conditions.push(adjustedCondition);
    this.params.push(...params);
    this.paramIndex += params.length;
    return this;
  }

  /** Filter out soft-deleted records (WHERE deleted_at IS NULL) */
  notDeleted(): this {
    this.conditions.push(`${this.prefixed('deleted_at')} IS NULL`);
    return this;
  }

  /** Filter to ONLY soft-deleted records */
  onlyDeleted(): this {
    this.conditions.push(`${this.prefixed('deleted_at')} IS NOT NULL`);
    return this;
  }

  // ─── ORDER BY ──────────────────────────────────────

  /**
   * Set ORDER BY clause.
   * Validates direction to prevent SQL injection.
   */
  orderBy(column: string, direction: SortDirection = 'asc'): this {
    const dir = direction.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    this.orderByClause = `${column} ${dir}`;
    return this;
  }

  /** Set ORDER BY with multiple columns */
  orderByMultiple(orders: [string, SortDirection][]): this {
    this.orderByClause = orders
      .map(([col, dir]) => `${col} ${dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC'}`)
      .join(', ');
    return this;
  }

  // ─── PAGINATION ────────────────────────────────────

  /** Set LIMIT and OFFSET */
  paginate(limit?: number, offset?: number): this {
    if (limit !== undefined) this.limitValue = limit;
    if (offset !== undefined) this.offsetValue = offset;
    return this;
  }

  // ─── BUILD ─────────────────────────────────────────

  /** Build the final SELECT SQL string */
  toSQL(): string {
    const parts: string[] = [];

    // SELECT
    parts.push(`SELECT ${this.selectClause}`);

    // FROM
    const from = this.alias
      ? `${this.tableName} ${this.alias}`
      : this.tableName;
    parts.push(`FROM ${from}`);

    // JOINs
    if (this.joinClauses.length > 0) {
      parts.push(this.joinClauses.join('\n'));
    }

    // WHERE
    if (this.conditions.length > 0) {
      parts.push(`WHERE ${this.conditions.join(' AND ')}`);
    }

    // ORDER BY
    if (this.orderByClause) {
      parts.push(`ORDER BY ${this.orderByClause}`);
    }

    // LIMIT / OFFSET
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT $${this.paramIndex}`);
      this.params.push(this.limitValue);
      this.paramIndex++;
    }
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET $${this.paramIndex}`);
      this.params.push(this.offsetValue);
      this.paramIndex++;
    }

    return parts.join('\n');
  }

  /** Build a COUNT query (same conditions, no ORDER/LIMIT) */
  toCountSQL(): string {
    const parts: string[] = [];

    const from = this.alias
      ? `${this.tableName} ${this.alias}`
      : this.tableName;
    parts.push(`SELECT COUNT(*) AS count FROM ${from}`);

    if (this.joinClauses.length > 0) {
      parts.push(this.joinClauses.join('\n'));
    }

    if (this.conditions.length > 0) {
      parts.push(`WHERE ${this.conditions.join(' AND ')}`);
    }

    return parts.join('\n');
  }

  /** Get the parameter array for the query */
  getParams(): unknown[] {
    return [...this.params];
  }

  /** Get params for the count query (without LIMIT/OFFSET params) */
  getCountParams(): unknown[] {
    // Count params = all params minus the last ones added by LIMIT/OFFSET
    const extra = (this.limitValue !== undefined ? 1 : 0) + (this.offsetValue !== undefined ? 1 : 0);
    return this.params.slice(0, this.params.length - extra);
  }

  /**
   * Execute the count query directly.
   * Note: Call this BEFORE toSQL() since toSQL() modifies paramIndex for LIMIT/OFFSET.
   */
  async count(pool: Pool): Promise<number> {
    const result = await pool.query<{ count: string }>(
      this.toCountSQL(),
      this.getCountParams()
    );
    return parseInt(result.rows[0].count, 10);
  }

  // ─── Helpers ───────────────────────────────────────

  private prefixed(column: string): string {
    if (column.includes('.')) return column; // Already prefixed
    return this.alias ? `${this.alias}.${column}` : column;
  }
}

/**
 * Shorthand factory for creating a QueryBuilder
 *
 * @example
 * ```ts
 * const qb = query('projects', 'p')
 *   .select('p.*, u.name as owner_name')
 *   .innerJoin('users', 'u', 'u.id = p.owner_id')
 *   .notDeleted()
 *   .orderBy('p.created_at', 'desc');
 * ```
 */
export function query(tableName: string, alias?: string): QueryBuilder {
  return new QueryBuilder(tableName, alias);
}

// ─── Allowed Sort Columns ──────────────────────────────

/**
 * Validates a sort column against an allowlist to prevent SQL injection.
 *
 * @example
 * ```ts
 * const ALLOWED_SORTS = ['name', 'created_at', 'order_number'] as const;
 * const sortBy = validateSortColumn(req.query.sortBy, ALLOWED_SORTS, 'created_at');
 * ```
 */
export function validateSortColumn<T extends string>(
  input: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  if (!input) return fallback;
  return (allowed as readonly string[]).includes(input) ? (input as T) : fallback;
}

/**
 * Validates sort direction.
 */
export function validateSortDirection(
  input: string | undefined,
  fallback: SortDirection = 'asc'
): SortDirection {
  if (!input) return fallback;
  const normalized = input.toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
}
