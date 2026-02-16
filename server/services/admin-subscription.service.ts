/**
 * Admin Subscription Service
 *
 * Handles admin subscription management operations.
 * Extracted from AdminController for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { stripe } from '@server/stripe';
import { getPlanForPriceId } from '@shared/config/stripe';
import dayjs from 'dayjs';

// =============================================================================
// Types
// =============================================================================

export interface IGetSubscriptionResult {
  subscription: Record<string, unknown> | null;
  stripeSubscription: {
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    current_period_end: number | null;
    canceled_at: number | null;
  } | null;
}

export interface IUpdateSubscriptionParams {
  userId: string;
  action: 'cancel' | 'change';
  targetPriceId?: string;
}

export interface IUpdateSubscriptionResult {
  action: string;
  subscriptionId?: string;
  status?: string;
  plan?: string;
  periodEnd?: string | null;
  message?: string;
  note?: string;
}

// =============================================================================
// Admin Subscription Service Class
// =============================================================================

export class AdminSubscriptionService {
  /**
   * Get subscription details from Stripe and database
   */
  async getSubscription(userId: string): Promise<IGetSubscriptionResult> {
    // Get subscription from DB
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return {
        subscription: null,
        stripeSubscription: null,
      };
    }

    // Fetch from Stripe for live data
    let stripeSubscription = null;
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(subscription.id);
    } catch {
      // Subscription may not exist in Stripe anymore
    }

    const stripeSubData = stripeSubscription as unknown as { current_period_end?: number } | null;

    return {
      subscription,
      stripeSubscription: stripeSubscription
        ? {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            current_period_end: stripeSubData?.current_period_end || null,
            canceled_at: stripeSubscription.canceled_at,
          }
        : null,
    };
  }

  /**
   * Update or cancel a user's subscription
   */
  async updateSubscription(params: IUpdateSubscriptionParams): Promise<IUpdateSubscriptionResult> {
    const { userId, action, targetPriceId } = params;

    // Get user's subscription from DB
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, price_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (action === 'cancel') {
      return this.cancelSubscription(userId, subscription);
    }

    if (action === 'change') {
      return this.changeSubscription(userId, subscription, targetPriceId);
    }

    throw new Error('Invalid action');
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  private async cancelSubscription(
    userId: string,
    subscription: Record<string, unknown> | null
  ): Promise<IUpdateSubscriptionResult> {
    if (!subscription) {
      // No subscription - just clear profile
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: null,
          subscription_tier: null,
          updated_at: dayjs().toISOString(),
        })
        .eq('id', userId);

      return {
        action: 'canceled',
        message: 'Profile updated to free tier',
      };
    }

    // Cancel in Stripe
    try {
      await stripe.subscriptions.cancel(subscription.id as string);
    } catch (stripeErr) {
      console.error('Stripe cancel error (may already be canceled):', stripeErr);
    }

    // Update our database
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: dayjs().toISOString(),
        updated_at: dayjs().toISOString(),
      })
      .eq('id', subscription.id);

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: null,
        subscription_tier: null,
        updated_at: dayjs().toISOString(),
      })
      .eq('id', userId);

    return {
      action: 'canceled',
      subscriptionId: subscription.id as string,
    };
  }

  private async changeSubscription(
    userId: string,
    subscription: Record<string, unknown> | null,
    targetPriceId?: string
  ): Promise<IUpdateSubscriptionResult> {
    if (!targetPriceId) {
      throw new Error('targetPriceId is required for plan changes');
    }

    const targetPlan = getPlanForPriceId(targetPriceId);
    if (!targetPlan) {
      throw new Error('Invalid price ID');
    }

    // Check if user has an active subscription in Stripe we can modify
    const activeSubscription =
      subscription && subscription.status !== 'canceled' && subscription.status !== 'incomplete';

    if (activeSubscription) {
      // Update existing subscription in Stripe
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.id as string);
        const updatedSub = await stripe.subscriptions.update(subscription.id as string, {
          items: [{ id: stripeSub.items.data[0]?.id, price: targetPriceId }],
          proration_behavior: 'always_invoice',
        });

        const updatedSubData = updatedSub as unknown as { current_period_end?: number };
        const periodEnd = updatedSubData.current_period_end
          ? dayjs.unix(updatedSubData.current_period_end).toISOString()
          : null;

        // Update database
        await supabaseAdmin
          .from('subscriptions')
          .update({
            price_id: targetPriceId,
            status: updatedSub.status,
            updated_at: dayjs().toISOString(),
          })
          .eq('id', subscription.id);

        // IMPORTANT: Use plan.key (e.g., 'pro') not plan.name (e.g., 'Professional')
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: updatedSub.status,
            subscription_tier: targetPlan.key,
            updated_at: dayjs().toISOString(),
          })
          .eq('id', userId);

        return {
          action: 'changed',
          subscriptionId: subscription.id as string,
          status: updatedSub.status,
          plan: targetPlan.name,
          periodEnd,
        };
      } catch (stripeErr) {
        console.error('Stripe update failed, falling back to profile-only update:', stripeErr);
        // Fall through to profile-only update
      }
    }

    // No active Stripe subscription or Stripe update failed
    // Just update the profile directly (admin override)
    // IMPORTANT: Use plan.key (e.g., 'pro') not plan.name (e.g., 'Professional')
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_tier: targetPlan.key,
        updated_at: dayjs().toISOString(),
      })
      .eq('id', userId);

    return {
      action: 'profile_updated',
      plan: targetPlan.name,
      note: 'Profile updated directly. No Stripe subscription was modified.',
    };
  }
}

// Export singleton instance
export const adminSubscriptionService = new AdminSubscriptionService();
