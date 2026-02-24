/**
 * Client-side navigation for the dashboard.
 * Uses history.pushState instead of full page loads.
 *
 * Locale-aware: when the current URL has a locale prefix (e.g. /pt-BR/dashboard),
 * navigation calls automatically prepend the prefix so the browser URL stays consistent,
 * while the React router always sees unprefixed paths (e.g. /dashboard).
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '@/i18n/config';

const DASHBOARD_NAVIGATE_EVENT = 'dashboard:navigate';

/**
 * Extract a non-default locale prefix from a pathname, if present.
 * Returns the locale string (e.g. 'pt-BR') or null.
 */
export function getLocalePrefix(): Locale | null {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (
    segments.length > 0 &&
    SUPPORTED_LOCALES.includes(segments[0] as Locale) &&
    segments[0] !== DEFAULT_LOCALE
  ) {
    return segments[0] as Locale;
  }
  return null;
}

/**
 * Strip locale prefix from a pathname for React route matching.
 * /pt-BR/dashboard/settings → /dashboard/settings
 * /dashboard/settings → /dashboard/settings (unchanged)
 */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (
    segments.length > 0 &&
    SUPPORTED_LOCALES.includes(segments[0] as Locale) &&
    segments[0] !== DEFAULT_LOCALE
  ) {
    return '/' + segments.slice(1).join('/') || '/';
  }
  return pathname;
}

/**
 * Navigate within the dashboard without a server round-trip.
 * Updates the URL and dispatches an event for the React router to pick up.
 *
 * If the current URL has a locale prefix (e.g. /pt-BR/dashboard),
 * the prefix is automatically prepended to the href so the browser URL
 * stays locale-consistent. The router callback strips it before matching.
 */
export function dashboardNavigate(href: string): void {
  const locale = getLocalePrefix();
  const browserHref = locale ? `/${locale}${href}` : href;

  if (window.location.pathname === browserHref) return;
  history.pushState({}, '', browserHref);
  window.dispatchEvent(new CustomEvent(DASHBOARD_NAVIGATE_EVENT, { detail: { href } }));
}

/**
 * Subscribe to dashboard navigation events (pushState + popstate).
 * Returns an unsubscribe function.
 *
 * The callback receives the pathname with the locale prefix stripped,
 * so the React router always sees /dashboard/... paths.
 */
export function onDashboardNavigate(callback: (pathname: string) => void): () => void {
  const handleCustom = () => callback(stripLocalePrefix(window.location.pathname));
  const handlePop = () => callback(stripLocalePrefix(window.location.pathname));

  window.addEventListener(DASHBOARD_NAVIGATE_EVENT, handleCustom);
  window.addEventListener('popstate', handlePop);

  return () => {
    window.removeEventListener(DASHBOARD_NAVIGATE_EVENT, handleCustom);
    window.removeEventListener('popstate', handlePop);
  };
}
