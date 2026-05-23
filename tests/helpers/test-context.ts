import { TestDataManager, type ITestUser, isTestRuntime } from './test-data-manager';
import fs from 'node:fs';

export interface ITestContextOptions {
  autoCleanup?: boolean;
}

// DB path must match the one in inMemorySupabaseAdmin.ts
const DEFAULT_DB_PATH = '/tmp/saas-boilerplate-playwright-mock-db.json';
const DB_PATH = process.env.PLAYWRIGHT_MOCK_DB_PATH ?? DEFAULT_DB_PATH;

/**
 * Read the mock DB file and return the tables
 */
function readMockDb(): Record<string, Record<string, unknown>[]> {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return {
        profiles: [],
        projects: [],
        campaigns: [],
        keywords: [],
        articles: [],
        opportunities: [],
        gsc_connections: [],
        integrations: [],
        campaign_integrations: [],
        subscriptions: [],
        user_credits: [],
        credit_transactions: [],
        article_deliveries: [],
        user_onboarding: [],
        email_preferences: [],
        email_logs: [],
      };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    if (!raw.trim()) {
      return {
        profiles: [],
        projects: [],
        campaigns: [],
        keywords: [],
        articles: [],
        opportunities: [],
        gsc_connections: [],
        integrations: [],
        campaign_integrations: [],
        subscriptions: [],
        user_credits: [],
        credit_transactions: [],
        article_deliveries: [],
        user_onboarding: [],
        email_preferences: [],
        email_logs: [],
      };
    }
    return JSON.parse(raw) as Record<string, Record<string, unknown>[]>;
  } catch {
    return {
      profiles: [],
      projects: [],
      campaigns: [],
      keywords: [],
      articles: [],
      opportunities: [],
      gsc_connections: [],
      integrations: [],
      campaign_integrations: [],
      subscriptions: [],
      user_credits: [],
      credit_transactions: [],
      article_deliveries: [],
      user_onboarding: [],
      email_preferences: [],
      email_logs: [],
    };
  }
}

/**
 * Write the mock DB file with updated tables
 */
function writeMockDb(data: Record<string, Record<string, unknown>[]>): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.warn('Failed to write mock DB:', error);
  }
}

/**
 * Unified test context for managing test resources, users, and cleanup
 *
 * This class centralizes test resource management, ensuring proper cleanup
 * and preventing resource leaks across different test types.
 */
export class TestContext {
  private dataManager: TestDataManager;
  private users: ITestUser[] = [];
  private cleanupCallbacks: (() => Promise<void>)[] = [];
  private options: ITestContextOptions;

  constructor(options: ITestContextOptions = { autoCleanup: true }) {
    this.options = options;
    this.dataManager = new TestDataManager();
  }

  /**
   * Creates a test user and tracks it for cleanup
   *
   * @param options - User configuration options
   * @returns Test user with authentication token
   */
  async createUser(options?: {
    subscription?: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled';
    tier?: 'starter' | 'growth' | 'agency';
    credits?: number;
    role?: 'user' | 'admin';
  }): Promise<ITestUser> {
    const { subscription = 'free', tier, credits = 10, role = 'user' } = options || {};

    try {
      const user =
        subscription === 'free'
          ? await this.dataManager.createTestUser()
          : await this.dataManager.createTestUserWithSubscription(subscription, tier, credits);

      this.users.push(user);
      return user;
    } catch (error) {
      // In test environment, if user creation fails, create a mock user
      if (isTestRuntime()) {
        const mockUserId = this.generateUUID();
        const mockToken =
          subscription === 'free'
            ? `test_token_mock_user_${mockUserId}`
            : `test_token_mock_user_${mockUserId}_sub_${subscription}_${tier || 'growth'}`;

        const mockUser: ITestUser = {
          id: mockUserId,
          email: `test-${mockUserId}@example.com`,
          token: mockToken,
        };

        // Insert user profile into mock DB file so API routes can find it
        const db = readMockDb();
        if (!db.profiles) db.profiles = [];
        const now = new Date().toISOString();
        const subscriptionStatus =
          subscription === 'free' ? null : subscription === 'active' ? 'active' : subscription;
        db.profiles.push({
          id: mockUserId,
          email: mockUser.email,
          display_name: `Test User ${mockUserId.slice(0, 8)}`,
          role,
          subscription_status: subscriptionStatus,
          subscription_tier: subscription === 'free' ? null : tier || 'growth',
          subscription_credits_balance: credits,
          purchased_credits_balance: 0,
          stripe_customer_id: null,
          created_at: now,
          updated_at: now,
        });
        // Insert initial subscription credit transaction for non-free users
        if (subscription !== 'free' && credits > 0) {
          if (!db.credit_transactions) db.credit_transactions = [];
          db.credit_transactions.push({
            id: this.generateUUID(),
            user_id: mockUserId,
            amount: credits,
            type: 'subscription',
            description: 'Initial subscription credits',
            reference_id: null,
            created_at: now,
          });
        }
        writeMockDb(db);

        this.users.push(mockUser);
        return mockUser;
      }
      throw error;
    }
  }

