import type { APIRoute } from 'astro';
import { getAuthenticatedUser } from '@server/middleware/getAuthenticatedUser';

/**
 * Example Protected API Route
 *
 * This route demonstrates how to use the middleware authentication system.
 * The middleware.ts file automatically:
 * 1. Verifies the JWT from the Authorization header
 * 2. Applies rate limiting (50 requests per 10 seconds)
 * 3. Sets userId in locals for downstream handlers
 *
 * If the request reaches this handler, authentication has already succeeded.
 */

export const GET: APIRoute = async ({ request, locals }) => {
  // Extract user information from middleware locals
  const userId = (locals as { userId?: string }).userId;
  const userEmail = (locals as { userEmail?: string }).userEmail;

  // Optional: Fetch full user profile from database
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return new Response(
      JSON.stringify({
        error: 'User not found',
        message: 'Authenticated but user profile not found in database',
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Return protected data
  return new Response(
    JSON.stringify({
      message: 'Successfully accessed protected route',
      user: {
        id: userId,
        email: userEmail,
        profile: user,
      },
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

/**
 * Example POST endpoint
 * Demonstrates creating resources for authenticated users
 */
export const POST: APIRoute = async ({ request }) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body
  const text = await request.text();
  const body = text ? JSON.parse(text) : {};

  // TODO: Add your business logic here

  return new Response(
    JSON.stringify({
      message: 'Resource created successfully',
      userId: user.id,
      data: body,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

/**
 * Example PATCH endpoint
 * Demonstrates updating resources for authenticated users
 */
export const PATCH: APIRoute = async ({ request }) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const text = await request.text();
  const body = text ? JSON.parse(text) : {};

  // TODO: Add your business logic here

  return new Response(
    JSON.stringify({
      message: 'Resource updated successfully',
      userId: user.id,
      data: body,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

/**
 * Example DELETE endpoint
 * Demonstrates deleting resources for authenticated users
 */
export const DELETE: APIRoute = async ({ request }) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // TODO: Add your business logic here

  return new Response(
    JSON.stringify({
      message: 'Resource deleted successfully',
      userId: user.id,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
