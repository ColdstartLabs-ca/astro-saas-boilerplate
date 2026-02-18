/**
 * Meta Description Checker Tool
 *
 * Interactive React component for validating meta descriptions.
 * Hydrated as an Astro island on the /tools/meta-description-checker page.
 */

import { useState, useMemo } from 'react';
import { validateMetaDescription } from '@shared/utils/seo';

interface IMetaDescriptionToolProps {
  className?: string;
}

export function MetaDescriptionTool({ className = '' }: IMetaDescriptionToolProps): JSX.Element {
  const [description, setDescription] = useState('');

  const validation = useMemo(() => {
    return validateMetaDescription(description);
  }, [description]);

  const getCounterColor = (): string => {
    if (validation.charCount === 0) return 'text-muted-foreground';
    if (validation.charCount < 120) return 'text-red-400';
    if (validation.charCount <= 160) return 'text-brand-400';
    return 'text-red-400';
  };

  const getCounterBgColor = (): string => {
    if (validation.charCount === 0) return 'bg-main';
    if (validation.charCount < 120) return 'bg-red-500/10 border-red-500/30';
    if (validation.charCount <= 160) return 'bg-brand-500/10 border-brand-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const handleClear = () => {
    setDescription('');
  };

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Meta Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter your meta description here (aim for 120-160 characters)..."
            className="w-full h-32 bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        {/* Character Counter */}
        <div className={`p-4 rounded-lg border ${getCounterBgColor()}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Character Count:</span>
            <span className={`text-2xl font-bold ${getCounterColor()}`}>
              {validation.charCount} / 160
            </span>
          </div>

          {/* Visual progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-main rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  validation.charCount < 120
                    ? 'bg-red-400'
                    : validation.charCount <= 160
                      ? 'bg-brand-400'
                      : 'bg-red-400'
                }`}
                style={{ width: `${Math.min((validation.charCount / 160) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span className="text-brand-400">120 (min)</span>
              <span>160 (max)</span>
            </div>
          </div>
        </div>

        {/* Issues List */}
        {validation.issues.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-400 mb-2">Issues Found:</h4>
            <ul className="space-y-1">
              {validation.issues.map((issue, index) => (
                <li key={index} className="text-sm text-red-300 flex items-start">
                  <span className="mr-2">-</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Message */}
        {validation.isValid && (
          <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4">
            <p className="text-sm text-brand-400">
              Your meta description is well-optimized for search engines.
            </p>
          </div>
        )}

        {/* SERP Preview */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-white mb-3">Google SERP Preview:</h4>
          <div className="bg-main border border-border rounded-lg p-4">
            {/* URL */}
            <p className="text-sm text-gray-500 mb-1 truncate">https://example.com/your-page</p>
            {/* Title (mockup) */}
            <h5 className="text-blue-400 text-lg mb-1 hover:underline cursor-pointer">
              Your Page Title Here
            </h5>
            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed">
              {description ||
                'Your meta description will appear here. Enter your description above to see a preview of how it will look in Google search results.'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This is a visual approximation of how your meta description may appear in search
            results.
          </p>
        </div>

        {/* Clear Button */}
        {description && (
          <div className="flex justify-end">
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          Want AI to write optimized meta descriptions automatically?{' '}
          <a href="/pricing" className="text-accent hover:underline">
            Try AutopilotRank free
          </a>
        </p>
      </div>
    </div>
  );
}
