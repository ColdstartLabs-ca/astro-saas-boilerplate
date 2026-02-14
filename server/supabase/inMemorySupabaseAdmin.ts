import type { SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

type Row = Record<string, unknown>;
type MaybeError = { code?: string; message: string; details?: string | null; hint?: string | null };
type QueryResult<T = unknown> = {
  data: T;
  error: MaybeError | null;
  count: number | null;
};
type FilterFn = (row: Row) => boolean;
type OrderRule = { column: string; ascending: boolean };
type MutationOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

const GLOBAL_STORE_KEY = '__AUTOPILOTRANK_IN_MEMORY_SUPABASE__';
const DEFAULT_DB_PATH = '/tmp/autopilotrank-playwright-mock-db.json';
const DB_PATH = process.env.PLAYWRIGHT_MOCK_DB_PATH || DEFAULT_DB_PATH;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(): string {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function postgrestError(message: string, code: string = 'PGRST000'): MaybeError {
  return { code, message, details: null, hint: null };
}

class InMemoryStore {
  private readonly filePath: string;
  private tables = new Map<string, Row[]>();
  private readonly defaults: string[];

  constructor() {
    this.filePath = DB_PATH;
    this.defaults = [
      'profiles',
      'projects',
      'campaigns',
      'keywords',
      'articles',
      'gsc_connections',
      'integrations',
      'campaign_integrations',
      'opportunities',
      'subscriptions',
      'user_credits',
      'credit_transactions',
      'article_deliveries',
      'user_onboarding',
      'email_preferences',
      'email_logs',
    ];

    for (const table of this.defaults) {
      this.tables.set(table, []);
    }

    this.hydrateFromDisk();
  }

  get(table: string): Row[] {
    if (!this.tables.has(table)) {
      this.tables.set(table, []);
    }
    return this.tables.get(table)!;
  }

  reset(): void {
    for (const table of this.defaults) {
      this.tables.set(table, []);
    }
    this.persistToDisk();
  }

  hydrateFromDisk(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.persistToDisk();
        return;
      }

      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (!raw.trim()) {
        this.persistToDisk();
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const table of this.defaults) {
        const value = parsed[table];
        this.tables.set(
          table,
          Array.isArray(value)
            ? value
                .filter(isRecord)
                .map(item => clone(item))
            : []
        );
      }
    } catch {
      // Fallback to current in-memory state if file is corrupted or unavailable.
    }
  }

  persistToDisk(): void {
    const dir = path.dirname(this.filePath);
    const payload: Record<string, Row[]> = {};

    for (const [table, rows] of this.tables.entries()) {
      payload[table] = rows.map(row => clone(row));
    }

    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(payload), 'utf8');
    } catch {
      // File persistence is best-effort in test mode.
    }
  }
}

function getGlobalStore(): InMemoryStore {
  const globalRef = globalThis as unknown as Record<string, unknown>;
  const existing = globalRef[GLOBAL_STORE_KEY];
  if (existing instanceof InMemoryStore) {
    return existing;
  }

  const created = new InMemoryStore();
  globalRef[GLOBAL_STORE_KEY] = created;
  return created;
}

const store = getGlobalStore();

function parseSelectFields(selectClause: string): string[] {
  return selectClause
    .replace(/\s+/g, ' ')
    .split(',')
    .map(field => field.trim())
    .filter(Boolean)
    .map(field => field.split(' ')[0].trim())
    .filter(field => field !== '*');
}

function parseOrClause(orClause: string): FilterFn[] {
  const parts = orClause
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const filters: FilterFn[] = [];

  for (const part of parts) {
    const ilikeMatch = part.match(/^([a-zA-Z0-9_]+)\.ilike\.(.+)$/);
    if (ilikeMatch) {
      const [, column, rawPattern] = ilikeMatch;
      const pattern = rawPattern.replace(/^%/, '').replace(/%$/, '').toLowerCase();
      filters.push(row => String(row[column] ?? '').toLowerCase().includes(pattern));
      continue;
    }

    const eqMatch = part.match(/^([a-zA-Z0-9_]+)\.eq\.(.+)$/);
    if (eqMatch) {
      const [, column, rawValue] = eqMatch;
      const parsedValue = rawValue === 'null' ? null : rawValue;
      filters.push(row => row[column] === parsedValue);
    }
  }

  return filters;
}

class InMemoryQueryBuilder implements PromiseLike<QueryResult<unknown>> {
  private readonly tableName: string;
  private operation: MutationOperation = 'select';
  private selectClause = '*';
  private selectOptions: Record<string, unknown> = {};
  private mutationPayload: unknown = null;
  private filters: FilterFn[] = [];
  private orderRules: OrderRule[] = [];
  private rangeRule: { from: number; to: number } | null = null;
  private limitCount: number | null = null;
  private returnMutatedRows = false;
  private upsertConflictColumns: string[] = ['id'];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(selectClause: string = '*', options: Record<string, unknown> = {}): this {
    this.selectClause = selectClause;
    this.selectOptions = options;
    if (this.operation !== 'select') {
      this.returnMutatedRows = true;
    }
    return this;
  }

