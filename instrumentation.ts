/**
 * Next.js Instrumentation
 *
 * This file runs when the Next.js server starts. Used here to import reflect-metadata
 * which is required by tsyringe for dependency injection.
 *
 * NOTE: This file is no longer used in Astro migration and can be removed.
 */
 
/* eslint-disable no-restricted-syntax */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import reflect-metadata for tsyringe DI on server-side
    await import('reflect-metadata');
  }
}
