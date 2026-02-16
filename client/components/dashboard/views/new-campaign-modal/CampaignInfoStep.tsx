/**
 * Campaign Info Step (Step 1 of NewCampaignModal)
 * Handles campaign name and keywords input
 */
'use client';

import { useTranslations } from '@client/hooks/useTranslations';
import { Upload, Zap } from 'lucide-react';
import type { UseFormRegister, UseFormSetValue, FieldErrors, UseFormWatch } from 'react-hook-form';
import type { CampaignFormData } from './validationSchema';

interface ICampaignInfoStepProps {
  register: UseFormRegister<CampaignFormData>;
  setValue: UseFormSetValue<CampaignFormData>;
  watch: UseFormWatch<CampaignFormData>;
  errors: FieldErrors<CampaignFormData>;
  keywordInputTab: 'manual' | 'csv';
  setKeywordInputTab: (tab: 'manual' | 'csv') => void;
}

export function CampaignInfoStep({
  register,
  setValue,
  watch,
  errors,
  keywordInputTab,
  setKeywordInputTab,
}: ICampaignInfoStepProps): JSX.Element {
  const t = useTranslations('dashboard');
  const watchedKeywords = watch('keywords');

  // Parse keywords from textarea (one per line, trimmed, filtered)
  const parsedKeywords =
    watchedKeywords
      ?.split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0) ?? [];

  const keywordCount = parsedKeywords.length;

  // Handle CSV file upload
  const handleCsvUpload = (file: File): void => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      // Parse CSV (one keyword per line, or single column)
      const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.toLowerCase().startsWith('keyword'));
      setValue('keywords', lines.join('\n'));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Campaign Name */}
      <div>
        <label htmlFor="campaign-name" className="block text-sm font-medium text-white mb-2">
          {t('campaigns.newCampaign.name')}
        </label>
        <input
          {...register('name')}
          id="campaign-name"
          type="text"
          placeholder={t('campaigns.newCampaign.namePlaceholder')}
          className={`w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none transition-all ${
            errors.name ? 'border-red-500 ring-1 ring-red-500/20' : ''
          }`}
          autoFocus
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Keywords Input */}
      <div>
        <label htmlFor="keywords-textarea" className="block text-sm font-medium text-white mb-2">
          {t('campaigns.newCampaign.keywords')}
        </label>
        <div className="bg-main/50 border border-border rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-surface-light/30 border-b border-border">
            <button
              type="button"
              onClick={() => setKeywordInputTab('manual')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                keywordInputTab === 'manual'
                  ? 'text-accent bg-accent/5'
                  : 'text-muted hover:text-secondary hover:bg-surface-light/50'
              }`}
            >
              {t('campaigns.newCampaign.keywordsManual')}
            </button>
            <button
              type="button"
              onClick={() => setKeywordInputTab('csv')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                keywordInputTab === 'csv'
                  ? 'text-accent bg-accent/5 border-l border-border'
                  : 'text-muted hover:text-secondary hover:bg-surface-light/50 border-l border-border'
              }`}
            >
              {t('campaigns.newCampaign.keywordsCsv')}
            </button>
          </div>

          <div className="p-4">
            {/* Manual Input - Textarea */}
            {keywordInputTab === 'manual' && (
              <div className="space-y-3">
                <textarea
                  {...register('keywords')}
                  id="keywords-textarea"
                  className={`w-full h-40 bg-transparent text-white focus:outline-none outline-none resize-none font-mono text-sm ${
                    errors.keywords ? 'placeholder:text-red-400/50' : ''
                  }`}
                  placeholder={t('campaigns.newCampaign.keywordsPlaceholder')}
                ></textarea>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    {t('campaigns.newCampaign.keywordsCount', { count: keywordCount })}
                  </span>
                  {errors.keywords && (
                    <p className="text-red-400 text-xs">{errors.keywords.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* CSV Upload */}
            {keywordInputTab === 'csv' && (
              <div className="relative h-40">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvUpload(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-accent/40 hover:bg-accent/5 transition-all text-center">
                  <Upload className="w-10 h-10 text-muted mb-3 group-hover:text-accent transition-colors" />
                  <span className="text-sm font-medium text-secondary">
                    {watchedKeywords
                      ? `Selected ${keywordCount} keywords`
                      : t('campaigns.newCampaign.csvDrop')}
                  </span>
                  <span className="text-xs text-muted mt-1">
                    {t('campaigns.newCampaign.csvBrowse')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted mt-3 flex items-start gap-2 bg-accent/5 p-3 rounded-lg border border-accent/10">
          <Zap className="w-3.5 h-3.5 mt-0.5 text-accent shrink-0" />
          <span>
            Smart Clustering: We&apos;ll automatically group similar keywords to prevent content
            cannibalization and ensure each article covers its topic comprehensively.
          </span>
        </p>
      </div>
    </div>
  );
}
