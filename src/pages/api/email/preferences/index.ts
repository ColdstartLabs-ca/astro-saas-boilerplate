import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { getUserIdFromLocals } from '../../_utils';
import type { ILocals } from '../../../../types/api';
import { updatePreferencesSchema } from '@shared/validation/email.schema';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const userId = getUserIdFromLocals(locals as ILocals);

    const { data, error } = await supabaseAdmin
      .from('email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || {
          marketing_emails: true,
          product_updates: true,
          low_credit_alerts: true,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get preferences error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Failed to get preferences' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const userId = getUserIdFromLocals(locals as ILocals);

    const text = await request.text();
    const body = text ? JSON.parse(text) : {};
    const validated = updatePreferencesSchema.safeParse(body);

    if (!validated.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validated.error.flatten(),
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('email_preferences')
      .upsert({
        user_id: userId,
        ...validated.data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update preferences error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update preferences' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
