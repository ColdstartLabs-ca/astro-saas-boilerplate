import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@shared/config/env';
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

const GLOBAL_STORE_KEY = '__SAAS_BOILERPLATE_IN_MEMORY_SUPABASE__';
const DEFAULT_DB_PATH = '/tmp/saas-boilerplate-playwright-mock-db.json';
const DB_PATH = serverEnv.PLAYWRIGHT_MOCK_DB_PATH ?? DEFAULT_DB_PATH;

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
  /** IDs explicitly deleted from this store instance — prevents re-adding from file on merge */
  private deletedIds = new Map<string, Set<string>>();

  trackDeleted(table: string, id: string): void {
    if (!this.deletedIds.has(table)) {
      this.deletedIds.set(table, new Set());
    }
    this.deletedIds.get(table)!.add(id);
  }

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
      'integration_deliveries',
      'opportunities',
      'subscriptions',
      'user_credits',
      'credit_transactions',
      'article_deliveries',
      'user_onboarding',
      'email_preferences',
      'email_logs',
      // Example Competitor feature parity tables
      'project_target_audiences',
      'project_competitors',
      'project_example_articles',
      'sitemap_pages',
      'content_strategies',
      // Analytics
      'article_performance_snapshots',
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
    // Clear in-memory tables
    for (const table of this.defaults) {
      this.tables.set(table, []);
    }
    // Clear deleted IDs tracking
    this.deletedIds.clear();
    // Clear the file directly (avoid merge logic in persistToDisk which would re-add file rows)
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const emptyPayload: Record<string, Row[]> = {};
      for (const table of this.defaults) {
        emptyPayload[table] = [];
      }
      fs.writeFileSync(this.filePath, JSON.stringify(emptyPayload), 'utf8');
    } catch {
      // File persistence is best-effort in test mode.
    }
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
          Array.isArray(value) ? value.filter(isRecord).map(item => clone(item)) : []
        );
      }
      // Full hydrate is authoritative — clear deleted tracking
      this.deletedIds.clear();
    } catch {
      // Fallback to current in-memory state if file is corrupted or unavailable.
    }
  }

  persistToDisk(): void {
    const dir = path.dirname(this.filePath);

    try {
      fs.mkdirSync(dir, { recursive: true });

      // Read current file state and merge: preserve rows that exist only in the file
      // (written by test helpers between the last hydrate and this persist) unless
      // they were explicitly deleted from this store instance.
      let fileState: Record<string, Row[]> = {};
      try {
        if (fs.existsSync(this.filePath)) {
          const raw = fs.readFileSync(this.filePath, 'utf8');
          if (raw.trim()) {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            for (const table of this.defaults) {
              const value = parsed[table];
              fileState[table] = Array.isArray(value) ? value.filter(isRecord) : [];
            }
          }
        }
      } catch {
        // Ignore read errors — proceed with memory-only state
      }

      const payload: Record<string, Row[]> = {};
      for (const table of this.defaults) {
        const memRows = this.tables.get(table) ?? [];
        const memIds = new Set(memRows.map(r => r.id as string).filter(Boolean));
        const deleted = this.deletedIds.get(table) ?? new Set<string>();

        // Include rows from memory
        const merged: Row[] = memRows.map(r => clone(r));

        // Add file-only rows that weren't explicitly deleted
        for (const fileRow of fileState[table] ?? []) {
          const fileId = fileRow.id as string | undefined;
          if (fileId && !memIds.has(fileId) && !deleted.has(fileId)) {
            merged.push(clone(fileRow));
          }
        }

        payload[table] = merged;
      }

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
    // Handle column.is.null pattern
    const isNullMatch = part.match(/^([a-zA-Z0-9_]+)\.is\.null$/);
    if (isNullMatch) {
      const [, column] = isNullMatch;
      filters.push(row => row[column] === null || row[column] === undefined);
      continue;
    }

    // Handle column.lte.value pattern (for date comparisons)
    const lteMatch = part.match(/^([a-zA-Z0-9_]+)\.lte\.(.+)$/);
    if (lteMatch) {
      const [, column, rawValue] = lteMatch;
      filters.push(row => {
        const cellValue = row[column];
        if (cellValue === null || cellValue === undefined) return false;
        return cellValue <= rawValue;
      });
      continue;
    }

    const ilikeMatch = part.match(/^([a-zA-Z0-9_]+)\.ilike\.(.+)$/);
    if (ilikeMatch) {
      const [, column, rawPattern] = ilikeMatch;
      const pattern = rawPattern.replace(/^%/, '').replace(/%$/, '').toLowerCase();
      filters.push(row =>
        String(row[column] ?? '')
          .toLowerCase()
          .includes(pattern)
      );
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

  /**
   * Negate a filter. Supports: not(column, 'is', null), not(column, 'in', [...])
   */
  not(column: string, operator: string, value: unknown): this {
    if (operator === 'is') {
      if (value === null) {
        // NOT IS NULL means column has a value
        this.filters.push(row => row[column] !== null && row[column] !== undefined);
      } else {
        this.filters.push(row => row[column] !== value);
      }
    } else if (operator === 'in') {
      const values = value as unknown[];
      this.filters.push(row => !values.includes(row[column]));
    } else if (operator === 'eq') {
      this.filters.push(row => row[column] !== value);
    } else if (operator === 'neq') {
      this.filters.push(row => row[column] === value);
    } else if (operator === 'gt') {
      this.filters.push(row => {
        const cellValue = row[column] as number | string | null;
        return cellValue === null || cellValue <= (value as number | string);
      });
    } else if (operator === 'gte') {
      this.filters.push(row => {
        const cellValue = row[column] as number | string | null;
        return cellValue === null || cellValue < (value as number | string);
      });
    } else if (operator === 'lt') {
      this.filters.push(row => {
        const cellValue = row[column] as number | string | null;
        return cellValue === null || cellValue >= (value as number | string);
      });
    } else if (operator === 'lte') {
      this.filters.push(row => {
        const cellValue = row[column] as number | string | null;
        return cellValue === null || cellValue > (value as number | string);
      });
    } else {
      // Fallback: negate equality
      this.filters.push(row => row[column] !== value);
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
    this.filters.push(row =>
      String(row[column] ?? '')
        .toLowerCase()
        .includes(normalized)
    );
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
    // Special handling for user_credits view — computed from profiles in test mode
    if (this.tableName === 'user_credits') {
      const userCreditsRows = store.get('profiles').map(p => ({
        user_id: p.id,
        total_credits_balance:
          Number(p.subscription_credits_balance ?? 0) + Number(p.purchased_credits_balance ?? 0),
      }));
      const filtered = this.filterRows(userCreditsRows as Row[]);
      const rows = this.applyReadTransforms(filtered);
      return {
        data: this.selectOptions.head === true ? null : this.projectRows(rows),
        error: null,
        count: this.selectOptions.count === 'exact' ? filtered.length : null,
      };
    }

    const rows = this.applyReadTransforms(this.filterRows(store.get(this.tableName)));
    const count =
      this.selectOptions.count === 'exact'
        ? this.filterRows(store.get(this.tableName)).length
        : null;

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
        // Track explicitly deleted IDs to prevent re-adding from file on next persistToDisk merge
        const rowId = row.id as string | undefined;
        if (rowId) {
          store.trackDeleted(this.tableName, rowId);
        }
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
    if (this.tableName === 'campaign_integrations' && normalizedSelect.includes('integrations (')) {
      const integrations = store.get('integrations');
      return rows.map(row => {
        const integration = integrations.find(item => item.id === row.integration_id);
        return {
          ...clone(row),
          integrations: integration ? clone(integration) : null,
        };
      });
    }

    // Handle articles + campaigns join (and optionally article_images):
    // select("*, campaigns (...)", ...)
    // Used by GET/PATCH /api/articles, GET/PATCH /api/articles/:id, regenerate, deliver
    if (this.tableName === 'articles' && normalizedSelect.includes('campaigns (')) {
      const campaigns = store.get('campaigns');
      return rows.map(row => {
        const campaign = campaigns.find(c => c.id === row.campaign_id) ?? null;
        const result: Row = { ...clone(row) };
        result.campaigns = campaign ? clone(campaign) : null;
        // article_images is always empty in test mode (no real image generation)
        if (normalizedSelect.includes('article_images (')) {
          result.article_images = [];
        }
        return result;
      });
    }

    // Handle articles + article_images join (without campaigns):
    // Used by deliveryService.deliverArticle
    if (this.tableName === 'articles' && normalizedSelect.includes('article_images(')) {
      return rows.map(row => ({
        ...clone(row),
        article_images: [],
      }));
    }

    // Handle integration_deliveries + integrations join:
    // Used by deliveryService.getArticleDeliveries
    if (
      this.tableName === 'integration_deliveries' &&
      normalizedSelect.includes('integration:integrations (')
    ) {
      const integrations = store.get('integrations');
      return rows.map(row => {
        const integration = integrations.find(item => item.id === row.integration_id) ?? null;
        return {
          ...clone(row),
          integration: integration ? clone(integration) : null,
        };
      });
    }

    // Handle campaigns + projects join:
    // Used by deliveryService.deliverArticle (campaigns.select('..., projects(id, name, domain)'))
    if (this.tableName === 'campaigns' && normalizedSelect.includes('projects(')) {
      const projects = store.get('projects');
      return rows.map(row => {
        const project = projects.find(p => p.id === row.project_id) ?? null;
        return {
          ...clone(row),
          projects: project ? clone(project) : null,
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

  async rpc(
    functionName: string,
    params: Record<string, unknown> = {}
  ): Promise<QueryResult<unknown>> {
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

    if (functionName === 'create_article_with_credits') {
      const userId = params.p_user_id as string;
      const campaignId = params.p_campaign_id as string;
      const projectId = params.p_project_id as string;
      const keyword = params.p_primary_keyword as string;
      const creditsNeeded = Number(params.p_credits_needed ?? 1);
      const status = (params.p_status as string) ?? 'generating';
      const imagePreset = (params.p_image_preset as string | null) ?? null;

      const profiles = store.get('profiles');
      const profile = profiles.find(row => row.id === userId);

      if (!profile) {
        return {
          data: null,
          error: postgrestError('Insufficient credits', 'P0001'),
          count: null,
        };
      }

      const subCredits = Number(profile.subscription_credits_balance ?? 0);
      const purchCredits = Number(profile.purchased_credits_balance ?? 0);
      const totalBalance = subCredits + purchCredits;

      if (totalBalance < creditsNeeded) {
        return {
          data: null,
          error: postgrestError('Insufficient credits', 'P0001'),
          count: null,
        };
      }

      // Create article record
      const articleId = generateId();
      const now = nowIso();
      store.get('articles').push({
        id: articleId,
        user_id: userId,
        campaign_id: campaignId,
        project_id: projectId,
        primary_keyword: keyword,
        keyword_normalized: keyword.toLowerCase().trim(),
        status,
        credits_used: creditsNeeded,
        image_preset: imagePreset,
        created_at: now,
        updated_at: now,
        title: null,
        content: null,
        meta_description: null,
        word_count: 0,
        seo_score: null,
        generation_error: null,
        topic_fingerprint: null,
      });

      // Deduct credits (subscription first, then purchased)
      const newSubCredits = Math.max(0, subCredits - creditsNeeded);
      const remainder = creditsNeeded - (subCredits - newSubCredits);
      const newPurchCredits = Math.max(0, purchCredits - Math.max(0, remainder));

      profile.subscription_credits_balance = newSubCredits;
      profile.purchased_credits_balance = newPurchCredits;
      profile.updated_at = now;

      const newTotalBalance = newSubCredits + newPurchCredits;

      // Log credit transaction
      store.get('credit_transactions').push({
        id: generateId(),
        user_id: userId,
        amount: -creditsNeeded,
        type: 'usage',
        reference_id: articleId,
        description: `Usage operation: ${keyword}`,
        created_at: now,
      });

      store.persistToDisk();

      return {
        data: [{ article_id: articleId, new_total_balance: newTotalBalance }],
        error: null,
        count: null,
      };
    }

    if (functionName === 'promote_planned_article_with_credits') {
      const articleId = params.p_article_id as string;
      const userId = params.p_user_id as string;
      const creditsNeeded = Number(params.p_credits_needed ?? 0);
      const description =
        typeof params.p_description === 'string' && params.p_description.trim().length > 0
          ? params.p_description.trim()
          : 'Planned usage operation';

      if (creditsNeeded <= 0) {
        return {
          data: null,
          error: postgrestError('Credits needed must be positive', 'P0001'),
          count: null,
        };
      }

      const articles = store.get('articles');
      const article = articles.find(
        row => row.id === articleId && row.user_id === userId && row.status === 'planned'
      );

      // Match SQL function behavior: empty set means already claimed / not planned / not owned.
      if (!article) {
        return {
          data: [],
          error: null,
          count: null,
        };
      }

      const profiles = store.get('profiles');
      const profile = profiles.find(row => row.id === userId);
      if (!profile) {
        return {
          data: null,
          error: postgrestError('User not found', 'P0001'),
          count: null,
        };
      }

      const subCredits = Number(profile.subscription_credits_balance ?? 0);
      const purchCredits = Number(profile.purchased_credits_balance ?? 0);
      const totalBalance = subCredits + purchCredits;

      if (totalBalance < creditsNeeded) {
        return {
          data: null,
          error: postgrestError('Insufficient credits', 'P0001'),
          count: null,
        };
      }

      const now = nowIso();
      const fromSubscription = Math.min(subCredits, creditsNeeded);
      const fromPurchased = creditsNeeded - fromSubscription;
      const newSubCredits = subCredits - fromSubscription;
      const newPurchCredits = purchCredits - fromPurchased;
      const transactionId = generateId();

      article.status = 'queued';
      article.credits_used = creditsNeeded;
      article.updated_at = now;

      profile.subscription_credits_balance = newSubCredits;
      profile.purchased_credits_balance = newPurchCredits;
      profile.updated_at = now;

      store.get('credit_transactions').push({
        id: transactionId,
        user_id: userId,
        amount: -creditsNeeded,
        type: 'usage',
        reference_id: articleId,
        description,
        created_at: now,
      });

      store.persistToDisk();

      return {
        data: [
          {
            article_id: articleId,
            transaction_id: transactionId,
            new_subscription_balance: newSubCredits,
            new_purchased_balance: newPurchCredits,
            new_total_balance: newSubCredits + newPurchCredits,
          },
        ],
        error: null,
        count: null,
      };
    }

    if (functionName === 'consume_credits_v2') {
      const userId = params.target_user_id as string;
      const amount = Number(params.amount ?? 0);
      const refId = (params.ref_id as string | null) ?? null;
      const description = (params.description as string | null) ?? null;

      const profiles = store.get('profiles');
      const profile = profiles.find(row => row.id === userId);

      if (profile) {
        const subCredits = Number(profile.subscription_credits_balance ?? 0);
        const purchCredits = Number(profile.purchased_credits_balance ?? 0);

        const newSubCredits = Math.max(0, subCredits - amount);
        const remainder = amount - (subCredits - newSubCredits);
        const newPurchCredits = Math.max(0, purchCredits - Math.max(0, remainder));

        profile.subscription_credits_balance = newSubCredits;
        profile.purchased_credits_balance = newPurchCredits;
        profile.updated_at = nowIso();

        store.get('credit_transactions').push({
          id: generateId(),
          user_id: userId,
          amount: -amount,
          type: 'usage',
          reference_id: refId,
          description,
          created_at: nowIso(),
        });

        store.persistToDisk();
      }

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
