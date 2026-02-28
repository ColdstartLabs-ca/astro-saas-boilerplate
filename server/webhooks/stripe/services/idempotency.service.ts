import type { IIdempotencyResult } from '@shared/types/stripe.types';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

export class IdempotencyService {
  /**
   * Atomically claim a webhook event for processing.
   *
   * BUG C3 FIX: The previous SELECT-then-INSERT pattern had a TOCTOU race where
   * two concurrent deliveries of the same event could both pass the SELECT (seeing
   * no existing row) and both proceed to INSERT, resulting in double processing.
   *
   * Fix: A single INSERT ... ON CONFLICT (event_id) DO NOTHING is atomic at the
   * database level. Exactly one caller will observe a returned row; any concurrent
   * caller will receive no rows and immediately returns alreadyProcessed=true.
   */
  static async checkAndClaimEvent(
    eventId: string,
    eventType: string,
    payload: unknown
  ): Promise<IIdempotencyResult> {
    // Attempt an atomic INSERT. If event_id already exists the unique constraint
    // suppresses the insert (DO NOTHING) and no row is returned.
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        status: 'processing',
        payload: payload as Record<string, unknown>,
      })
      .select('status')
      .maybeSingle();

    if (error) {
      // Unique constraint violation — Supabase/PostgREST may surface this as a 409
      // or as error code 23505 even when ON CONFLICT DO NOTHING is used on some
      // driver versions. Treat it as "already claimed".
      if (error.code === '23505') {
        console.log(`Webhook event ${eventId} claimed by concurrent request`);
        return { isNew: false, existingStatus: 'processing' };
      }
      throw error;
    }

    if (!data) {
      // ON CONFLICT DO NOTHING — the row already existed; event already claimed.
      console.log(`Webhook event ${eventId} already exists, skipping`);
      return { isNew: false, existingStatus: 'processing' };
    }

    console.log(`Webhook event ${eventId} claimed for processing`);
    return { isNew: true };
  }

  /**
   * Mark webhook event as completed
   * CRITICAL-3 FIX: Throws on error to trigger Stripe retry if DB update fails
   */
  static async markEventCompleted(eventId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    if (error) {
      console.error(`Failed to mark event ${eventId} as completed:`, error);
      // Throw to trigger 500 response - Stripe will retry the webhook
      // This prevents orphaned events stuck in 'processing' status
      throw new Error(`Database error marking event completed: ${error.message}`);
    }
  }

  /**
   * Mark webhook event as failed
   */
  static async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    if (error) {
      console.error(`Failed to mark event ${eventId} as failed:`, error);
    }
  }

  /**
   * Mark webhook event as unrecoverable (unhandled event type)
   */
  static async markEventUnrecoverable(eventId: string, eventType: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'unrecoverable',
        error_message: `Unhandled event type: ${eventType}`,
        completed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    if (error) {
      console.error(`Failed to mark event ${eventId} as unrecoverable:`, error);
    }
  }
}
