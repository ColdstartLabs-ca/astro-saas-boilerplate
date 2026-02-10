/**
 * Time-based utility functions for the client-side application.
 */

/**
 * Returns a greeting based on the current time of day.
 * - "Good morning" for hours 0-11
 * - "Good afternoon" for hours 12-17
 * - "Good evening" for hours 18-23
 *
 * @returns A greeting string
 *
 * @example
 * ```ts
 * const greeting = getGreeting(); // "Good morning", "Good afternoon", or "Good evening"
 * ```
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
