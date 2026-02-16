import { BaseController } from './BaseController';
import { requireAdmin, type IAdminCheckResult } from '../middleware/requireAdmin';
import { adminStatsService } from '../services/admin-stats.service';
import { adminUsersService, type IUpdateProfileRequest } from '../services/admin-users.service';
import { adminSubscriptionService } from '../services/admin-subscription.service';
import type { TimeWindow, GroupBy } from '../services/admin-stats.service';

/**
 * Schema for credit adjustment request
 */
interface ISetCreditsRequest {
  userId: string;
  newBalance: number;
}

/**
 * Schema for update subscription request
 */
interface IUpdateSubscriptionRequest {
  userId: string;
  action: 'cancel' | 'change';
  targetPriceId?: string;
}

/**
 * Admin Controller
 *
 * Handles admin-only API endpoints:
 * - GET /api/admin/stats - Get admin statistics
 * - POST /api/admin/credits/adjust - Adjust user credits
 * - GET /api/admin/users - List users with pagination
 * - GET /api/admin/users/[userId] - Get user details
 * - PATCH /api/admin/users/[userId] - Update user profile
 * - DELETE /api/admin/users/[userId] - Delete user
 * - GET /api/admin/subscription - Get subscription details
 * - POST /api/admin/subscription - Update subscription
 * - GET /api/admin/failure-metrics - Get failure metrics
 *
 * Business logic is delegated to specialized services:
 * - AdminStatsService: stats, failure-metrics
 * - AdminUsersService: users CRUD, credits adjustment
 * - AdminSubscriptionService: subscription management
 */
export class AdminController extends BaseController {
  /**
   * Verify admin access
   * Returns admin check result with error response if not authorized
   */
  protected async checkAdminAccess(req: Request): Promise<IAdminCheckResult> {
    return requireAdmin(req);
  }

