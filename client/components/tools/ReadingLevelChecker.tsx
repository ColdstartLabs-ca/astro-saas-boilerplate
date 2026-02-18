/**
 * Reading Level Checker Tool
 *
 * Interactive React component for analyzing text readability using Flesch-Kincaid.
 * Hydrated as an Astro island on the /tools/reading-level-checker page.
 */

import { useState, useMemo } from 'react';

interface IReadingLevelCheckerProps {
  className?: string;
}

interface IReadabilityResult {
  gradeLevel: number;
  readingEase: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  interpretation: string;
}

/**
 * Count syllables in a word using vowel-group heuristic
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length <= 2) return 1;

  // Remove common silent endings
  if (word.endsWith('e')) {
    word = word.slice(0, -1);
  }
  if (word.endsWith('le') && word.length > 2) {
    word = word.slice(0, -2);
  }

  // Count vowel groups (consecutive vowels count as one syllable)
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 0;

  // Ensure at least one syllable
  return Math.max(1, count);
}

/**
 * Get interpretation text for grade level
 */
function getGradeInterpretation(grade: number): string {
  if (grade <= 5) return 'Elementary school - Very easy to read';
  if (grade <= 8) return 'Middle school - Easily understood';
  if (grade <= 10) return 'High school - Fairly easy to read';
  if (grade <= 12) return 'High school senior - Plain English';
  if (grade <= 14) return 'College level - Moderately difficult';
  if (grade <= 16) return 'College graduate - Difficult';
  return 'Graduate level - Very difficult';
}

/**
 * Get interpretation for Reading Ease score
 */
function getReadingEaseInterpretation(score: number): string {
  if (score >= 90) return 'Very Easy (5th grade)';
  if (score >= 80) return 'Easy (6th grade)';
  if (score >= 70) return 'Fairly Easy (7th grade)';
  if (score >= 60) return 'Standard (8th-9th grade)';
  if (score >= 50) return 'Fairly Difficult (10th-12th grade)';
  if (score >= 30) return 'Difficult (College)';
  return 'Very Difficult (Graduate)';
}

/**
 * Get color class based on reading ease score
 */
function getReadingEaseColor(score: number): string {
  if (score >= 60) return 'text-brand-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

export function ReadingLevelChecker({ className = '' }: IReadingLevelCheckerProps): JSX.Element {
  const [text, setText] = useState('');

  const result = useMemo((): IReadabilityResult | null => {
    if (!text.trim()) return null;

    // Extract words (letters only, ignoring punctuation)
    const words = text
      .trim()
      .split(/\s+/)
      .filter(word => /[a-zA-Z]/.test(word));

    if (words.length === 0) return null;

    // Extract sentences (split by sentence-ending punctuation)
    const sentences = text
      .trim()
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0);

    const avgSentenceLength = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;

    // Flesch-Kincaid Grade Level formula:
    // 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    const gradeLevel = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

    // Flesch Reading Ease formula:
    // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    const readingEase = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    return {
      gradeLevel: Math.max(0, gradeLevel),
      readingEase: Math.max(0, Math.min(100, readingEase)),
      avgSentenceLength,
      avgSyllablesPerWord,
      wordCount,
      sentenceCount,
      syllableCount,
      interpretation: getGradeInterpretation(gradeLevel),
    };
  }, [text]);

  const handleClear = () => {
    setText('');
  };

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Your Text</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your content here to analyze its reading level..."
            className="w-full h-48 bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
          {text && (
            <p className="text-xs text-muted-foreground mt-1">
              {
                text
                  .trim()
                  .split(/\s+/)
                  .filter(w => w.length > 0).length
              }{' '}
              words
            </p>
          )}
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
      {result && (
        <div className="mt-6 space-y-4">
          {/* Primary Score */}
          <div className="p-4 rounded-lg border bg-brand-500/10 border-brand-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Flesch-Kincaid Grade Level</span>
                <p className="text-4xl font-bold text-brand-400">{result.gradeLevel.toFixed(1)}</p>
                <p className="text-sm text-white mt-1">{result.interpretation}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Reading Ease Score</span>
                <p className={`text-4xl font-bold ${getReadingEaseColor(result.readingEase)}`}>
                  {result.readingEase.toFixed(1)}
                </p>
                <p className="text-sm text-white mt-1">
                  {getReadingEaseInterpretation(result.readingEase)}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="p-4 rounded-lg border border-border bg-main/30">
            <h4 className="text-sm font-medium text-white mb-3">Detailed Metrics</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-main/50 rounded p-2">
                <span className="text-muted-foreground">Word Count:</span>
                <span className="text-white font-medium ml-2">{result.wordCount}</span>
              </div>
              <div className="bg-main/50 rounded p-2">
                <span className="text-muted-foreground">Sentence Count:</span>
                <span className="text-white font-medium ml-2">{result.sentenceCount}</span>
              </div>
              <div className="bg-main/50 rounded p-2">
                <span className="text-muted-foreground">Avg Sentence Length:</span>
                <span className="text-white font-medium ml-2">
                  {result.avgSentenceLength.toFixed(1)} words
                </span>
              </div>
              <div className="bg-main/50 rounded p-2">
                <span className="text-muted-foreground">Avg Syllables/Word:</span>
                <span className="text-white font-medium ml-2">
                  {result.avgSyllablesPerWord.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Reading Ease Scale */}
          <div className="p-4 rounded-lg border border-border bg-main/30">
            <h4 className="text-sm font-medium text-white mb-3">Reading Ease Scale</h4>
            <div className="relative">
              <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-brand-500"></div>
              <div
                className="absolute top-0 h-3 w-1 bg-white rounded-full transform -translate-x-1/2"
                style={{ left: `${100 - result.readingEase}%` }}
              ></div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0 (Graduate)</span>
                <span>60 (Standard)</span>
                <span>100 (Easy)</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-4 rounded-lg border border-border bg-main/30">
            <h4 className="text-sm font-medium text-white mb-2">SEO Recommendations</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {result.gradeLevel <= 8 ? (
                <>
                  <li>- Your content is easy to read, great for broad audiences</li>
                  <li>- Consider this level for blog posts and general content</li>
                </>
              ) : result.gradeLevel <= 12 ? (
                <>
                  <li>- Your content is at a good level for most web content</li>
                  <li>- Consider simplifying for broader reach if targeting general audiences</li>
                </>
              ) : (
                <>
                  <li>- Your content may be too complex for general web audiences</li>
                  <li>- Consider breaking up long sentences and using simpler words</li>
                  <li>- Aim for 8th grade level for best SEO performance</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          Want AI to write readable, SEO-optimized content automatically?{' '}
          <a href="/pricing" className="text-accent hover:underline">
            Try AutopilotRank free
          </a>
        </p>
      </div>
    </div>
  );
}
