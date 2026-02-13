/**
 * IntegrationsPrompt Component
 *
 * Info banner shown on integrations page when user skipped the integrations step during onboarding
 * Reminds them to set up integrations to deliver content to their website
 */

import { Plug, Info } from 'lucide-react';

export function IntegrationsPrompt(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/50 bg-amber-500/5 p-6 mb-6">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
        <div className="w-32 h-32 rounded-full bg-amber-500/20 blur-3xl" />
      </div>

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <Info className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Complete your integrations setup</h3>
            <p className="text-sm text-secondary max-w-xl">
              You skipped the integrations step during onboarding. Connect your WordPress site or
              set up webhooks to automatically publish generated content to your website.
            </p>
          </div>

          {/* Secondary CTA info */}
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <Plug className="w-3.5 h-3.5" />
            <span>Integrations let you deliver articles directly to your site</span>
          </div>
        </div>
      </div>
    </div>
  );
}
