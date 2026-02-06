/**
 * Project Edit Modal
 * Comprehensive modal for editing all project properties
 */

'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { IProject, IUpdateProjectInput } from '@shared/types/project.types';
import type { IContentPreferences } from '@shared/types/project.types';
import { CMS_PLATFORMS, INDUSTRIES, TONES, FREQUENCIES } from '@shared/validation/project.schema';

interface IProjectEditModalProps {
  project: IProject;
  onSave: (updates: IUpdateProjectInput) => Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

const CMS_LABELS: Record<string, string> = {
  wordpress: 'WordPress',
  webflow: 'Webflow',
  shopify: 'Shopify',
  other: 'Other',
};

const INDUSTRY_LABELS: Record<string, string> = {
  tech: 'Technology & SaaS',
  health: 'Health & Wellness',
  finance: 'Finance & Investing',
  ecommerce: 'E-commerce & Retail',
  education: 'Education',
  lifestyle: 'Lifestyle & Travel',
  realestate: 'Real Estate',
  legal: 'Legal',
  marketing: 'Marketing & Agency',
  other: 'Other',
};

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional & Authoritative',
  casual: 'Casual & Friendly',
  witty: 'Witty & Humorous',
  academic: 'Academic & Technical',
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  '3x_week': '3x / Week',
  weekly: 'Weekly',
};

export function ProjectEditModal({ project, onSave, onClose, isSaving = false }: IProjectEditModalProps): JSX.Element {
  const [formData, setFormData] = useState({
    name: project.name,
    domain: project.domain || '',
    industry: project.industry || '',
    cms_type: project.cms_type,
    tone: project.content_preferences?.tone || 'professional',
    frequency: project.content_preferences?.frequency || 'weekly',
    targetWordCount: project.content_preferences?.targetWordCount?.toString() || '1000',
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: IUpdateProjectInput = {
      name: formData.name.trim(),
      domain: formData.domain.trim() || undefined,
      industry: formData.industry || undefined,
      cms_type: formData.cms_type,
      content_preferences: {
        tone: formData.tone as IContentPreferences['tone'],
        frequency: formData.frequency as IContentPreferences['frequency'],
        targetWordCount: parseInt(formData.targetWordCount, 10),
      },
    };

    await onSave(updates);
  };

  const stripDomain = (url: string) => {
    if (!url) return '';
    return url.replace(/^https?:\/\//i, '');
  };

  const domainWithoutProtocol = stripDomain(formData.domain);

  return (
    <div className="fixed inset-0 bg-main/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-elevated/30 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Project</h2>
            <p className="text-secondary text-sm mt-1">Update your project settings</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-muted hover:text-white p-2 hover:bg-surface-light rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Basic Information</h3>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                disabled={isSaving}
                maxLength={100}
                required
                className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                placeholder="My Tech Blog"
              />
              <p className="text-xs text-muted mt-1">{formData.name.length}/100 characters</p>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Domain URL</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-elevated border border-border rounded-l-lg text-muted text-sm border-r-0">
                  https://
                </span>
                <input
                  type="text"
                  value={domainWithoutProtocol}
                  onChange={e => handleChange('domain', e.target.value)}
                  disabled={isSaving}
                  className="flex-1 px-3 py-2 bg-elevated border border-border rounded-r-lg text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  placeholder="example.com"
                />
              </div>
              <p className="text-xs text-muted mt-1">Your website URL (optional)</p>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Industry / Niche</label>
              <select
                value={formData.industry}
                onChange={e => handleChange('industry', e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
              >
                <option value="">Select an industry...</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{INDUSTRY_LABELS[ind] || ind}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Platform Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Platform</h3>

            {/* CMS Type */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">CMS Platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CMS_PLATFORMS.map(platform => (
                  <label
                    key={platform}
                    className={`
                      flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all
                      ${formData.cms_type === platform
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-elevated border-border text-secondary hover:border-muted'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="cms_type"
                      value={platform}
                      checked={formData.cms_type === platform}
                      onChange={e => handleChange('cms_type', e.target.value)}
                      disabled={isSaving}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{CMS_LABELS[platform]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Content Preferences Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Content Preferences</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tone */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tone of Voice</label>
                <select
                  value={formData.tone}
                  onChange={e => handleChange('tone', e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                >
                  {TONES.map(tone => (
                    <option key={tone} value={tone}>{TONE_LABELS[tone]}</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Publishing Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={e => handleChange('frequency', e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                >
                  {FREQUENCIES.map(freq => (
                    <option key={freq} value={freq}>{FREQUENCY_LABELS[freq]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Word Count */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Target Word Count</label>
              <input
                type="number"
                value={formData.targetWordCount}
                onChange={e => handleChange('targetWordCount', e.target.value)}
                disabled={isSaving}
                min={100}
                max={10000}
                className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                placeholder="1000"
              />
              <p className="text-xs text-muted mt-1">Average length for generated articles (100-10,000 words)</p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3 bg-elevated/30 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-medium text-secondary hover:text-white bg-elevated hover:bg-surface-light rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name.trim()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
