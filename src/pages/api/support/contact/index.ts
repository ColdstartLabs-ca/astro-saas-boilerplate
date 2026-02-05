import type { APIRoute } from 'astro';
import { getEmailService } from '@server/services/email.service';
import { contactFormSchema } from '@shared/validation/support.schema';
import { serverEnv } from '@shared/config/env';
import { createLogger } from '@server/monitoring/logger';

export const POST: APIRoute = async ({ request, locals }) => {
  const logger = createLogger(request, 'support-contact');

  try {
    const body = await request.json();

    // Validate request body
    const validatedData = contactFormSchema.parse(body);

    // Get userId if user is authenticated (from middleware)
    const userId = (locals as { userId?: string }).userId;

    logger.info('Processing support request', {
      category: validatedData.category,
      hasUserId: !!userId,
    });

    const emailService = getEmailService();

    // Send support request email to the support team
    await emailService.send({
      to: serverEnv.SUPPORT_EMAIL,
      template: 'support-request',
      data: {
        name: validatedData.name,
        email: validatedData.email,
        category: validatedData.category,
        subject: validatedData.subject,
        message: validatedData.message,
      },
      type: 'transactional',
      userId: userId || undefined,
    });

    logger.info('Support request sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your support request has been submitted. We will get back to you within 24 hours.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log detailed error info for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Support contact form error', {
      message: errorMessage,
      stack: errorStack,
      supportEmail: serverEnv.SUPPORT_EMAIL ? 'configured' : 'NOT CONFIGURED',
    });

    if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid form data',
          error: 'Validation failed',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to submit support request. Please try again.',
        error: errorMessage,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    await logger.flush();
  }
};