  /**
   * Creates multiple test users for scenarios requiring multiple accounts
   *
   * @param count - Number of users to create
   * @param options - User configuration options applied to all users
   * @returns Array of test users
   */
  async createUsers(
    count: number,
    options?: {
      subscription?: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled';
      tier?: 'starter' | 'growth' | 'agency';
      credits?: number;
    }
  ): Promise<ITestUser[]> {
    const users: ITestUser[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser(options);
      users.push(user);
    }
    return users;
  }

  /**
   * Gets the underlying data manager for advanced operations
   *
   * @returns TestDataManager instance for direct database operations
   */
  get data(): TestDataManager {
    return this.dataManager;
  }

  /**
   * Gets direct access to Supabase admin client for advanced operations
   *
   * @returns Supabase client instance
   */
  get supabaseAdmin() {
    return this.dataManager.getSupabaseClient();
  }

  /**
   * Gets all users created by this test context
   *
   * @returns Array of created test users
   */
  get createdUsers(): ITestUser[] {
    return [...this.users];
  }

  /**
   * Registers a cleanup callback to be executed during cleanup
   *
   * @param callback - Async function to run during cleanup
   */
  onCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Removes a user from tracking without deleting them from database
   *
   * @param userId - ID of user to remove from tracking
   */
  untrackUser(userId: string): void {
    this.users = this.users.filter(user => user.id !== userId);
  }

  /**
   * Cleans up all resources created by this test context
   *
   * Runs all registered cleanup callbacks and deletes all created users.
   * Collects all errors and throws at the end to ensure all cleanup attempts are made.
   */
  async cleanup(): Promise<void> {
    const errors: Error[] = [];
    const CLEANUP_TIMEOUT_MS = 30000; // 30 second timeout per callback

    // Run custom cleanup callbacks first with timeout
    for (const callback of this.cleanupCallbacks) {
      try {
        await Promise.race([
          callback(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Cleanup callback timeout')), CLEANUP_TIMEOUT_MS)
          ),
        ]);
      } catch (error) {
        const cleanupError =
          error instanceof Error ? error : new Error(`Cleanup callback failed: ${String(error)}`);
        console.warn('Cleanup callback failed:', cleanupError.message);
        errors.push(cleanupError);
      }
    }

    // Clean up users through data manager
    try {
      await this.dataManager.cleanupAllUsers();
    } catch (error) {
      const userCleanupError =
        error instanceof Error ? error : new Error(`User cleanup failed: ${String(error)}`);
      console.warn('User cleanup failed:', userCleanupError.message);
      errors.push(userCleanupError);
    }

    // Reset internal state regardless of errors
    this.users = [];
    this.cleanupCallbacks = [];

    // If any errors occurred, throw an aggregate error
    if (errors.length > 0) {
      const errorMessages = errors.map(e => e.message).join('; ');
      throw new Error(`Cleanup failed with ${errors.length} error(s): ${errorMessages}`);
    }
  }

