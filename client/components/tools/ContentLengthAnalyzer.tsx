/**
 * Content Length Analyzer Tool
 *
 * Interactive React component for analyzing content length and providing recommendations.
 * Hydrated as an Astro island on the /tools/content-length-analyzer page.
 */

import { useState, useMemo } from 'react';

interface IContentLengthAnalyzerProps {
  className?: string;
}

type ContentRecommendation = 'blog' | 'pillar' | 'product';

interface IContentAnalysis {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  sentenceCount: number;
  paragraphCount: number;
  recommendation: ContentRecommendation;
}

interface IRecommendationThresholds {
  min: number;
  max: number | null;
  label: string;
}

const RECOMMENDATION_THRESHOLDS: Record<ContentRecommendation, IRecommendationThresholds> = {
  blog: { min: 1500, max: 2500, label: 'Blog Post' },
  pillar: { min: 3000, max: null, label: 'Pillar Content' },
  product: { min: 300, max: 500, label: 'Product Page' },
};

const WORDS_PER_MINUTE = 200;

export function ContentLengthAnalyzer({
  className = '',
}: IContentLengthAnalyzerProps): JSX.Element {
  const [text, setText] = useState('');
  const [recommendation, setRecommendation] = useState<ContentRecommendation>('blog');

  const analysis = useMemo((): IContentAnalysis | null => {
    if (!text.trim()) return null;

    // Word count
    const words = text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);

    const wordCount = words.length;
    const characterCount = text.length;

    // Sentence count (split by sentence-ending punctuation)
    const sentences = text
      .trim()
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0);

    // Paragraph count (split by double newlines)
    const paragraphs = text
      .trim()
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0);

    const readingTime = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

    return {
      wordCount,
      characterCount,
      readingTime,
      sentenceCount: sentences.length,
      paragraphCount: Math.max(1, paragraphs.length),
      recommendation,
    };
  }, [text, recommendation]);

  const getRecommendationStatus = (
    wordCount: number,
    type: ContentRecommendation
  ): { status: 'short' | 'optimal' | 'long'; message: string } => {
    const threshold = RECOMMENDATION_THRESHOLDS[type];

    if (wordCount < threshold.min) {
      return {
        status: 'short',
        message: `Add ${threshold.min - wordCount} more words to reach the minimum recommended length`,
      };
    }

    if (threshold.max && wordCount > threshold.max) {
      return {
        status: 'long',
        message: `Consider splitting into multiple posts or condensing by ${wordCount - threshold.max} words`,
      };
    }

    if (!threshold.max && wordCount >= threshold.min) {
      return {
        status: 'optimal',
        message: 'Great length for comprehensive pillar content',
      };
    }

    return {
      status: 'optimal',
      message: 'Your content length is within the recommended range',
    };
  };

  const getStatusColor = (status: 'short' | 'optimal' | 'long'): string => {
    switch (status) {
      case 'optimal':
        return 'text-brand-400';
      case 'short':
        return 'text-yellow-400';
      case 'long':
        return 'text-red-400';
    }
  };

  const getProgressPercentage = (wordCount: number, type: ContentRecommendation): number => {
    const threshold = RECOMMENDATION_THRESHOLDS[type];
    const targetMax = threshold.max || threshold.min * 1.5;
    return Math.min(100, (wordCount / targetMax) * 100);
  };

  const handleClear = () => {
    setText('');
  };

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        {/* Content Type Selector */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Content Type</label>
          <select
            value={recommendation}
            onChange={e => setRecommendation(e.target.value as ContentRecommendation)}
            className="w-full bg-main border border-border rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="blog">Blog Post (1,500-2,500 words)</option>
            <option value="pillar">Pillar Content (3,000+ words)</option>
            <option value="product">Product Page (300-500 words)</option>
          </select>
        </div>

        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Your Content</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your content here to analyze its length..."
            className="w-full h-48 bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>
              {
                text
                  .trim()
                  .split(/\s+/)
                  .filter(w => w.length > 0).length
              }{' '}
              words
            </span>
            <span>Tip: For URLs, copy the page content and paste it here</span>
          </div>
        </div>

        {/* Clear Button */}
        {text && (
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

      {/* Results */}
      {analysis && (
        <div className="mt-6 space-y-4">
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg border border-border bg-main/30 text-center">
              <span className="text-xs text-muted-foreground">Word Count</span>
              <p className="text-2xl font-bold text-white">{analysis.wordCount}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-main/30 text-center">
              <span className="text-xs text-muted-foreground">Characters</span>
              <p className="text-2xl font-bold text-white">{analysis.characterCount}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-main/30 text-center">
              <span className="text-xs text-muted-foreground">Reading Time</span>
              <p className="text-2xl font-bold text-white">{analysis.readingTime} min</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-main/30 text-center">
              <span className="text-xs text-muted-foreground">Sentences</span>
              <p className="text-2xl font-bold text-white">{analysis.sentenceCount}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="p-4 rounded-lg border border-border bg-main/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Progress towards {RECOMMENDATION_THRESHOLDS[recommendation].label} recommendation
              </span>
              <span className="text-sm text-white font-medium">
                {analysis.wordCount} / {RECOMMENDATION_THRESHOLDS[recommendation].min}+ words
              </span>
            </div>
            <div className="h-3 bg-main rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  getRecommendationStatus(analysis.wordCount, recommendation).status === 'optimal'
                    ? 'bg-brand-400'
                    : getRecommendationStatus(analysis.wordCount, recommendation).status === 'short'
                      ? 'bg-yellow-400'
                      : 'bg-red-400'
                }`}
                style={{ width: `${getProgressPercentage(analysis.wordCount, recommendation)}%` }}
              />
            </div>
          </div>

          {/* Recommendation Status */}
          {(() => {
            const { status, message } = getRecommendationStatus(analysis.wordCount, recommendation);
            const bgColor =
              status === 'optimal'
                ? 'bg-brand-500/10 border-brand-500/30'
                : status === 'short'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-red-500/10 border-red-500/30';

            return (
              <div className={`p-4 rounded-lg border ${bgColor}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${getStatusColor(status)}`}>
                    {status === 'optimal'
                      ? 'Optimal Length'
                      : status === 'short'
                        ? 'Too Short'
                        : 'Too Long'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
            );
          })()}

          {/* Content Type Recommendations */}
          <div className="p-4 rounded-lg border border-border bg-main/30">
            <h4 className="text-sm font-medium text-white mb-3">Content Type Guidelines</h4>
            <div className="space-y-2 text-sm">
              {Object.entries(RECOMMENDATION_THRESHOLDS).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-2 rounded ${
                    key === recommendation ? 'bg-accent/10 border border-accent/30' : ''
                  }`}
                >
                  <span className="text-white font-medium">{value.label}:</span>
                  <span className="text-muted-foreground ml-2">
                    {value.max
                      ? `${value.min.toLocaleString()}-${value.max.toLocaleString()}`
                      : `${value.min.toLocaleString()}+`}{' '}
                    words
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-main/50 rounded p-2 flex justify-between">
              <span className="text-muted-foreground">Paragraphs:</span>
              <span className="text-white font-medium">{analysis.paragraphCount}</span>
            </div>
            <div className="bg-main/50 rounded p-2 flex justify-between">
              <span className="text-muted-foreground">Avg Words/Sentence:</span>
              <span className="text-white font-medium">
                {analysis.sentenceCount > 0
                  ? (analysis.wordCount / analysis.sentenceCount).toFixed(1)
                  : '0'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          Want AI to write perfectly-sized, SEO-optimized content automatically?{' '}
          <a href="/pricing" className="text-accent hover:underline">
            Try AutopilotRank free
          </a>
        </p>
      </div>
    </div>
  );
}
