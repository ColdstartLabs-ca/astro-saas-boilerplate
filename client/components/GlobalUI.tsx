'use client';

import React from 'react';
import { AuthErrorHandler } from '@client/components/auth/AuthErrorHandler';
import { AuthenticationModal } from '@client/components/modal/auth/AuthenticationModal';
import { AuthRequiredModal } from '@client/components/modal/auth/AuthRequiredModal';
import { Toast } from '@client/components/common/Toast';
import { LoadingBackdrop } from '@client/components/common/LoadingBackdrop';
import { AnalyticsProviderAstro } from '@client/components/analytics/AnalyticsProviderAstro';
import { BaselimeProvider } from '@client/components/monitoring/BaselimeProvider';

/**
 * Global UI components (modals, toasts, error handlers, analytics, monitoring)
 * Rendered as a single React island in the Astro layout.
 * Replaces ClientProviders for the Astro migration.
 */
export default function GlobalUI(): React.ReactElement {
  return (
    <AnalyticsProviderAstro>
      <BaselimeProvider>
        <AuthErrorHandler />
        <AuthenticationModal />
        <AuthRequiredModal />
        <Toast />
        <LoadingBackdrop />
      </BaselimeProvider>
    </AnalyticsProviderAstro>
  );
}