  /**
   * Handle incoming request
   */
  protected async handle(req: Request): Promise<Response> {
    const path = this.getPath(req);

    // Route to appropriate method based on path and method
    if (path.endsWith('/stats') && this.isGet(req)) {
      return this.getStats(req);
    }
    if (path.endsWith('/credits/adjust') && this.isPost(req)) {
      return this.adjustCredits(req);
    }
    if (path.endsWith('/users') && this.isGet(req)) {
      return this.listUsers(req);
    }
    if (path.includes('/users/') && this.isGet(req)) {
      return this.getUserById(req);
    }
    if (path.includes('/users/') && this.isPatch(req)) {
      return this.updateUser(req);
    }
    if (path.includes('/users/') && this.isDelete(req)) {
      return this.deleteUser(req);
    }
    if (path.endsWith('/subscription') && this.isGet(req)) {
      return this.getSubscription(req);
    }
    if (path.endsWith('/subscription') && this.isPost(req)) {
      return this.updateSubscription(req);
    }
    if (path.endsWith('/failure-metrics') && this.isGet(req)) {
      return this.getFailureMetrics(req);
    }

    return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  /**
   * GET /api/admin/stats
   * Get admin statistics (total users, active subscriptions, credits issued/used)
   */
  private async getStats(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    try {
      const stats = await adminStatsService.getStats();
      return this.json(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * POST /api/admin/credits/adjust
   * Adjust user credits to a new balance
   */
  private async adjustCredits(req: Request): Promise<Response> {
    const { isAdmin, userId, error } = await this.checkAdminAccess(req);
    if (!isAdmin || !userId) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const adminId = userId;
    const body = await this.getBody<ISetCreditsRequest>(req);

    // Basic validation
    if (!body.userId || typeof body.userId !== 'string') {
      return this.error('VALIDATION_ERROR', 'userId is required', 400);
    }
    if (typeof body.newBalance !== 'number' || body.newBalance < 0) {
      return this.error('VALIDATION_ERROR', 'newBalance must be a non-negative number', 400);
    }

    try {
      const newBalance = await adminUsersService.adjustCredits({
        userId: body.userId,
        newBalance: body.newBalance,
        adminId,
      });
      return this.json({ newBalance });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage === 'User not found') {
        return this.error('NOT_FOUND', errorMessage, 404);
      }

      return this.error('ADJUSTMENT_FAILED', errorMessage, 500);
    }
  }

  /**
   * GET /api/admin/users
   * List users with pagination and optional search
   */
  private async listUsers(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const pageParam = this.getQueryParam(req, 'page') || '1';
    const limitParam = this.getQueryParam(req, 'limit') || '20';
    const search = this.getQueryParam(req, 'search') || '';

    const page = Math.max(1, parseInt(pageParam, 10));
    const limit = Math.max(1, parseInt(limitParam, 10));

    try {
      const result = await adminUsersService.listUsers({ page, limit, search });
      return this.json(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return this.error('FETCH_ERROR', errorMessage, 500);
    }
  }

  /**
   * GET /api/admin/users/[userId]
   * Get detailed user information including subscription and recent transactions
   */
  private async getUserById(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    // Extract userId from path
    const userId = this.extractUserIdFromPath(req);

    try {
      const result = await adminUsersService.getUserById(userId);
      return this.json(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage === 'Invalid user ID format') {
        return this.error('VALIDATION_ERROR', errorMessage, 400);
      }
      if (errorMessage === 'User not found') {
        return this.error('NOT_FOUND', errorMessage, 404);
      }

      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * PATCH /api/admin/users/[userId]
   * Update user profile (role, subscription_tier, subscription_status)
   */
  private async updateUser(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    // Extract userId from path
    const userId = this.extractUserIdFromPath(req);

    const body = await this.getBody<IUpdateProfileRequest>(req);

    try {
      const result = await adminUsersService.updateUser(userId, body);
      return this.json(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (
        errorMessage === 'Invalid user ID format' ||
        errorMessage.includes('Invalid') ||
        errorMessage === 'No valid fields to update'
      ) {
        return this.error('VALIDATION_ERROR', errorMessage, 400);
      }

      return this.error('UPDATE_FAILED', errorMessage, 500);
    }
  }

  /**
   * DELETE /api/admin/users/[userId]
   * Delete a user and all their data
   */
  private async deleteUser(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    // Extract userId from path
    const userId = this.extractUserIdFromPath(req);

    try {
      await adminUsersService.deleteUser(userId);
      return this.json({ message: 'User deleted successfully' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage === 'Invalid user ID format') {
        return this.error('VALIDATION_ERROR', errorMessage, 400);
      }

      return this.error('DELETE_FAILED', errorMessage, 500);
    }
  }

  /**
   * GET /api/admin/subscription
   * Get subscription details from Stripe and database
   */
  private async getSubscription(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const userId = this.getRequiredQueryParam(req, 'userId');

    try {
      const result = await adminSubscriptionService.getSubscription(userId);
      return this.json(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * POST /api/admin/subscription
   * Update or cancel a user's subscription
   */
  private async updateSubscription(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await this.getBody<IUpdateSubscriptionRequest>(req);

    // Validate action
    if (!body.action || (body.action !== 'cancel' && body.action !== 'change')) {
      return this.error('VALIDATION_ERROR', 'action must be "cancel" or "change"', 400);
    }

    // Validate userId
    if (!body.userId || typeof body.userId !== 'string') {
      return this.error('VALIDATION_ERROR', 'userId is required', 400);
    }

    // Validate targetPriceId for change action
    if (body.action === 'change' && !body.targetPriceId) {
      return this.error('VALIDATION_ERROR', 'targetPriceId is required for plan changes', 400);
    }

    try {
      const result = await adminSubscriptionService.updateSubscription({
        userId: body.userId,
        action: body.action,
        targetPriceId: body.targetPriceId,
      });
      return this.json(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('required') || errorMessage.includes('Invalid')) {
        return this.error('VALIDATION_ERROR', errorMessage, 400);
      }

      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * GET /api/admin/failure-metrics
   *
   * Query parameters:
   * - timeWindow: 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d' (default: 'last_24h')
   * - groupBy: 'stage' | 'provider' | 'model' | 'summary' | 'rate_over_time' (default: 'summary')
   * - userId: Optional user ID filter
   * - projectId: Optional project ID filter
   */
  private async getFailureMetrics(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    // Parse query parameters
    const url = new URL(req.url);
    const timeWindow = (url.searchParams.get('timeWindow') as TimeWindow) || 'last_24h';
    const groupBy = (url.searchParams.get('groupBy') as GroupBy) || 'summary';
    const userId = url.searchParams.get('userId') || undefined;
    const projectId = url.searchParams.get('projectId') || undefined;

    try {
      const result = await adminStatsService.getFailureMetrics({
        timeWindow,
        groupBy,
        userId,
        projectId,
      });
      return this.json(result);
    } catch (err) {
      console.error('[FailureMetrics] Error fetching metrics:', err);
      return this.error('INTERNAL_ERROR', 'Failed to fetch failure metrics', 500);
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Extract userId from path
   */
  private extractUserIdFromPath(req: Request): string {
    const path = this.getPath(req);
    const pathParts = path.split('/');
    return pathParts[pathParts.length - 1];
  }
}
