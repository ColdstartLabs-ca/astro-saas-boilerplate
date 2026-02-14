/**
 * Keyword Density Checker Tool
 *
 * Interactive React component for analyzing keyword density in content.
 * Hydrated as an Astro island on the /tools/keyword-density-checker page.
 */

import { useState } from 'react';
import { calculateKeywordDensity } from '@shared/utils/seo';

interface IKeywordDensityToolProps {
  className?: string;
}

export function KeywordDensityTool({ className = '' }: IKeywordDensityToolProps): JSX.Element {
  const [content, setContent] = useState('');
  const [keyword, setKeyword] = useState('');
  const [density, setDensity] = useState<number | null>(null);
  const [keywordCount, setKeywordCount] = useState<number>(0);
  const [wordCount, setWordCount] = useState<number>(0);

  const handleAnalyze = () => {
    if (!content || !keyword) return;

    const result = calculateKeywordDensity(content, keyword);
    setDensity(result);

    // Calculate word count
    const words = content
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    setWordCount(words.length);

    // Calculate keyword occurrences
    const cleanKeyword = keyword.toLowerCase().trim();
    const textLower = content.toLowerCase();
    const regex = new RegExp(cleanKeyword.replace(/\s+/g, '\\s+'), 'gi');
    const matches = textLower.match(regex) || [];
    setKeywordCount(matches.length);
  };

  const handleClear = () => {
    setContent('');
    setKeyword('');
    setDensity(null);
    setKeywordCount(0);
    setWordCount(0);
  };

  const getDensityColor = (d: number): string => {
    if (d >= 1 && d <= 2) return 'text-brand-400';
    if (d > 2 && d <= 3) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDensityBgColor = (d: number): string => {
    if (d >= 1 && d <= 2) return 'bg-brand-500/10 border-brand-500/30';
    if (d > 2 && d <= 3) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getRecommendation = (d: number): string => {
    if (d === 0) return 'Keyword not found in content. Try adding it naturally.';
    if (d < 1) return 'Density is low. Consider adding the keyword naturally 1-2 more times.';
    if (d >= 1 && d <= 2) return 'Excellent! Your keyword density is in the optimal range (1-2%).';
    if (d > 2 && d <= 3)
      return 'Density is slightly high. Consider reducing usage or adding more content.';
    return 'Density is too high. Risk of keyword stuffing. Reduce usage or expand content.';
  };

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Your Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste your content here..."
            className="w-full h-40 bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
          {content && (
            <p className="text-xs text-muted-foreground mt-1">
              {
                content
                  .trim()
                  .split(/\s+/)
                  .filter(w => w.length > 0).length
              }{' '}
              words
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Target Keyword</label>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="Enter your keyword..."
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={!content.trim() || !keyword.trim()}
            className="flex-1 bg-accent hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Analyze Keyword Density
          </button>
          {(content || keyword) && (
            <button
              onClick={handleClear}
              className="px-4 py-3 border border-border rounded-lg text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {density !== null && (
          <div className={`mt-6 p-4 rounded-lg border ${getDensityBgColor(density)}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">Keyword Density:</span>
              <span className={`text-3xl font-bold ${getDensityColor(density)}`}>
                {density.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
              <div className="bg-main/50 rounded p-2">
                <span className="text-muted-foreground">Keyword Count:</span>
                <span className="text-white font-medium ml-2">{keywordCount}</span>
              </div>
              <div className="bg-main/50 rounded p-2">
                <span className="text-muted-foreground">Total Words:</span>
                <span className="text-white font-medium ml-2">{wordCount}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{getRecommendation(density)}</p>

            {/* Visual density indicator */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>0%</span>
                <span className="text-brand-400">1-2% (ideal)</span>
                <span>5%</span>
              </div>
              <div className="h-2 bg-main rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    density >= 1 && density <= 2
                      ? 'bg-brand-400'
                      : density > 2 && density <= 3
                        ? 'bg-yellow-400'
                        : density > 3
                          ? 'bg-red-400'
                          : 'bg-yellow-400'
                  }`}
                  style={{ width: `${Math.min(density * 20, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          Want AI to write SEO-optimized content automatically?{' '}
          <a href="/pricing" className="text-accent hover:underline">
            Try AutopilotRank free
          </a>
        </p>
      </div>
    </div>
  );
}
