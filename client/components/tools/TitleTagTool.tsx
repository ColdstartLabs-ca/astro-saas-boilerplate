/**
 * Title Tag Checker Tool
 *
 * Interactive React component for validating title tags.
 * Hydrated as an Astro island on the /tools/title-tag-checker page.
 */

import { useState, useMemo } from 'react';
import { validateTitleTag } from '@shared/utils/seo';

interface ITitleTagToolProps {
  className?: string;
}

export function TitleTagTool({ className = '' }: ITitleTagToolProps): JSX.Element {
  const [title, setTitle] = useState('');

  const validation = useMemo(() => {
    return validateTitleTag(title);
  }, [title]);

  const getCounterColor = (): string => {
    if (validation.charCount === 0) return 'text-muted-foreground';
    if (validation.charCount < 50) return 'text-red-400';
    if (validation.charCount <= 60) return 'text-brand-400';
    return 'text-red-400';
  };

  const getCounterBgColor = (): string => {
    if (validation.charCount === 0) return 'bg-main';
    if (validation.charCount < 50) return 'bg-red-500/10 border-red-500/30';
    if (validation.charCount <= 60) return 'bg-brand-500/10 border-brand-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getPixelColor = (): string => {
    if (validation.pixelEstimate === 0) return 'text-muted-foreground';
    if (validation.pixelEstimate <= 580) return 'text-brand-400';
    return 'text-red-400';
  };

  const handleClear = () => {
    setTitle('');
  };

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Title Tag</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter your title tag here (aim for 50-60 characters)..."
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Character Counter & Pixel Width */}
        <div className={`p-4 rounded-lg border ${getCounterBgColor()}`}>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <span className="text-sm text-muted-foreground">Character Count:</span>
              <p className={`text-2xl font-bold ${getCounterColor()}`}>
                {validation.charCount} / 60
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Est. Pixel Width:</span>
              <p className={`text-2xl font-bold ${getPixelColor()}`}>
                {validation.pixelEstimate}px
              </p>
            </div>
          </div>

          {/* Visual progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-main rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  validation.charCount < 50
                    ? 'bg-red-400'
                    : validation.charCount <= 60
                      ? 'bg-brand-400'
                      : 'bg-red-400'
                }`}
                style={{ width: `${Math.min((validation.charCount / 60) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span className="text-brand-400">50 (min)</span>
              <span>60 (max)</span>
            </div>
          </div>

          {/* Pixel width indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Pixel Width</span>
              <span className={getPixelColor()}>Max: ~580px</span>
            </div>
            <div className="h-2 bg-main rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  validation.pixelEstimate <= 580 ? 'bg-brand-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min((validation.pixelEstimate / 600) * 100, 100)}%` }}
              />
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
              Your title tag is well-optimized for search engines.
            </p>
          </div>
        )}

        {/* SERP Preview */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-white mb-3">Google SERP Preview:</h4>
          <div className="bg-main border border-border rounded-lg p-4">
            {/* URL */}
            <p className="text-sm text-gray-500 mb-1 truncate">https://example.com/your-page</p>
            {/* Title */}
            <h5 className="text-blue-500 text-lg mb-1 hover:underline cursor-pointer truncate">
              {title || 'Your Page Title Here'}
            </h5>
            {/* Description (mockup) */}
            <p className="text-sm text-gray-600 leading-relaxed">
              Your page description will appear here. This is typically the meta description or a
              snippet from your page content.
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This is a visual approximation of how your title may appear in search results. Google
            typically displays the first 50-60 characters.
          </p>
        </div>

        {/* Clear Button */}
        {title && (
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
          Want AI to write optimized title tags automatically?{' '}
          <a href="/pricing" className="text-accent hover:underline">
            Try AutopilotRank free
          </a>
        </p>
      </div>
    </div>
  );
}