  /**
   * Cleans up a specific user immediately
   *
   * @param userId - ID of user to clean up
   */
  async cleanupUser(userId: string): Promise<void> {
    try {
      await this.dataManager.cleanupUser(userId);
      this.untrackUser(userId);
    } catch (error) {
      console.warn(`Failed to cleanup user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the current user count
   *
   * @returns Number of tracked users
   */
  get userCount(): number {
    return this.users.length;
  }

  /**
   * Checks if auto cleanup is enabled
   *
   * @returns True if auto cleanup is enabled
   */
  get isAutoCleanupEnabled(): boolean {
    return this.options.autoCleanup ?? true;
  }

  /**
   * Sets up Stripe customer ID for webhook tests
   * This enables webhooks to properly look up users by stripe_customer_id
   *
   * @param userId - User ID to set up
   * @param customerId - Optional Stripe customer ID (defaults to cus_${userId})
   */
  async setupStripeCustomer(userId: string, customerId?: string): Promise<void> {
    const stripeCustomerId = customerId || `cus_${userId}`;

    if (isTestRuntime()) {
      // In test mode, update the test mode profile
      const existingProfile = (this.dataManager as any).testModeProfiles?.get(userId);
      if (existingProfile) {
        existingProfile.stripe_customer_id = stripeCustomerId;
        existingProfile.updated_at = new Date().toISOString();
        (this.dataManager as any).testModeProfiles.set(userId, existingProfile);
      }
      return;
    }

    // In production mode, update the database
    const { error } = await this.supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to set stripe_customer_id: ${error.message}`);
    }
  }

  /**
   * Generates a UUID v4 for test users
   *
   * @returns A valid UUID string
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Creates a test project for a user
   *
   * @param userId - User ID who owns the project
   * @param options - Project configuration
   * @returns Created project
   */
  async createProject(
    userId: string,
    options: {
      name: string;
      url?: string;
      domain?: string;
      content_preferences?: Record<string, unknown>;
    }
  ): Promise<{ id: string }> {
    const projectId = this.generateUUID();
    const now = new Date().toISOString();

    // In test mode, insert into mock DB file for web server access
    if (isTestRuntime()) {
      const db = readMockDb();
      if (!db.projects) db.projects = [];
      db.projects.push({
        id: projectId,
        user_id: userId,
        name: options.name,
        domain: options.domain || options.url || null,
        content_preferences: options.content_preferences ?? {},
        cms_type: 'wordpress',
        cms_credentials: {},
        status: 'active',
        language: 'en',
        country: 'US',
        created_at: now,
        updated_at: now,
      });
      writeMockDb(db);
      return { id: projectId };
    }

    const { error } = await this.supabaseAdmin.from('projects').insert({
      id: projectId,
      user_id: userId,
      name: options.name,
      domain: options.domain || options.url || null,
      content_preferences: options.content_preferences ?? {},
    });

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return { id: projectId };
  }

  /**
   * Creates a campaign record directly in the mock DB file (works in both test and non-test mode).
   * Unlike createCampaign, this always persists to the DB so the web server can find it.
   *
   * @param userId - User ID who owns the campaign
   * @param projectId - Project ID the campaign belongs to
   * @param options - Campaign configuration
   * @returns Created campaign with id
   */
  async createCampaignRecord(
    userId: string,
    projectId: string,
    options: { name: string; settings?: Record<string, unknown> }
  ): Promise<{ id: string }> {
    const campaignId = this.generateUUID();
    const now = new Date().toISOString();

    if (isTestRuntime()) {
      const db = readMockDb();
      if (!db.campaigns) db.campaigns = [];
      db.campaigns.push({
        id: campaignId,
        user_id: userId,
        project_id: projectId,
        name: options.name,
        status: 'draft',
        settings: options.settings ?? {},
        created_at: now,
        updated_at: now,
      });
      writeMockDb(db);
      return { id: campaignId };
    }

    const { error } = await this.supabaseAdmin.from('campaigns').insert({
      id: campaignId,
      user_id: userId,
      project_id: projectId,
      name: options.name,
      status: 'draft',
      settings: options.settings ?? {},
    });

    if (error) {
      throw new Error(`Failed to create campaign record: ${error.message}`);
    }

    return { id: campaignId };
  }

