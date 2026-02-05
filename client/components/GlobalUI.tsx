'use client';

import { AuthErrorHandler } from '@client/components/auth/AuthErrorHandler';
import { AuthenticationModal } from '@client/components/modal/auth/AuthenticationModal';
import { AuthRequiredModal } from '@client/components/modal/auth/AuthRequiredModal';
import { Toast } from '@client/components/common/Toast';

/**
 * Global UI components (modals, toasts, error handlers)
 * Rendered as a single React island in the Astro layout.
 * Replaces ClientProviders for the Astro migration.
 */
export default function GlobalUI(): JSX.Element {
  return (
    <>
      <AuthErrorHandler />
      <AuthenticationModal />
      <AuthRequiredModal />
      <Toast />
    </>
  );
}
