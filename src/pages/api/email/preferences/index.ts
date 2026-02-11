import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { updatePreferencesSchema } from '@shared/validation/email.schema';
import { withAuth, withAuthAndBody, jsonResponse } from '../../_utils';

/** GET /api/email/preferences — fetch current email preferences */
export const GET = withAuth(async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return jsonResponse(
    data || {
      marketing_emails: true,
      product_updates: true,
      low_credit_alerts: true,
    }
  );
});

/** PATCH /api/email/preferences — update email preferences */
export const PATCH = withAuthAndBody(updatePreferencesSchema, async (userId, body) => {
  const { data, error } = await supabaseAdmin
    .from('email_preferences')
    .upsert({
      user_id: userId,
      ...body,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return jsonResponse(data);
});