  /**
   * Creates an integration record directly in the mock DB file (works in both test and non-test mode).
   *
   * @param userId - User ID who owns the integration
   * @param options - Integration configuration
   * @returns Created integration with id
   */
  async createIntegrationRecord(
    userId: string,
    options: {
      type: string;
      name: string;
      config: Record<string, unknown>;
      status?: string;
    }
  ): Promise<{ id: string }> {
    const integrationId = this.generateUUID();
    const now = new Date().toISOString();

    if (isTestRuntime()) {
      const db = readMockDb();
      if (!db.integrations) db.integrations = [];
      db.integrations.push({
        id: integrationId,
        user_id: userId,
        type: options.type,
        name: options.name,
        config: options.config,
        encrypted_credentials: 'test-encrypted',
        status: options.status ?? 'active',
        last_tested_at: null,
        created_at: now,
        updated_at: now,
      });
      writeMockDb(db);
      return { id: integrationId };
    }

    const { error } = await this.supabaseAdmin.from('integrations').insert({
      id: integrationId,
      user_id: userId,
      type: options.type,
      name: options.name,
      config: options.config,
      encrypted_credentials: 'test-encrypted',
      status: options.status ?? 'active',
    });

    if (error) {
      throw new Error(`Failed to create integration record: ${error.message}`);
    }

    return { id: integrationId };
  }

  /**
   * Creates an article record directly in the mock DB file (works in both test and non-test mode).
   *
   * @param userId - User ID who owns the article
   * @param campaignId - Campaign the article belongs to
   * @param options - Article configuration
   * @returns Created article with id
   */
  async createArticleRecord(
    userId: string,
    campaignId: string,
    options: { title: string; slug: string; content?: string; status?: string }
  ): Promise<{ id: string }> {
    const articleId = this.generateUUID();
    const now = new Date().toISOString();

    if (isTestRuntime()) {
      const db = readMockDb();
      if (!db.articles) db.articles = [];
      db.articles.push({
        id: articleId,
        user_id: userId,
        campaign_id: campaignId,
        title: options.title,
        slug: options.slug,
        content: options.content ?? '',
        status: options.status ?? 'draft',
        created_at: now,
        updated_at: now,
      });
      writeMockDb(db);
      return { id: articleId };
    }

    const { error } = await this.supabaseAdmin.from('articles').insert({
      id: articleId,
      user_id: userId,
      campaign_id: campaignId,
      title: options.title,
      slug: options.slug,
      content: options.content ?? '',
      status: options.status ?? 'draft',
    });

    if (error) {
      throw new Error(`Failed to create article record: ${error.message}`);
    }

    return { id: articleId };
  }

  /**
   * Creates a campaign_integrations junction record directly in the mock DB file.
   *
   * @param campaignId - Campaign ID
   * @param integrationId - Integration ID
   * @param enabled - Whether the integration is enabled
   */
  async assignIntegrationToCampaign(
    campaignId: string,
    integrationId: string,
    enabled = true
  ): Promise<void> {
    const now = new Date().toISOString();

    if (isTestRuntime()) {
      const db = readMockDb();
      if (!db.campaign_integrations) db.campaign_integrations = [];
      db.campaign_integrations.push({
        id: this.generateUUID(),
        campaign_id: campaignId,
        integration_id: integrationId,
        enabled,
        created_at: now,
        updated_at: now,
      });
      writeMockDb(db);
      return;
    }

    const { error } = await this.supabaseAdmin.from('campaign_integrations').insert({
      campaign_id: campaignId,
      integration_id: integrationId,
      enabled,
    });

    if (error) {
      throw new Error(`Failed to assign integration to campaign: ${error.message}`);
    }
  }

