/**
 * Markdown Utilities
 *
 * Shared markdown-to-HTML conversion for use across the codebase.
 * Uses the marked library for Cloudflare Workers compatibility.
 */

import { marked } from 'marked';

/**
 * Convert markdown text to HTML
 *
 * @param markdown - Markdown text to convert
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const result = marked(markdown);
  // Handle both sync and async return types from marked
  return typeof result === 'string' ? result : String(result);
}

/**
 * Convert markdown text to HTML asynchronously
 *
 * Use this when you need guaranteed async behavior (e.g., in environments
 * where marked may return a Promise).
 *
 * @param markdown - Markdown text to convert
 * @returns Promise resolving to HTML string
 */
export async function markdownToHtmlAsync(markdown: string): Promise<string> {
  if (!markdown) return '';

  const result = marked(markdown);
  return typeof result === 'string' ? result : await result;
}