  insert(payload: unknown): this {
    this.operation = 'insert';
    this.mutationPayload = payload;
    return this;
  }

  upsert(payload: unknown, options?: { onConflict?: string }): this {
    this.operation = 'upsert';
    this.mutationPayload = payload;
    const conflict = options?.onConflict;
    if (conflict) {
      this.upsertConflictColumns = conflict
        .split(',')
        .map(column => column.trim())
        .filter(Boolean);
    }
    return this;
  }

  update(payload: unknown): this {
    this.operation = 'update';
    this.mutationPayload = payload;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push(row => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push(row => row[column] !== value);
    return this;
  }

  is(column: string, value: unknown): this {
    if (value === null) {
      this.filters.push(row => row[column] === null || row[column] === undefined);
    } else {
      this.filters.push(row => row[column] === value);
    }
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push(row => values.includes(row[column]));
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push(row => {
      const cellValue = row[column] as number | string | null;
      return cellValue !== null && cellValue > (value as number | string);
    });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push(row => {
      const cellValue = row[column] as number | string | null;
      return cellValue !== null && cellValue >= (value as number | string);
    });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push(row => {
      const cellValue = row[column] as number | string | null;
      return cellValue !== null && cellValue < (value as number | string);
    });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push(row => {
      const cellValue = row[column] as number | string | null;
      return cellValue !== null && cellValue <= (value as number | string);
    });
    return this;
  }

  ilike(column: string, pattern: string): this {
    const normalized = pattern.replace(/^%/, '').replace(/%$/, '').toLowerCase();
    this.filters.push(row => String(row[column] ?? '').toLowerCase().includes(normalized));
    return this;
  }

  or(orClause: string): this {
    const parsed = parseOrClause(orClause);
    if (parsed.length > 0) {
      this.filters.push(row => parsed.some(filter => filter(row)));
    }
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    this.orderRules.push({
      column,
      ascending: options.ascending !== false,
    });
    return this;
  }

  range(from: number, to: number): this {
    this.rangeRule = { from, to };
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  async single(): Promise<QueryResult<unknown>> {
    return this.executeSingle(false);
  }

  async maybeSingle(): Promise<QueryResult<unknown>> {
    return this.executeSingle(true);
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async executeSingle(allowEmpty: boolean): Promise<QueryResult<unknown>> {
    const result = await this.execute();

    if (result.error) {
      return result;
    }

    const rows = Array.isArray(result.data)
      ? result.data
      : result.data === null || result.data === undefined
        ? []
        : [result.data];

    if (rows.length === 1) {
      return { ...result, data: rows[0] };
    }

    if (rows.length === 0) {
      if (allowEmpty) {
        return { ...result, data: null, error: null };
      }
      return { ...result, data: null, error: postgrestError('No rows found', 'PGRST116') };
    }

    return {
      ...result,
      data: null,
      error: postgrestError('Multiple rows found where single row expected', 'PGRST116'),
    };
  }

  private async execute(): Promise<QueryResult<unknown>> {
    try {
      // Keep both Playwright process and web server process in sync via shared file state.
      store.hydrateFromDisk();

      switch (this.operation) {
        case 'insert':
          return this.executeInsert();
        case 'update':
          return this.executeUpdate();
        case 'delete':
          return this.executeDelete();
        case 'upsert':
          return this.executeUpsert();
        default:
          return this.executeSelect();
      }
    } catch (error) {
      return {
        data: null,
        error: postgrestError(
          error instanceof Error ? error.message : 'In-memory Supabase operation failed'
        ),
        count: null,
      };
    }
  }

  private executeSelect(): QueryResult<unknown> {
    const rows = this.applyReadTransforms(this.filterRows(store.get(this.tableName)));
    const count =
      this.selectOptions.count === 'exact' ? this.filterRows(store.get(this.tableName)).length : null;

    return {
      data: this.selectOptions.head === true ? null : this.projectRows(rows),
      error: null,
      count,
    };
  }

  private executeInsert(): QueryResult<unknown> {
    const table = store.get(this.tableName);
    const payloadRows = this.normalizePayloadRows(this.mutationPayload);
    const insertedRows: Row[] = [];

    for (const payloadRow of payloadRows) {
      const inserted = this.prepareNewRow(payloadRow);
      table.push(inserted);
      insertedRows.push(inserted);
    }

    store.persistToDisk();

    return {
      data: this.returnMutatedRows ? this.projectRows(insertedRows) : null,
      error: null,
      count: null,
    };
  }

  private executeUpsert(): QueryResult<unknown> {
    const table = store.get(this.tableName);
    const payloadRows = this.normalizePayloadRows(this.mutationPayload);
    const affectedRows: Row[] = [];

    for (const payloadRow of payloadRows) {
      const existing = table.find(row =>
        this.upsertConflictColumns.every(column => row[column] === payloadRow[column])
      );

      if (existing) {
        Object.assign(existing, clone(payloadRow));
        if (existing.updated_at === undefined || payloadRow.updated_at === undefined) {
          existing.updated_at = nowIso();
        }
        affectedRows.push(existing);
      } else {
        const inserted = this.prepareNewRow(payloadRow);
        table.push(inserted);
        affectedRows.push(inserted);
      }
    }

    store.persistToDisk();

    return {
      data: this.returnMutatedRows ? this.projectRows(affectedRows) : null,
      error: null,
      count: null,
    };
  }

  private executeUpdate(): QueryResult<unknown> {
    const table = store.get(this.tableName);
    const payload = isRecord(this.mutationPayload) ? clone(this.mutationPayload) : {};
    const updatedRows: Row[] = [];

    for (const row of table) {
      if (!this.matchesFilters(row)) {
        continue;
      }

      Object.assign(row, payload);
      if (row.updated_at !== undefined && payload.updated_at === undefined) {
        row.updated_at = nowIso();
      }
      updatedRows.push(row);
    }

    store.persistToDisk();

    return {
      data: this.returnMutatedRows ? this.projectRows(updatedRows) : null,
      error: null,
      count: null,
    };
  }

  private executeDelete(): QueryResult<unknown> {
    const table = store.get(this.tableName);
    const keptRows: Row[] = [];
    const removedRows: Row[] = [];

    for (const row of table) {
      if (this.matchesFilters(row)) {
        removedRows.push(row);
      } else {
        keptRows.push(row);
      }
    }

    store.get(this.tableName).splice(0, table.length, ...keptRows);
    store.persistToDisk();

    return {
      data: this.returnMutatedRows ? this.projectRows(removedRows) : null,
      error: null,
      count: null,
    };
  }

  private normalizePayloadRows(payload: unknown): Row[] {
    if (Array.isArray(payload)) {
      return payload.map(item => (isRecord(item) ? clone(item) : {}));
    }

    if (isRecord(payload)) {
      return [clone(payload)];
    }

    return [];
  }

  private prepareNewRow(payload: Row): Row {
    const row = clone(payload);
    const timestamp = nowIso();

    if (row.id === undefined) {
      row.id = generateId();
    }

    if (row.created_at === undefined) {
      row.created_at = timestamp;
    }

    if (row.updated_at === undefined) {
      row.updated_at = timestamp;
    }

    if (this.tableName === 'campaign_integrations' && row.enabled === undefined) {
      row.enabled = true;
    }

    if (this.tableName === 'profiles') {
      if (row.subscription_credits_balance === undefined) {
        row.subscription_credits_balance = 10;
      }
      if (row.purchased_credits_balance === undefined) {
        row.purchased_credits_balance = 0;
      }
      if (row.subscription_status === undefined) {
        row.subscription_status = null;
      }
      if (row.subscription_tier === undefined) {
        row.subscription_tier = null;
      }
      if (row.stripe_customer_id === undefined) {
        row.stripe_customer_id = null;
      }
      if (row.role === undefined) {
        row.role = 'user';
      }
    }

    return row;
  }

  private matchesFilters(row: Row): boolean {
    return this.filters.every(filter => filter(row));
  }

  private filterRows(rows: Row[]): Row[] {
    return rows.filter(row => this.matchesFilters(row));
  }

  private applyReadTransforms(rows: Row[]): Row[] {
    const transformed = rows.map(row => clone(row));

    if (this.orderRules.length > 0) {
      transformed.sort((a, b) => {
        for (let i = this.orderRules.length - 1; i >= 0; i -= 1) {
          const rule = this.orderRules[i];
          const aValue = a[rule.column];
          const bValue = b[rule.column];

          if (aValue === bValue) {
            continue;
          }

          if (aValue === null || aValue === undefined) {
            return rule.ascending ? 1 : -1;
          }
          if (bValue === null || bValue === undefined) {
            return rule.ascending ? -1 : 1;
          }

          if (aValue > bValue) {
            return rule.ascending ? 1 : -1;
          }

          if (aValue < bValue) {
            return rule.ascending ? -1 : 1;
          }
        }

        return 0;
      });
    }

    let paginated = transformed;

    if (this.rangeRule) {
      paginated = paginated.slice(this.rangeRule.from, this.rangeRule.to + 1);
    }

    if (this.limitCount !== null) {
      paginated = paginated.slice(0, this.limitCount);
    }

    return paginated;
  }

  private projectRows(rows: Row[]): Row[] {
    const normalizedSelect = this.selectClause.replace(/\s+/g, ' ').trim();

    // Handle integration count join:
    // select("*, campaign_integrations (count)")
    if (
      this.tableName === 'integrations' &&
      normalizedSelect.includes('campaign_integrations (count)')
    ) {
      const campaignIntegrations = store.get('campaign_integrations');

      return rows.map(row => {
        const count = campaignIntegrations.filter(
          campaignIntegration => campaignIntegration.integration_id === row.id
        ).length;

        return {
          ...clone(row),
          campaign_integrations: [{ count }],
        };
      });
    }

    // Handle campaign integration details join:
    // select("..., integrations (...)")
    if (
      this.tableName === 'campaign_integrations' &&
      normalizedSelect.includes('integrations (')
    ) {
      const integrations = store.get('integrations');
      return rows.map(row => {
        const integration = integrations.find(item => item.id === row.integration_id);
        return {
          ...clone(row),
          integrations: integration ? clone(integration) : null,
        };
      });
    }

    if (normalizedSelect === '*' || normalizedSelect.length === 0) {
      return rows.map(row => clone(row));
    }

    const fields = parseSelectFields(normalizedSelect);
    if (fields.length === 0) {
      return rows.map(row => clone(row));
    }

    return rows.map(row => {
      const projected: Row = {};
      for (const field of fields) {
        projected[field] = clone(row[field]);
      }
      return projected;
    });
  }
}

class InMemorySupabaseAdmin {
  from(tableName: string): InMemoryQueryBuilder {
    return new InMemoryQueryBuilder(tableName);
  }

  async rpc(functionName: string, params: Record<string, unknown> = {}): Promise<QueryResult<unknown>> {
    store.hydrateFromDisk();

    // Minimal RPC support for test flows that mutate credits in-memory.
    if (functionName === 'increment_credits_with_log') {
      const userId = params.target_user_id as string;
      const amount = Number(params.amount || 0);
      const profiles = store.get('profiles');
      const profile = profiles.find(row => row.id === userId);
      if (profile) {
        const current = Number(profile.purchased_credits_balance || 0);
        profile.purchased_credits_balance = current + amount;
        profile.updated_at = nowIso();
      }

      store.get('credit_transactions').push({
        id: generateId(),
        user_id: userId,
        amount,
        type: params.transaction_type || 'bonus',
        reference_id: params.ref_id || null,
        description: params.description || null,
        created_at: nowIso(),
      });

      store.persistToDisk();

      return { data: null, error: null, count: null };
    }

    if (functionName === 'add_purchased_credits') {
      const userId = params.p_user_id as string;
      const amount = Number(params.p_amount || 0);
      const profiles = store.get('profiles');
      const profile = profiles.find(row => row.id === userId);
      if (profile) {
        const current = Number(profile.purchased_credits_balance || 0);
        profile.purchased_credits_balance = current + amount;
        profile.updated_at = nowIso();
      }
      store.persistToDisk();
      return { data: null, error: null, count: null };
    }

    // Unknown functions in test mode are treated as no-op.
    return { data: null, error: null, count: null };
  }

  auth = {
    getUser: async (_token?: string) => ({
      data: { user: null },
      error: postgrestError('Auth user lookup is not implemented in in-memory mode', 'PGRST401'),
    }),
    admin: {
      deleteUser: async (userId: string) => {
        store.hydrateFromDisk();
        for (const tableName of ['profiles', 'projects', 'subscriptions', 'user_credits']) {
          const table = store.get(tableName);
          const key = tableName === 'profiles' ? 'id' : 'user_id';
          const kept = table.filter(row => row[key] !== userId);
          store.get(tableName).splice(0, table.length, ...kept);
        }
        store.persistToDisk();

        return { data: { user: null }, error: null };
      },
      createUser: async ({ email }: { email: string }) => {
        const id = generateId();
        return {
          data: {
            user: {
              id,
              email,
            },
          },
          error: null,
        };
      },
      listUsers: async () => ({
        data: { users: [] },
        error: null,
      }),
    },
    signInWithPassword: async ({ email }: { email: string }) => ({
      data: {
        session: { access_token: `test_token_${generateId()}` },
        user: { id: generateId(), email },
      },
      error: null,
    }),
  };
}

export const inMemorySupabaseAdmin = new InMemorySupabaseAdmin() as unknown as SupabaseClient;

// Optional manual reset hook for debugging.
export function resetInMemorySupabase(): void {
  store.reset();
}