  /**
   * Creates a test campaign for a user
   *
   * @param userId - User ID who owns the campaign
   * @param projectId - Project ID the campaign belongs to
   * @param options - Campaign configuration
   * @returns Created campaign
   */
  async createCampaign(
    userId: string,
    projectId: string,
    options: {
      name: string;
      keywords: string[];
      model?: string;
      tone?: string;
      targetWordCount?: number;
      imagePreset?: string;
    }
  ): Promise<{ id: string }> {
    const campaignId = this.generateUUID();

    // In test mode, return mock campaign without database operations
    if (isTestRuntime()) {
      return { id: campaignId };
    }

    const { error: campaignError } = await this.supabaseAdmin.from('campaigns').insert({
      id: campaignId,
      user_id: userId,
      project_id: projectId,
      name: options.name,
      status: 'draft',
      ai_model: options.model || 'auto',
      tone: options.tone || 'professional',
      target_word_count: options.targetWordCount || 1500,
      settings: {},
      image_preset: options.imagePreset || null,
    });

    if (campaignError) {
      throw new Error(`Failed to create campaign: ${campaignError.message}`);
    }

    // Insert keywords
    const keywordRows = options.keywords.map(keyword => ({
      campaign_id: campaignId,
      keyword: keyword.trim(),
      status: 'pending' as const,
      difficulty: 'unknown' as const,
      priority: 0,
    }));

    const { error: keywordsError } = await this.supabaseAdmin.from('keywords').insert(keywordRows);

    if (keywordsError) {
      throw new Error(`Failed to create keywords: ${keywordsError.message}`);
    }

    return { id: campaignId };
  }

  /**
   * Gets all articles for a campaign
   *
   * @param campaignId - Campaign ID to get articles for
   * @returns Array of articles
   */
  async getArticlesByCampaign(campaignId: string): Promise<Array<{ id: string }>> {
    // In test mode, return empty array without database operations
    if (isTestRuntime()) {
      return [];
    }

    const { data, error } = await this.supabaseAdmin
      .from('articles')
      .select('id')
      .eq('campaign_id', campaignId);

    if (error) {
      throw new Error(`Failed to get articles: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Creates a test article directly in the mock DB with a specified status.
   *
   * Useful in test mode when the real generation service is unavailable and you
   * need an article in a specific non-initial state (e.g. "draft", "approved").
   *
   * @param options - Article configuration
   * @returns Created article id
   */
  async createArticle(options: {
    userId: string;
    campaignId: string;
    keyword?: string;
    status?: string;
    title?: string;
  }): Promise<{ id: string }> {
    const articleId = this.generateUUID();
    const now = new Date().toISOString();

    if (isTestRuntime()) {
      const db = readMockDb();
      if (!db.articles) db.articles = [];
      db.articles.push({
        id: articleId,
        campaign_id: options.campaignId,
        user_id: options.userId,
        primary_keyword: options.keyword ?? 'test keyword',
        title: options.title ?? null,
        content: null,
        status: options.status ?? 'draft',
        ai_model_used: null,
        seo_score: null,
        ai_detection_score: null,
        word_count: null,
        meta_description: null,
        published_url: null,
        slug: null,
        credits_used: 1,
        generation_error: null,
        generated_at: null,
        published_at: null,
        created_at: now,
        updated_at: now,
      });
      writeMockDb(db);
      return { id: articleId };
    }

    const { error } = await this.supabaseAdmin.from('articles').insert({
      id: articleId,
      campaign_id: options.campaignId,
      user_id: options.userId,
      primary_keyword: options.keyword ?? 'test keyword',
      title: options.title ?? null,
      status: options.status ?? 'draft',
      credits_used: 1,
    });

    if (error) {
      throw new Error(`Failed to create article: ${error.message}`);
    }

    return { id: articleId };
  }

  /**
   * Gets user's credit balance
   *
   * @param userId - User ID to get credits for
   * @returns Total credit balance
   */
  async getUserCredits(userId: string): Promise<number> {
    // In test mode, return default credits from test mode profile
    if (isTestRuntime()) {
      const profile = (this.dataManager as any).testModeProfiles?.get(userId);
      return profile?.credits_balance || 10;
    }

    const { data, error } = await this.supabaseAdmin
      .from('user_credits')
      .select('total_credits_balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to get user credits: ${error.message}`);
    }

    return data?.total_credits_balance || 0;
  }

  /**
   * Gets a campaign by ID
   *
   * @param campaignId - Campaign ID to get
   * @returns Campaign data
   */
  async getCampaignById(campaignId: string): Promise<{
    id: string;
    generation_run_id: string | null;
  }> {
    // In test mode, return mock campaign without database operations
    if (isTestRuntime()) {
      return { id: campaignId, generation_run_id: null };
    }

    const { data, error } = await this.supabaseAdmin
      .from('campaigns')
      .select('id, generation_run_id')
      .eq('id', campaignId)
      .single();

    if (error) {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }

    return data;
  }
}
