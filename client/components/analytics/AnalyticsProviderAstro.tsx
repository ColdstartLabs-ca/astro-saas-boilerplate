'use client';

import { type ReactNode, useEffect } from 'react';
import { analytics } from '@client/analytics';
import { clientEnv } from '@shared/config/env';

interface IAnalyticsProviderProps {
  children: ReactNode;
}

/**
 * Analytics Provider for Astro
 *
 * Initializes Amplitude analytics for Astro SSR.
 * Uses native browser APIs for URL tracking instead of Next.js hooks.
 *
 * @example
 * ```tsx
 * // In GlobalUI.tsx for Astro
 * <AnalyticsProviderAstro>
 *   {children}
 * </AnalyticsProviderAstro>
 * ```
 */
export function AnalyticsProviderAstro({ children }: IAnalyticsProviderProps): ReactNode {
  const apiKey = clientEnv.AMPLITUDE_API_KEY;

  useEffect(() => {
    // Skip analytics in development or if no API key
    if (!apiKey || clientEnv.ENV === 'development') {
      return;
    }

    // Initialize Amplitude (respects stored consent internally)
    analytics.init(apiKey);

    // Set consent to granted by default (can be changed via consent UI)
    const storedConsent = analytics.getConsent();
    if (storedConsent === 'pending') {
      analytics.setConsent('granted', apiKey);
    }

    // Track initial page view
    analytics.trackPageView(window.location.pathname + window.location.search);

    // Track page views on navigation (for client-side routing)
    const handleRouteChange = () => {
      analytics.trackPageView(window.location.pathname + window.location.search);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);

    // Also listen for custom events from Astro navigation
    window.addEventListener('astro:page-load', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('astro:page-load', handleRouteChange);
    };
  }, [apiKey]);

  return <>{children}</>;
}
