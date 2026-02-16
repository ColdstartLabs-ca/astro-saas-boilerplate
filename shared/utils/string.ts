/**
 * String Utilities
 *
 * Common string manipulation functions that work in both client and server environments.
 */

/**
 * Generate a URL-friendly slug from a title or string.
 *
 * Converts the input to lowercase, removes non-word characters (except spaces and hyphens),
 * replaces spaces and underscores with hyphens, and removes leading/trailing hyphens.
 *
 * @param title - The input string to convert to a slug
 * @returns A URL-friendly slug string
 *
 * @example
 * generateSlug('Hello World!') // Returns 'hello-world'
 * generateSlug('My Awesome Blog Post') // Returns 'my-awesome-blog-post'
 * generateSlug('Test___Multiple   Spaces') // Returns 'test-multiple-spaces'
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Calculate reading time from content.
 * Assumes average reading speed of 200 words per minute.
 *
 * @param content - The content text to calculate reading time for
 * @returns A human-readable reading time string (e.g., '5 min read')
 */
export function calculateReadingTime(content: string): string {
  if (!content) return '1 min read';
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the resulting string (including ellipsis)
 * @param ellipsis - The ellipsis string to append (default: '...')
 * @returns The truncated string with ellipsis if it was shortened
 */
export function truncateString(str: string, maxLength: number, ellipsis: string = '...'): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Capitalize the first letter of a string.
 *
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert a string to title case.
 *
 * @param str - The string to convert
 * @returns The string in title case
 */
export function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}
