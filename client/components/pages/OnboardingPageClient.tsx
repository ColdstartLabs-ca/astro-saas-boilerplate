/**
 * OnboardingPageClient
 * Dashboard page that renders the onboarding wizard
 * Mounted at /dashboard/onboarding
 */

'use client';

import { useCallback } from 'react';
import { OnboardingWizard } from '@client/components/onboarding/OnboardingWizard';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';

export function OnboardingPageClient(): JSX.Element {
  const handleClose = useCallback(() => {
    dashboardNavigate('/dashboard/campaigns');
  }, []);

  return <OnboardingWizard isOpen={true} onClose={handleClose} />;
}

 
export default OnboardingPageClient;
