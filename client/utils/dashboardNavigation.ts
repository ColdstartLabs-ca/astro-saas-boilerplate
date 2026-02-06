/**
 * Client-side navigation for the dashboard.
 * Uses history.pushState instead of full page loads.
 */

const DASHBOARD_NAVIGATE_EVENT = 'dashboard:navigate';

/**
 * Navigate within the dashboard without a server round-trip.
 * Updates the URL and dispatches an event for the React router to pick up.
 */
export function dashboardNavigate(href: string): void {
  if (window.location.pathname === href) return;
  history.pushState({}, '', href);
  window.dispatchEvent(new CustomEvent(DASHBOARD_NAVIGATE_EVENT, { detail: { href } }));
}

/**
 * Subscribe to dashboard navigation events (pushState + popstate).
 * Returns an unsubscribe function.
 */
export function onDashboardNavigate(callback: (pathname: string) => void): () => void {
  const handleCustom = () => callback(window.location.pathname);
  const handlePop = () => callback(window.location.pathname);

  window.addEventListener(DASHBOARD_NAVIGATE_EVENT, handleCustom);
  window.addEventListener('popstate', handlePop);

  return () => {
    window.removeEventListener(DASHBOARD_NAVIGATE_EVENT, handleCustom);
    window.removeEventListener('popstate', handlePop);
  };
}
