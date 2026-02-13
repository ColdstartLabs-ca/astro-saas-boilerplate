/**
 * FirstCampaignPrompt Component
 *
 * Info banner shown on campaigns page when user hasn't created their first campaign yet.
 * Guides them to create their first campaign after completing onboarding.
 */

import { ArrowRight, Rocket } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';

interface IFirstCampaignPromptProps {
  onCreateCampaign?: () => void;
}

export function FirstCampaignPrompt({ onCreateCampaign }: IFirstCampaignPromptProps): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-xl border border-accent/50 bg-accent/5 p-6 mb-6 w-full">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
        <div className="w-32 h-32 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30">
            <Rocket className="w-6 h-6 text-accent" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Create your first campaign</h3>
            <p className="text-sm text-secondary max-w-xl">
              Now that you&apos;ve set up your project and keywords, create your first AI-powered
              SEO campaign to start generating content.
            </p>
          </div>

          {onCreateCampaign && (
            <DashboardButton
              size="sm"
              onClick={onCreateCampaign}
              className="inline-flex items-center gap-2 mt-2"
            >
              Create Campaign
              <ArrowRight className="w-4 h-4" />
            </DashboardButton>
          )}
        </div>
      </div>
    </div>
  );
}
