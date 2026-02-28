'use client';

import { useState } from 'react';
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, ExternalLink, Lightbulb } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useTranslations } from '@client/hooks/useTranslations';
import type { IAddKeywordsResponse } from '@shared/types/campaign.types';

type InputTab = 'manual' | 'file';
type ModalView = 'input' | 'result';

interface IAddKeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (keywords: string[]) => Promise<IAddKeywordsResponse>;
}

/**
 * Modal for adding new keywords to a campaign.
 * Users can enter keywords manually (one per line) or upload a CSV/Excel file.
 * After submission shows a result view with coverage info, warnings, and GSC suggestions.
 *
 * @example
 * ```tsx
 * <AddKeywordsModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onAdd={handleAddKeywords}
 * />
 * ```
 */
export function AddKeywordsModal({
  isOpen,
  onClose,
  onAdd,
}: IAddKeywordsModalProps): JSX.Element | null {
  const t = useTranslations('dashboard');
  const [view, setView] = useState<ModalView>('input');
  const [addResult, setAddResult] = useState<IAddKeywordsResponse | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [newKeywords, setNewKeywords] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputTab, setInputTab] = useState<InputTab>('manual');
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const resetToInput = () => {
    setView('input');
    setAddResult(null);
    setNewKeywords('');
    setFileName(null);
    setInputTab('manual');
    setSelectedSuggestions(new Set());
  };

  const handleClose = () => {
    resetToInput();
    onClose();
  };

  const handleAdd = async (keywords: string[]) => {
    if (keywords.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await onAdd(keywords);
      setAddResult(result);
      setSelectedSuggestions(new Set(result.suggestedKeywords ?? []));
      setView('result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInput = async () => {
    const parsed = newKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    await handleAdd(parsed);
  };

  const handleAddSelected = async () => {
    const selected = Array.from(selectedSuggestions);
    if (selected.length === 0) return;
    await handleAdd(selected);
  };

  const toggleSuggestion = (keyword: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  };

  /**
   * Extract keywords from parsed data (CSV or Excel)
   * Auto-detects the keyword column by looking for "keyword" header
   * Falls back to first column if not found
   */
  const extractKeywords = (data: unknown[]): string[] => {
    if (data.length === 0) return [];

    // Check if first row is a header (contains "keyword" key)
    const firstRow = data[0];
    const hasKeywordHeader =
      typeof firstRow === 'object' && firstRow !== null && 'keyword' in firstRow;

    if (hasKeywordHeader) {
      // Extract from "keyword" column, skip header row
      return data
        .slice(1)
        .map((row: unknown) => {
          if (typeof row === 'object' && row !== null && 'keyword' in row) {
            return String((row as { keyword: unknown }).keyword).trim();
          }
          return '';
        })
        .filter(k => k.length > 0 && k.length <= 200);
    }

    // No keyword header found - try to extract from first column
    return data
      .map((row: unknown) => {
        if (typeof row === 'object' && row !== null) {
          const values = Object.values(row);
          if (values.length > 0 && values[0] !== undefined && values[0] !== null) {
            const val = String(values[0]).trim();
            // Skip if it looks like a header (contains "keyword")
            if (val.toLowerCase() === 'keyword') {
              return '';
            }
            return val;
          }
        }
        return '';
      })
      .filter(k => k.length > 0 && k.length <= 200);
  };

  /**
   * Handle CSV file upload
   */
  const handleCsvUpload = (file: File) => {
    setIsParsing(true);
    setFileName(file.name);

    Papa.parse(file, {
      complete: results => {
        try {
          const keywords = extractKeywords(results.data as unknown[]);
          setNewKeywords(keywords.join('\n'));
        } catch {
          // Silently fail on parse error
        } finally {
          setIsParsing(false);
        }
      },
      error: () => {
        setIsParsing(false);
      },
    });
  };

  /**
   * Handle Excel file upload (.xlsx, .xls)
   */
  const handleExcelUpload = (file: File) => {
    setIsParsing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          const keywords = extractKeywords(jsonData);
          setNewKeywords(keywords.join('\n'));
        }
      } catch {
        // Silently fail on parse error
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  /**
   * Handle file selection from input or drag & drop
   */
  const handleFileSelect = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      handleCsvUpload(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      handleExcelUpload(file);
    }
  };

  /**
   * Parse keywords from textarea (one per line)
   */
  const parsedKeywords = newKeywords
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  if (!isOpen) return null;

  const coveredCount = addResult?.alreadyCovered?.length ?? 0;
  const warningCount = addResult?.cannibalizationWarnings?.length ?? 0;
  const suggestionCount = addResult?.suggestedKeywords?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-bold text-white">{t('campaigns.keywords.title')}</h3>
          <button onClick={handleClose} className="text-muted hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Input view */}
        {view === 'input' && (
          <>
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Tab Navigation */}
              <div className="flex border-b border-border mb-4">
                <button
                  type="button"
                  onClick={() => setInputTab('manual')}
                  className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                    inputTab === 'manual'
                      ? 'text-accent-hover border-accent font-medium'
                      : 'text-muted hover:text-secondary border-transparent'
                  }`}
                >
                  {t('campaigns.keywords.manual')}
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('file')}
                  className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                    inputTab === 'file'
                      ? 'text-accent-hover border-accent font-medium'
                      : 'text-muted hover:text-secondary border-transparent'
                  }`}
                >
                  {t('campaigns.keywords.fileUpload')}
                </button>
              </div>

              {/* Manual Input */}
              {inputTab === 'manual' && (
                <textarea
                  value={newKeywords}
                  onChange={e => setNewKeywords(e.target.value)}
                  placeholder={t('campaigns.keywords.placeholder')}
                  className="w-full h-32 bg-main border border-border rounded-lg p-4 text-white focus:ring-1 focus:ring-accent outline-none resize-none font-mono text-sm"
                />
              )}

              {/* File Upload */}
              {inputTab === 'file' && (
                <div className="space-y-4">
                  {fileName && newKeywords.trim().length > 0 ? (
                    <div className="bg-main border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-secondary">{fileName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewKeywords('');
                            setFileName(null);
                          }}
                          className="text-xs text-muted hover:text-accent-hover"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-xs text-muted">
                        {t('campaigns.keywords.parsedCount', { count: parsedKeywords.length })}
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                        disabled={isParsing}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div
                        className={`flex items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer bg-surface/50 ${
                          isParsing ? 'border-muted opacity-50' : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
                          <span className="text-sm text-secondary block">
                            {isParsing
                              ? t('campaigns.keywords.parsing')
                              : t('campaigns.keywords.csvDrop')}
                          </span>
                          <span className="text-xs text-muted block mt-1">
                            {t('campaigns.keywords.acceptedFormats')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-2 flex-shrink-0">
              <DashboardButton variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                {t('campaigns.keywords.cancel')}
              </DashboardButton>
              <DashboardButton
                onClick={handleSubmitInput}
                disabled={isSubmitting || isParsing || !newKeywords.trim()}
              >
                {isSubmitting ? 'Adding...' : t('campaigns.keywords.add')}
              </DashboardButton>
            </div>
          </>
        )}

        {/* Result view */}
        {view === 'result' && addResult && (
          <>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto" data-testid="add-keywords-result">
              {/* Summary */}
              <div className="space-y-2" data-testid="result-summary">
                {addResult.added > 0 && (
                  <div className="flex items-center gap-2 text-success" data-testid="added-count">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {addResult.added} keyword{addResult.added !== 1 ? 's' : ''} added
                    </span>
                  </div>
                )}
                {coveredCount > 0 && (
                  <div className="flex items-center gap-2 text-warning" data-testid="covered-count">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {coveredCount} keyword{coveredCount !== 1 ? 's' : ''} already covered by your
                      content
                    </span>
                  </div>
                )}
                {addResult.duplicates > 0 && (
                  <div className="text-sm text-muted" data-testid="duplicates-count">
                    {addResult.duplicates} duplicate{addResult.duplicates !== 1 ? 's' : ''} skipped
                  </div>
                )}
                {addResult.added === 0 && coveredCount === 0 && addResult.duplicates === 0 && (
                  <p className="text-sm text-muted">No keywords were processed.</p>
                )}
              </div>

              {/* Already covered list */}
              {coveredCount > 0 && (
                <div
                  className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3"
                  data-testid="already-covered-section"
                >
                  <p className="text-xs font-semibold text-warning uppercase tracking-wide">
                    Already Covered by Your Content
                  </p>
                  <ul className="space-y-3">
                    {addResult.alreadyCovered!.map(item => (
                      <li key={item.keyword} className="space-y-1">
                        <p className="text-sm font-medium text-secondary">{item.keyword}</p>
                        <a
                          href={item.coveredByUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted hover:text-accent-hover"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {item.coveredByTitle ?? item.coveredByUrl}
                          </span>
                        </a>
                        {item.reason && (
                          <p className="text-xs text-muted italic">{item.reason}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cross-campaign warnings */}
              {warningCount > 0 && (
                <div
                  className="rounded-lg border border-warning/20 bg-warning/5 p-4 space-y-3"
                  data-testid="cannibalization-warnings-section"
                >
                  <p className="text-xs font-semibold text-warning uppercase tracking-wide">
                    Cross-Campaign Overlap ({warningCount})
                  </p>
                  <ul className="space-y-2">
                    {addResult.cannibalizationWarnings!.map((w, i) => (
                      <li key={i} className="text-sm text-secondary">
                        <span className="font-medium">{w.newKeyword}</span>
                        <span className="text-muted mx-1">↔</span>
                        <span className="font-medium">{w.existingKeyword}</span>
                        <span className="text-muted text-xs ml-2">
                          ({w.existingCampaignName} — {w.similarityPercent}% match)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* GSC suggestions */}
              {suggestionCount > 0 && (
                <div
                  className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3"
                  data-testid="gsc-suggestions-section"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-accent flex-shrink-0" />
                    <p className="text-xs font-semibold text-accent uppercase tracking-wide">
                      Suggested Alternatives from Search Console
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {addResult.suggestedKeywords!.map(kw => (
                      <li key={kw} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`suggestion-${kw}`}
                          checked={selectedSuggestions.has(kw)}
                          onChange={() => toggleSuggestion(kw)}
                          className="rounded border-border accent-accent flex-shrink-0"
                        />
                        <label
                          htmlFor={`suggestion-${kw}`}
                          className="text-sm text-secondary cursor-pointer"
                        >
                          {kw}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Result actions */}
            <div className="p-6 border-t border-border flex justify-end gap-2 flex-shrink-0">
              <DashboardButton variant="ghost" onClick={resetToInput} disabled={isSubmitting}>
                Add More
              </DashboardButton>
              {suggestionCount > 0 ? (
                <>
                  <DashboardButton
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Done
                  </DashboardButton>
                  <DashboardButton
                    onClick={handleAddSelected}
                    disabled={isSubmitting || selectedSuggestions.size === 0}
                    data-testid="add-selected-button"
                  >
                    {isSubmitting
                      ? 'Adding...'
                      : `Add Selected (${selectedSuggestions.size})`}
                  </DashboardButton>
                </>
              ) : (
                <DashboardButton onClick={handleClose}>Done</DashboardButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
