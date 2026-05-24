import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/postgrest-js';

/**
 * Generic repository error with additional context
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: PostgrestError | unknown,
    public readonly operation?: string,
    public readonly table?: string
  ) {
    super(message);
    this.name = 'RepositoryError';

    // Include cause message if available
    if (cause instanceof Error) {
      this.message = `${message}: ${cause.message}`;
    }
  }
}

/**
 * Pagination options for repository queries
 */
export interface IPaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Paginated result wrapper
 */
export interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Base repository interface with common CRUD operations
 */
export interface IBaseRepository<T, TInsert = Omit<T, 'id' | 'created_at' | 'updated_at'>> {
  /**
   * Find a single record by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find a single record with custom filter
   */
  findOne(filter: Partial<T>): Promise<T | null>;

  /**
   * Find multiple records with filters
   */
  findMany(
    filter?: Partial<T>,
    options?: IPaginationOptions & { orderBy?: string; ascending?: boolean }
  ): Promise<T[]>;

  /**
   * Find records with pagination
   */
  findPaginated(
    filter?: Partial<T>,
    pagination?: IPaginationOptions,
    options?: { orderBy?: string; ascending?: boolean }
  ): Promise<IPaginatedResult<T>>;

  /**
   * Create a new record
   */
  create(data: TInsert): Promise<T>;

  /**
   * Create multiple records
   */
  createMany(data: TInsert[]): Promise<T[]>;

  /**
   * Update a record by ID
   */
  updateById(id: string, data: Partial<T>): Promise<T>;

  /**
   * Update records matching filter
   */
  update(filter: Partial<T>, data: Partial<T>): Promise<T[]>;

  /**
   * Delete a record by ID
   */
  deleteById(id: string): Promise<void>;

  /**
   * Delete records matching filter
   */
  delete(filter: Partial<T>): Promise<void>;

  /**
   * Count records matching filter
   */
  count(filter?: Partial<T>): Promise<number>;
}

/**
 * Abstract base repository implementation with common functionality
 */
export abstract class BaseRepository<
  T,
  TInsert = Omit<T, 'id' | 'created_at' | 'updated_at'>,
> implements IBaseRepository<T, TInsert> {
  constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly tableName: string
  ) {}

  /**
   * Get the table name for error reporting
   */
  protected getTable(): string {
    return this.tableName;
  }

  /**
   * Handle Supabase errors consistently
   */
  protected handleError(error: PostgrestError | unknown, operation: string): never {
    if (error && typeof error === 'object' && 'message' in error) {
      throw new RepositoryError(
        `Failed to ${operation} ${this.getTable()}`,
        error,
        operation,
        this.getTable()
      );
    }
    throw new RepositoryError(
      `Unexpected error during ${operation} of ${this.getTable()}`,
      error,
      operation,
      this.getTable()
    );
  }

  /**
   * Convert Postgrest single result to typed result
   */
  protected handleSingleResult(result: { data: unknown; error: PostgrestError | null }): T | null {
    if (result.error) {
      this.handleError(result.error, 'fetch');
    }
    return result.data as T | null;
  }

  /**
   * Convert Postgrest multiple result to typed array
   */
  protected handleMultipleResult(result: { data: unknown; error: PostgrestError | null }): T[] {
    if (result.error) {
      this.handleError(result.error, 'fetch');
    }
    return (result.data as T[]) || [];
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.supabase.from(this.getTable()).select('*').eq('id', id).single();

    return this.handleSingleResult(result);
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    let query = this.supabase.from(this.getTable()).select('*').limit(1);

    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const result = await query.single();
    return this.handleSingleResult(result);
  }

  async findMany(
    filter?: Partial<T>,
    options?: IPaginationOptions & { orderBy?: string; ascending?: boolean }
  ): Promise<T[]> {
    let query = this.supabase.from(this.getTable()).select('*');

    // Apply filters
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const result = await query;
    return this.handleMultipleResult(result);
  }

  async findPaginated(
    filter?: Partial<T>,
    pagination?: IPaginationOptions,
    options?: { orderBy?: string; ascending?: boolean }
  ): Promise<IPaginatedResult<T>> {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    // Build count query
    let countQuery = this.supabase
      .from(this.getTable())
      .select('*', { count: 'exact', head: true });

    // Apply filters to count query
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = countQuery.eq(key, value);
        }
      });
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      this.handleError(countError, 'count');
    }

    // Fetch data
    const data = await this.findMany(filter, { ...pagination, ...options });

    return {
      data,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    };
  }

  async create(data: TInsert): Promise<T> {
    const result = await this.supabase
      .from(this.getTable())
      .insert(data as Record<string, unknown>)
      .select('*')
      .single();

    const created = this.handleSingleResult(result);
    if (!created) {
      this.handleError({ message: 'Failed to create record' } as PostgrestError, 'create');
    }
    return created;
  }

  async createMany(data: TInsert[]): Promise<T[]> {
    const result = await this.supabase
      .from(this.getTable())
      .insert(data as Record<string, unknown>[])
      .select('*');

    return this.handleMultipleResult(result);
  }

  async updateById(id: string, data: Partial<T>): Promise<T> {
    const result = await this.supabase
      .from(this.getTable())
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    const updated = this.handleSingleResult(result);
    if (!updated) {
      this.handleError({ message: 'Record not found for update' } as PostgrestError, 'update');
    }
    return updated;
  }

  async update(filter: Partial<T>, data: Partial<T>): Promise<T[]> {
    let query = this.supabase
      .from(this.getTable())
      .update({ ...data, updated_at: new Date().toISOString() });

    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const result = await query.select('*');
    return this.handleMultipleResult(result);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.getTable()).delete().eq('id', id);

    if (error) {
      this.handleError(error, 'delete');
    }
  }

  async delete(filter: Partial<T>): Promise<void> {
    let query = this.supabase.from(this.getTable()).delete();

    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { error } = await query;
    if (error) {
      this.handleError(error, 'delete');
    }
  }

  async count(filter?: Partial<T>): Promise<number> {
    let query = this.supabase.from(this.getTable()).select('*', { count: 'exact', head: true });

    // Apply filters
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;
    if (error) {
      this.handleError(error, 'count');
    }
    return count || 0;
  }
}
