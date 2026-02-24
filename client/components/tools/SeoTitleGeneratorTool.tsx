import { useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';

interface ISeoTitleGeneratorToolProps {
  className?: string;
}

type ContentType = 'How-To' | 'Listicle' | 'Guide' | 'Comparison' | 'Review';

interface ITitleResult {
  title: string;
  length: number;
  isLong: boolean;
}

const CONTENT_TYPES: ContentType[] = ['How-To', 'Listicle', 'Guide', 'Comparison', 'Review'];

const YEAR = new Date().getFullYear();

function buildTitles(keyword: string, contentType: ContentType): ITitleResult[] {
  const kw = keyword.trim();
  const templates: string[] = [];

  if (contentType === 'How-To') {
    templates.push(
      `How to ${kw} in ${YEAR} (Step-by-Step Guide)`,
      `How to ${kw}: A Complete ${YEAR} Walkthrough`,
      `How to ${kw} the Right Way`,
      `How to ${kw} — Beginner to Advanced`,
      `How to ${kw} Without Wasting Hours`,
      `How to ${kw} Fast (Proven Method)`,
      `How to ${kw}: Tips That Actually Work`,
      `How to ${kw} for Free in ${YEAR}`,
      `How to ${kw}: What No One Tells You`,
      `How to ${kw} — Even If You're a Beginner`
    );
  } else if (contentType === 'Listicle') {
    templates.push(
      `7 Best ${kw} Tools in ${YEAR}`,
      `10 ${kw} Strategies That Actually Work`,
      `5 Reasons to Use ${kw} for Your Business`,
      `12 ${kw} Tips to Boost Results in ${YEAR}`,
      `7 ${kw} Mistakes You're Making (and How to Fix Them)`,
      `9 Proven ${kw} Techniques for ${YEAR}`,
      `Top 8 ${kw} Solutions Compared`,
      `5 Ways ${kw} Can Save You Time`,
      `10 ${kw} Best Practices for ${YEAR}`,
      `7 Things You Should Know About ${kw}`
    );
  } else if (contentType === 'Guide') {
    templates.push(
      `The Complete Guide to ${kw} for Beginners`,
      `The Ultimate ${kw} Guide (${YEAR} Edition)`,
      `${kw}: The Definitive Guide`,
      `A Beginner's Guide to ${kw}`,
      `${kw} Explained: Everything You Need to Know`,
      `The ${YEAR} Guide to ${kw}`,
      `${kw}: From Zero to Expert`,
      `The No-Nonsense Guide to ${kw}`,
      `${kw} 101: A Complete Introduction`,
      `Your Complete ${kw} Playbook for ${YEAR}`
    );
  } else if (contentType === 'Comparison') {
    templates.push(
      `${kw} vs Manual: Which Is Better in ${YEAR}?`,
      `${kw}: Pros and Cons You Need to Know`,
      `${kw} vs Competitors: An Honest Comparison`,
      `Is ${kw} Worth It in ${YEAR}?`,
      `${kw} vs Traditional Methods: The Real Difference`,
      `${kw} Compared: Finding the Best Option`,
      `${kw} or DIY? Here's the Truth`,
      `${kw} vs the Alternatives: A Side-by-Side Review`,
      `Which ${kw} Tool Is Best in ${YEAR}?`,
      `${kw} Showdown: Which Should You Choose?`
    );
  } else {
    // Review
    templates.push(
      `${kw} Review ${YEAR}: Is It Worth It?`,
      `${kw} Honest Review: What You Need to Know`,
      `I Tried ${kw} for 30 Days — Here's My Review`,
      `${kw} Review: Pros, Cons, and Verdict`,
      `${kw} in ${YEAR}: A Detailed Review`,
      `${kw} Review: Is It as Good as They Say?`,
      `${kw} — Real User Review for ${YEAR}`,
      `${kw} Review: Everything I Wished I Knew`,
      `${kw} Test & Review: My Honest Take`,
      `${kw} Review ${YEAR}: Worth the Price?`
    );
  }

  return templates.map(title => ({
    title,
    length: title.length,
    isLong: title.length > 60,
  }));
}

function getLengthClass(length: number): string {
  if (length <= 60) return 'text-green-400';
  if (length <= 70) return 'text-yellow-400';
  return 'text-red-400';
}

function getLengthLabel(length: number): string {
  if (length <= 60) return 'Good';
  if (length <= 70) return 'Long';
  return 'Too long';
}

export function SeoTitleGeneratorTool({
  className = '',
}: ISeoTitleGeneratorToolProps): JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [contentType, setContentType] = useState<ContentType>('How-To');
  const [titles, setTitles] = useState<ITitleResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | 'all' | null>(null);

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    setTitles(buildTitles(keyword, contentType));
  };

  const handleCopy = (text: string, index: number | 'all') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  };

  const handleCopyAll = () => {
    const all = titles.map(t => t.title).join('\n');
    handleCopy(all, 'all');
  };

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Target Keyword</label>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. automated SEO"
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Content Type</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setContentType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  contentType === type
                    ? 'bg-accent border-accent text-white'
                    : 'bg-main border-border text-muted-foreground hover:border-accent/50 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!keyword.trim()}
          className="w-full bg-accent hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Generate Titles
        </button>

        {titles.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> ≤60 chars
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 61-70
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &gt;70
                </span>
              </div>
              <button
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                {copiedIndex === 'all' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedIndex === 'all' ? 'Copied!' : 'Copy All'}
              </button>
            </div>

            {titles.map((result, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 bg-main/60 border border-border rounded-lg px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed">{result.title}</p>
                  <p className={`text-xs mt-1 ${getLengthClass(result.length)}`}>
                    {result.length} chars — {getLengthLabel(result.length)}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(result.title, i)}
                  className="flex-shrink-0 text-muted-foreground hover:text-accent transition-colors"
                  aria-label={`Copy title ${i + 1}`}
                >
                  {copiedIndex === i ? (
                    <Check className="w-4 h-4 text-accent" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-center text-muted-foreground mb-3">
          Publish articles with these titles automatically
        </p>
        <a
          href="/signup"
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-colors"
        >
          Start Free Trial
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
