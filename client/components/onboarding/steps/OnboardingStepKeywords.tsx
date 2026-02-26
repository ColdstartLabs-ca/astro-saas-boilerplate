/**
 * OnboardingStepKeywords Component
 * Step 3 of onboarding: Upload keywords for first campaign
 * Required step - cannot be skipped
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef, type DragEvent } from 'react';
import Papa from 'papaparse';
import { Loader2, ArrowRight } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useProjectStore } from '@client/store/projectStore';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { apiFetch } from '@client/utils/api-client';
import type { IOnboardingKeywordSuggestionsResponse } from '@shared/types/onboarding.types';

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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CSV_HEADER_TOKENS = new Set([
  'keyword',
  'keywords',
  'query',
  'queries',
  'topic',
  'topics',
  'term',
  'terms',
]);

interface IKeywordSuggestionResponse {
  data: IOnboardingKeywordSuggestionsResponse;
}

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

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(keyword);
  }

  return deduped;
}

function isLikelyHeaderRow(row: string[]): boolean {
  return row.some(cell => CSV_HEADER_TOKENS.has(cell.toLowerCase().trim()));
}

function parseKeywordsFromCsv(csvText: string): string[] {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  const rows = (parsed.data ?? []).map(row =>
    (Array.isArray(row) ? row : [String(row ?? '')]).map(cell => String(cell ?? '').trim())
  );

  if (rows.length === 0) return [];

  const dataRows = isLikelyHeaderRow(rows[0]) ? rows.slice(1) : rows;
  const keywordCandidates: string[] = [];

  for (const row of dataRows) {
    for (const cell of row) {
      if (!cell) continue;
      keywordCandidates.push(cell);
    }
  }

  return dedupeKeywords(parseKeywords(keywordCandidates.join('\n')));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepKeywords({ onComplete }: IOnboardingStepKeywordsProps): JSX.Element {
  const [rawInput, setRawInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [isInitialSuggestionsReady, setIsInitialSuggestionsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rawInputRef = useRef('');
  const autoSuggestProjectRef = useRef<string | null>(null);
  const dragDepthRef = useRef(0);

  const { projectId: onboardingProjectId, setCampaignId, setKeywordCount } = useOnboardingStore();
  const { activeProjectId } = useProjectStore();
  const projectId = onboardingProjectId || activeProjectId;
  const canSuggestFromGsc = !!projectId && UUID_PATTERN.test(projectId);
  const { createCampaign } = useCampaigns(projectId);

  const parsedKeywords = useMemo(() => parseKeywords(rawInput), [rawInput]);
  const keywordCount = parsedKeywords.length;
  const canSubmit = keywordCount >= MIN_KEYWORDS && keywordCount <= MAX_KEYWORDS && !!projectId;
  const isEditorVisible = !(isInputLocked && keywordCount > 0);
  const isInputDisabled =
    isSubmitting || isSuggesting || isParsingCsv || (isInputLocked && keywordCount > 0);

  useEffect(() => {
    rawInputRef.current = rawInput;
  }, [rawInput]);

  const fetchSuggestedKeywords = useCallback(
    async ({
      lockAfterLoad,
      forceReplace,
      onSettled,
    }: {
      lockAfterLoad: boolean;
      forceReplace: boolean;
      onSettled?: () => void;
    }) => {
      if (!projectId || !canSuggestFromGsc) return;

      setIsSuggesting(true);
      setError(null);

      try {
        const response = await apiFetch<IKeywordSuggestionResponse>(
          `/api/onboarding/keywords/suggestions?projectId=${projectId}`,
          { method: 'GET' }
        );

        const suggestions = dedupeKeywords(parseKeywords(response.data.keywords.join('\n')));
        const shouldReplace = forceReplace || !rawInputRef.current.trim();

        if (suggestions.length > 0 && shouldReplace) {
          setRawInput(suggestions.join('\n'));
          setIsInputLocked(lockAfterLoad);
          setStatusMessage(
            response.data.source === 'openrouter_gsc'
              ? 'Keywords auto-suggested from your GSC data with AI.'
              : response.data.source === 'openrouter_metadata'
                ? 'Keywords auto-suggested from your website URL and metadata with AI.'
                : response.data.source === 'metadata_fallback'
                  ? 'Loaded keyword ideas from your website URL and metadata.'
                  : 'Loaded top keyword ideas from your GSC data.'
          );
        } else if (suggestions.length > 0) {
          setStatusMessage(
            'New suggestions are available. Click "Refresh Suggestions" to replace your current list.'
          );
        } else {
          setIsInputLocked(false);
          setStatusMessage(
            response.data.reason === 'no_gsc_connection'
              ? 'No GSC connection found. You can add keywords manually or upload a CSV.'
              : response.data.reason === 'no_selected_site'
                ? 'Select a GSC site to enable automatic keyword suggestions.'
                : 'No GSC query data found yet. Add keywords manually or upload a CSV.'
          );
        }
      } catch (err) {
        console.error('Failed to fetch onboarding keyword suggestions:', err);
        setIsInputLocked(false);
        setStatusMessage(
          'Could not auto-suggest keywords right now. You can still continue manually.'
        );
      } finally {
        setIsSuggesting(false);
        onSettled?.();
      }
    },
    [projectId, canSuggestFromGsc]
  );

  useEffect(() => {
    if (!projectId || !canSuggestFromGsc) {
      setIsInitialSuggestionsReady(true);
      return;
    }
    if (autoSuggestProjectRef.current === projectId) {
      setIsInitialSuggestionsReady(true);
      return;
    }

    setIsInitialSuggestionsReady(false);
    autoSuggestProjectRef.current = projectId;
    void fetchSuggestedKeywords({
      lockAfterLoad: true,
      forceReplace: false,
      onSettled: () => setIsInitialSuggestionsReady(true),
    });
  }, [projectId, canSuggestFromGsc, fetchSuggestedKeywords]);

  const handleCsvFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    setIsParsingCsv(true);
    setError(null);

    try {
      const csvText = await readFileAsText(file);
      const csvKeywords = parseKeywordsFromCsv(csvText);

      if (csvKeywords.length === 0) {
        setError('No keywords found in this CSV file.');
        return;
      }

      setRawInput(csvKeywords.join('\n'));
      setIsInputLocked(false);
      setStatusMessage(`Parsed ${csvKeywords.length} keywords from ${file.name}.`);
    } catch (err) {
      console.error('Failed to parse CSV file:', err);
      setError('Failed to parse CSV file. Please check the format and try again.');
    } finally {
      setIsParsingCsv(false);
    }
  }, []);

  const handleDropCsv = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsCsvDragging(false);

      if (isSubmitting || isParsingCsv) return;

      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleCsvFile(file);
      }
    },
    [handleCsvFile, isSubmitting, isParsingCsv]
  );

  useEffect(() => {
    if (!isEditorVisible) return;

    const isFileDragEvent = (event: Event): event is globalThis.DragEvent => {
      const dragEvent = event as globalThis.DragEvent;
      const types = dragEvent.dataTransfer?.types;
      return !!types && Array.from(types).includes('Files');
    };

    const handleDragEnter = (event: Event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsCsvDragging(true);
    };

    const handleDragOver = (event: Event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      setIsCsvDragging(true);
    };

    const handleDragLeave = (event: Event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsCsvDragging(false);
      }
    };

    const handleDrop = (event: Event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsCsvDragging(false);
      if (isSubmitting || isParsingCsv) return;

      const file = event.dataTransfer?.files?.[0];
      if (file) {
        void handleCsvFile(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      dragDepthRef.current = 0;
      setIsCsvDragging(false);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isEditorVisible, isSubmitting, isParsingCsv, handleCsvFile]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !projectId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create campaign with the uploaded keywords
      const campaign = await createCampaign({
        name: 'Onboarding Campaign',
        projectId,
        keywords: parsedKeywords,
      });

      setCampaignId(campaign.id);
      setKeywordCount(keywordCount);
      onComplete();
    } catch (err) {
      console.error('Failed to create campaign with keywords:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload keywords. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    projectId,
    parsedKeywords,
    keywordCount,
    createCampaign,
    setCampaignId,
    setKeywordCount,
    onComplete,
  ]);

  const isLoading = isSubmitting || isParsingCsv;

  if (canSuggestFromGsc && !isInitialSuggestionsReady) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="w-7 h-7 animate-spin text-accent" />
        <p className="text-sm text-secondary">
          Preparing keyword suggestions from your GSC data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <p className="text-xs text-secondary">
          {statusMessage ??
            'We automatically suggest keywords from your GSC data. You can edit them before creating your campaign.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void fetchSuggestedKeywords({ lockAfterLoad: false, forceReplace: true })
            }
            disabled={isSuggesting || !canSuggestFromGsc || isSubmitting || isParsingCsv}
            className="px-3 py-1.5 text-xs rounded-md border border-border text-secondary hover:text-white hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSuggesting ? 'Loading Suggestions...' : 'Refresh Suggestions'}
          </button>
          {isInputLocked && keywordCount > 0 && (
            <button
              type="button"
              onClick={() => setIsInputLocked(false)}
              disabled={isSubmitting || isParsingCsv}
              className="px-3 py-1.5 text-xs rounded-md border border-accent/40 text-accent hover:text-accent-hover hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Customize Keywords
            </button>
          )}
        </div>
      </div>

      {/* Keyword Input */}
      {isEditorVisible && (
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
            disabled={isInputDisabled}
            autoFocus
          />

          <div className="space-y-2">
            <input
              id="keywords-csv-upload"
              type="file"
              accept=".csv,text/csv"
              disabled={isSubmitting || isParsingCsv}
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleCsvFile(file);
                }
              }}
              className="sr-only"
            />
            <label
              htmlFor="keywords-csv-upload"
              className={`inline-flex items-center px-3 py-1.5 text-xs rounded-md border transition-colors ${
                isSubmitting || isParsingCsv
                  ? 'border-border text-muted opacity-50 cursor-not-allowed'
                  : 'border-border text-secondary hover:text-white hover:border-accent/40 cursor-pointer'
              }`}
            >
              {isParsingCsv ? 'Parsing CSV...' : 'Upload CSV'}
            </label>
            <p className="text-xs text-muted">
              Drag a CSV file onto this step to import instantly.
            </p>
          </div>

          {isCsvDragging && (
            <div
              onDragOver={event => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onDrop={handleDropCsv}
              className="border-2 border-dashed border-accent rounded-lg px-4 py-5 text-center text-xs text-accent bg-accent/5"
            >
              Drop CSV to import keywords
            </div>
          )}

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
            <p className="text-red-400 text-xs">Too many keywords. Maximum is {MAX_KEYWORDS}.</p>
          )}
        </div>
      )}

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
            <span className="px-2.5 py-1 text-muted text-xs">+{keywordCount - 20} more</span>
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
          <strong className="text-white">Tip:</strong> Start with auto-suggested keywords from your
          GSC data, then fine-tune them manually or import a CSV with drag and drop.
        </p>
      </div>
    </div>
  );
}
