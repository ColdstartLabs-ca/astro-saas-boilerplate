/**
 * OnboardingStepKeywords Component
 * Step 3 of onboarding: Upload keywords for first campaign
 * Required step - cannot be skipped
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Loader2, FileText, ArrowRight } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { useOnboardingProgress } from '@client/hooks/useOnboardingProgress';
import { OnboardingStep } from '@shared/types/onboarding.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepKeywordsProps {
  /** Callback when step is completed successfully */
  onComplete: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const MIN_KEYWORDS = 1;
const MAX_KEYWORDS = 500;
const MAX_KEYWORD_LENGTH = 200;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse raw text into keywords array
 * Supports comma-separated, newline-separated, or mixed
 */
function parseKeywords(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map(k => k.trim())
    .filter(k => k.length > 0 && k.length <= MAX_KEYWORD_LENGTH);
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepKeywords({
  onComplete,
}: IOnboardingStepKeywordsProps): JSX.Element {
  const [rawInput, setRawInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { projectId, completedSteps, skippedSteps, setKeywordCount, markStepComplete } =
    useOnboardingStore();
  const { createCampaign } = useCampaigns(projectId);
  const { updateProgress, isUpdating } = useOnboardingProgress();

  const parsedKeywords = useMemo(() => parseKeywords(rawInput), [rawInput]);
  const keywordCount = parsedKeywords.length;
  const canSubmit = keywordCount >= MIN_KEYWORDS && keywordCount <= MAX_KEYWORDS && !!projectId;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !projectId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create campaign with the uploaded keywords
      await createCampaign({
        name: 'Onboarding Campaign',
        projectId,
        keywords: parsedKeywords,
      });

      // Update store
      setKeywordCount(keywordCount);
      markStepComplete(OnboardingStep.KEYWORDS_UPLOAD);

      // Persist progress
      const newCompletedSteps = new Set(completedSteps);
      newCompletedSteps.add(OnboardingStep.KEYWORDS_UPLOAD);

      await updateProgress({
        currentStep: OnboardingStep.INTEGRATIONS,
        completedSteps: Array.from(newCompletedSteps),
        skippedSteps: Array.from(skippedSteps),
      });

      onComplete();
    } catch (err) {
      console.error('Failed to create campaign with keywords:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to upload keywords. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    projectId,
    parsedKeywords,
    keywordCount,
    completedSteps,
    skippedSteps,
    createCampaign,
    setKeywordCount,
    markStepComplete,
    updateProgress,
    onComplete,
  ]);

  const isLoading = isSubmitting || isUpdating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
          <FileText className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">Add Your Keywords</h2>
        <p className="text-sm text-secondary mt-2 max-w-md mx-auto">
          Enter the keywords you want to target. We&apos;ll create your first campaign with these
          keywords.
        </p>
      </div>

      {/* Keyword Input */}
      <div className="space-y-2">
        <label htmlFor="keywords-input" className="block text-sm font-medium text-white">
          Keywords <span className="text-red-400">*</span>
        </label>
        <textarea
          id="keywords-input"
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder={`Enter keywords separated by commas or new lines:\n\nseo tips\ncontent marketing\nblog writing strategies`}
          rows={8}
          className={`w-full bg-main border rounded-lg px-4 py-3 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all resize-none font-mono text-sm ${
            error ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
          }`}
          disabled={isLoading}
          autoFocus
        />

        {/* Keyword Count */}
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              keywordCount > MAX_KEYWORDS
                ? 'text-red-400'
                : keywordCount > 0
                  ? 'text-emerald-400'
                  : 'text-muted'
            }
          >
            {keywordCount} keyword{keywordCount !== 1 ? 's' : ''} detected
          </span>
          <span className="text-muted">
            {MIN_KEYWORDS}-{MAX_KEYWORDS} keywords allowed
          </span>
        </div>

        {keywordCount > MAX_KEYWORDS && (
          <p className="text-red-400 text-xs">
            Too many keywords. Maximum is {MAX_KEYWORDS}.
          </p>
        )}
      </div>

      {/* Keyword Preview */}
      {keywordCount > 0 && keywordCount <= 20 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Preview
          </h4>
          <div className="flex flex-wrap gap-2">
            {parsedKeywords.map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-full border border-accent/20"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {keywordCount > 20 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Preview (first 20)
          </h4>
          <div className="flex flex-wrap gap-2">
            {parsedKeywords.slice(0, 20).map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-full border border-accent/20"
              >
                {keyword}
              </span>
            ))}
            <span className="px-2.5 py-1 text-muted text-xs">
              +{keywordCount - 20} more
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <DashboardButton
          type="button"
          onClick={handleSubmit}
          className="w-full shadow-lg shadow-accent/20"
          disabled={isLoading || !canSubmit}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Campaign...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              Create Campaign & Continue
            </>
          )}
        </DashboardButton>
      </div>

      {/* Help Text */}
      <div className="bg-accent/5 border border-accent/10 rounded-lg p-4">
        <p className="text-xs text-secondary">
          <strong className="text-white">Tip:</strong> You can paste keywords from a spreadsheet or
          CSV file. Each line or comma-separated value will be treated as a separate keyword.
        </p>
      </div>
    </div>
  );
}
