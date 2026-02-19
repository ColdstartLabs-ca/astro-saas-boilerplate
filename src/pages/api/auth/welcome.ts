/**
 * Welcome Email API Route
 * POST /api/auth/welcome - Send welcome email to newly signed-up user
 *
 * Idempotent: checks email_logs before sending, so safe to call on every sign-in.
 * Only sends the welcome email once per user.
 */

import { withAuth, jsonResponse } from '../_utils';
import { getEmailService } from '@server/services/email.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { serverEnv, clientEnv } from '@shared/config/env';

export const POST = withAuth(async userId => {
  // Check if welcome email was already sent
  const { data: existing } = await supabaseAdmin
    .from('email_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('template_name', 'welcome')
    .eq('status', 'sent')
    .limit(1);

  if (existing && existing.length > 0) {
    return jsonResponse({ sent: false, reason: 'already_sent' });
  }

  // Get user profile for email and name
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, display_name')
    .eq('id', userId)
    .single();

  if (!profile?.email) {
    return jsonResponse({ sent: false, reason: 'no_email' });
  }

  const emailService = getEmailService();
  await emailService.send({
    to: profile.email,
    template: 'welcome',
    type: 'transactional',
    userId,
    data: {
      userName: profile.display_name || undefined,
      baseUrl: clientEnv.BASE_URL,
      supportEmail: serverEnv.SUPPORT_EMAIL || 'support@autopilotrank.com',
    },
  });

  return jsonResponse({ sent: true });
});
