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
    console.log('[welcome-email] skipped: already_sent', { userId });
    return jsonResponse({ sent: false, reason: 'already_sent' });
  }

  // Get user profile for display name, then fall back to auth.users for email
  // (OAuth profiles are created by trigger with only id+credits — email lives in auth.users)
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    supabaseAdmin.from('profiles').select('email, display_name').eq('id', userId).single(),
    supabaseAdmin.auth.admin.getUserById(userId),
  ]);

  const email = profile?.email || authUser.user?.email;
  if (!email) {
    console.warn('[welcome-email] skipped: no email found', { userId });
    return jsonResponse({ sent: false, reason: 'no_email' });
  }

  console.log('[welcome-email] sending', { userId, to: email });
  const emailService = getEmailService();
  await emailService.send({
    to: email,
    template: 'welcome',
    type: 'transactional',
    userId,
    data: {
      userName: profile?.display_name || undefined,
      baseUrl: clientEnv.BASE_URL,
      supportEmail: serverEnv.SUPPORT_EMAIL || 'support@example.com',
    },
  });

  console.log('[welcome-email] done', { userId, to: email });
  return jsonResponse({ sent: true });
});
