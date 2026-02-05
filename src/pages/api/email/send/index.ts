import type { APIRoute } from 'astro';
import { getEmailService, EmailError } from '@server/services/email.service';
import { sendEmailSchema } from '@shared/validation/email.schema';
import { requireAdmin } from '@server/middleware/requireAdmin';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Only admins can send arbitrary emails
    const adminCheck = await requireAdmin(request);
    if ('error' in adminCheck && adminCheck.error) {
      return adminCheck.error;
    }

    const text = await request.text();
    const body = text ? JSON.parse(text) : {};
    const validated = sendEmailSchema.safeParse(body);

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

    const emailService = getEmailService();
    const result = await emailService.send({
      to: validated.data.to,
      template: validated.data.template,
      data: validated.data.data,
      type: validated.data.type,
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof EmailError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: error.code, message: error.message } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'SEND_FAILED', message: 'Failed to send email' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
