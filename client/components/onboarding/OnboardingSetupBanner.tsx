'use client';

import { AlertTriangle } from 'lucide-react';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';

export function OnboardingSetupBanner(): JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-warning/10 border-b border-warning/30 text-sm">
      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
      <span className="text-warning/90 flex-1">Your workspace isn&apos;t fully set up yet.</span>
      <button
        type="button"
        onClick={() => dashboardNavigate('/dashboard/onboarding')}
        className="text-warning font-semibold hover:text-warning/80 transition-colors whitespace-nowrap underline underline-offset-2"
      >
        Complete setup →
      </button>
    </div>
  );
}
