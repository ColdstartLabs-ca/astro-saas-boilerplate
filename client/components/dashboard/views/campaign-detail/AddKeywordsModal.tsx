'use client';

import { useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useTranslations } from '@client/hooks/useTranslations';

type InputTab = 'manual' | 'file';

interface IAddKeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (keywords: string[]) => void | Promise<void>;
}

/**
 * Modal for adding new keywords to a campaign.
 * Users can enter keywords manually (one per line) or upload a CSV/Excel file.
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
  const [newKeywords, setNewKeywords] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputTab, setInputTab] = useState<InputTab>('manual');
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleAdd = async () => {
    const parsed = newKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (parsed.length === 0) return;

    setIsSubmitting(true);
    try {
      await onAdd(parsed);
      setNewKeywords('');
      setFileName(null);
      setInputTab('manual');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-bold text-white">{t('campaigns.keywords.title')}</h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
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
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <DashboardButton variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('campaigns.keywords.cancel')}
          </DashboardButton>
          <DashboardButton
            onClick={handleAdd}
            disabled={isSubmitting || isParsing || !newKeywords.trim()}
          >
            {isSubmitting ? 'Adding...' : t('campaigns.keywords.add')}
          </DashboardButton>
        </div>
      </div>
    </div>
  );
}
