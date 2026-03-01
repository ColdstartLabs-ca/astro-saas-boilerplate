/**
 * Article QA Service
 *
 * Comprehensive pre-publication QA pipeline for AI-generated content.
 * Performs multiple quality checks including plagiarism, readability,
 * fact consistency, and AI likelihood detection.
 */

import type { IArticleOutline } from '@shared/types/article.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Plagiarism check result
 */
export interface IPlagiarismCheckResult {
  /** Whether content passes plagiarism threshold */
  passed: boolean;
  /** Similarity score (0-1, where 1 is identical) */
  similarityScore: number;
  /** Flagged phrases that may be plagiarized */
  flaggedPhrases: Array<{
    phrase: string;
    start: number;
    end: number;
  }>;
  /** Number of consecutive word matches found */
  consecutiveMatches: number;
}

/**
 * Fact consistency check result
 */
export interface IFactConsistencyResult {
  /** Whether content passes fact consistency threshold */
  passed: boolean;
  /** Consistency score (0-1) */
  score: number;
  /** Number of detected inconsistencies */
  inconsistencyCount: number;
  /** Flagged inconsistent statements */
  flaggedStatements: string[];
}

/**
 * Readability metrics result
 */
export interface IReadabilityResult {
  /** Whether content passes readability threshold */
  passed: boolean;
  /** Flesch-Kincaid Grade Level (0-18+) */
  fleschKincaidGrade: number;
  /** Flesch Reading Ease Score (0-100) */
  fleschReadingEase: number;
  /** Average sentence length */
  avgSentenceLength: number;
  /** Average syllables per word */
  avgSyllablesPerWord: number;
  /** Total sentences */
  sentenceCount: number;
  /** Total words */
  wordCount: number;
}

/**
 * AI likelihood detection result
 */
export interface IAILikelihoodResult {
  /** Whether content passes AI likelihood threshold */
  passed: boolean;
  /** AI likelihood score (0-1, higher = more likely AI) */
  aiScore: number;
  /** Confidence level */
  confidence: 'low' | 'medium' | 'high';
  /** Detected AI patterns */
  detectedPatterns: string[];
}

/**
 * Overall QA check result
 */
export interface IQACheckResult {
  /** Overall pass/fail status */
  passed: boolean;
  /** Individual check results */
  results: {
    plagiarism: IPlagiarismCheckResult;
    factConsistency: IFactConsistencyResult;
    readability: IReadabilityResult;
    aiLikelihood: IAILikelihoodResult;
  };
  /** Reason for overall failure */
  failureReason?: string;
  /** Timestamp of check */
  checkedAt: string;
}

/**
 * QA configuration for a project
 */
export interface IQAConfig {
  /** Maximum allowed similarity score (0-1) */
  maxPlagiarismSimilarity: number;
  /** Minimum fact consistency score (0-1) */
  minFactConsistency: number;
  /** Maximum Flesch-Kincaid grade level */
  maxReadabilityGrade: number;
  /** Minimum Flesch Reading Ease score */
  minReadingEase: number;
  /** Maximum allowed AI likelihood score (0-1) */
  maxAILikelihood: number;
}

/**
 * Default QA configuration
 */
export const DEFAULT_QA_CONFIG: IQAConfig = {
  maxPlagiarismSimilarity: 0.25, // 25% similarity threshold (heuristic is crude; 15% was too strict)
  minFactConsistency: 0.6, // 60% consistency threshold
  maxReadabilityGrade: 14, // grade 14 (college sophomore) — grade 12 was too strict for technical content
  minReadingEase: 20, // Difficult — lowered from 30; technical articles score lower on this scale
  maxAILikelihood: 0.8, // 80% AI likelihood threshold
} as const;

/**
 * Sample text for plagiarism detection (can be extended with external API)
 * This is a basic set of common phrases that may indicate duplicated content
 */
const COMMON_PHRASES = [
  'in conclusion',
  'in summary',
  'to summarize',
  'it is important to note',
  "it's worth noting",
  'it is important to mention',
  'first and foremost',
  'last but not least',
  'on the other hand',
  "in today's world",
  'in this day and age',
  'in the modern world',
  'with the advent of',
  'plays a crucial role',
  'plays an important role',
  'it is essential to',
  'it is vital to',
  'one of the most',
  'a wide range of',
  'a variety of',
  'numerous',
  'various',
  'multiple',
];

// =============================================================================
// QA Service
// =============================================================================

export class QAService {
  /**
   * Run all QA checks on article content
   *
   * @param content - Article content to check
   * @param outline - Article outline with metadata
   * @param config - QA configuration (uses defaults if not provided)
   * @returns QA check result with all individual checks
   */
  async runQAChecks(
    content: string,
    outline: IArticleOutline,
    config: Partial<IQAConfig> = {}
  ): Promise<IQACheckResult> {
    const finalConfig = { ...DEFAULT_QA_CONFIG, ...config };

    const results = {
      plagiarism: this.checkPlagiarism(content),
      factConsistency: this.checkFactConsistency(content, outline),
      readability: this.checkReadability(content),
      aiLikelihood: await this.checkAILikelihood(content),
    };

    const passed =
      results.plagiarism.passed &&
      results.factConsistency.passed &&
      results.readability.passed &&
      results.aiLikelihood.passed;

    let failureReason: string | undefined;
    if (!passed) {
      const failures: string[] = [];

      if (!results.plagiarism.passed) {
        failures.push(
          `Plagiarism check: ${(results.plagiarism.similarityScore * 100).toFixed(1)}% similarity exceeds threshold of ${(finalConfig.maxPlagiarismSimilarity * 100).toFixed(1)}%`
        );
      }

      if (!results.factConsistency.passed) {
        failures.push(
          `Fact consistency: ${(results.factConsistency.score * 100).toFixed(1)}% below threshold of ${(finalConfig.minFactConsistency * 100).toFixed(1)}%`
        );
      }

      if (!results.readability.passed) {
        failures.push(
          `Readability: Grade level ${results.readability.fleschKincaidGrade.toFixed(1)} exceeds maximum of ${finalConfig.maxReadabilityGrade} or reading ease ${results.readability.fleschReadingEase.toFixed(1)} below minimum of ${finalConfig.minReadingEase}`
        );
      }

      if (!results.aiLikelihood.passed) {
        failures.push(
          `AI likelihood: ${(results.aiLikelihood.aiScore * 100).toFixed(1)}% exceeds threshold of ${(finalConfig.maxAILikelihood * 100).toFixed(1)}%`
        );
      }

      failureReason = failures.join('; ');
    }

    console.log(
      `[QA] Pipeline result: passed=${passed} ` +
        `plagiarism=${results.plagiarism.passed} ` +
        `factConsistency=${results.factConsistency.passed}(${(results.factConsistency.score * 100).toFixed(1)}%) ` +
        `readability=${results.readability.passed}(grade=${results.readability.fleschKincaidGrade.toFixed(1)},ease=${results.readability.fleschReadingEase.toFixed(1)}) ` +
        `aiLikelihood=${results.aiLikelihood.passed}(${(results.aiLikelihood.aiScore * 100).toFixed(1)}%)` +
        (failureReason ? ` | FAIL: ${failureReason}` : '')
    );

    return {
      passed,
      results,
      failureReason,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Check for potential plagiarism using basic fingerprinting
   *
   * This implementation uses basic text fingerprinting to detect
   * consecutive word matches and common phrases.
   *
   * @param content - Article content to check
   * @returns Plagiarism check result
   */
  checkPlagiarism(content: string): IPlagiarismCheckResult {
    const plainText = this.stripMarkdown(content);
    const words = plainText.toLowerCase().split(/\s+/);
    const flaggedPhrases: IPlagiarismCheckResult['flaggedPhrases'] = [];

    // Check for common phrases
    for (const phrase of COMMON_PHRASES) {
      const phraseRegex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
      const matches = plainText.matchAll(phraseRegex);

      for (const match of matches) {
        if (match.index !== undefined) {
          flaggedPhrases.push({
            phrase: match[0],
            start: match.index,
            end: match.index + match[0].length,
          });
        }
      }
    }

    // Check for consecutive word matches (basic duplicate detection)
    const nGramSize = 5;
    const nGrams = new Map<string, number>();

    for (let i = 0; i <= words.length - nGramSize; i++) {
      const nGram = words.slice(i, i + nGramSize).join(' ');
      nGrams.set(nGram, (nGrams.get(nGram) || 0) + 1);
    }

    // Count repeated n-grams (potential duplicates)
    let consecutiveMatches = 0;
    for (const [, count] of nGrams.entries()) {
      if (count > 1) {
        consecutiveMatches += count - 1;
      }
    }

    // Calculate similarity score based on flagged phrases and repeated n-grams.
    // n-gram repetition within the same article is normal (keyword repetition is good for SEO),
    // so we use a generous normalization factor to avoid false positives.
    const phraseWeight = 0.3;
    const nGramWeight = 0.7;
    const phraseScore = Math.min(flaggedPhrases.length / (words.length / 10), 1);
    // Dividing by words.length/15 (was /50) means the n-gram score grows much more slowly,
    // preventing keyword repetition from falsely inflating the plagiarism score.
    const nGramScore = Math.min(consecutiveMatches / (words.length / 15), 1);
    const similarityScore = phraseScore * phraseWeight + nGramScore * nGramWeight;

    const passed = similarityScore < DEFAULT_QA_CONFIG.maxPlagiarismSimilarity;

    console.log(
      `[QA] Plagiarism check: similarityScore=${(similarityScore * 100).toFixed(1)}% ` +
        `(threshold=${DEFAULT_QA_CONFIG.maxPlagiarismSimilarity * 100}%) ` +
        `phraseScore=${(phraseScore * 100).toFixed(1)}% nGramScore=${(nGramScore * 100).toFixed(1)}% ` +
        `flaggedPhrases=${flaggedPhrases.length} consecutiveMatches=${consecutiveMatches} words=${words.length} ` +
        `passed=${passed}`
    );

    return {
      passed,
      similarityScore,
      flaggedPhrases,
      consecutiveMatches,
    };
  }

  /**
   * Check for fact consistency between content and outline
   *
   * Performs basic checks including:
   * - Key points from outline are covered in content
   * - Title appears in content
   * - Section headings match outline structure
   *
   * @param content - Article content to check
   * @param outline - Article outline with expected structure
   * @returns Fact consistency check result
   */
  checkFactConsistency(content: string, outline: IArticleOutline): IFactConsistencyResult {
    const plainText = this.stripMarkdown(content).toLowerCase();
    const flaggedStatements: string[] = [];
    let consistencyScore = 1.0;

    // Check 1: Title should appear in content
    const titleInContent = plainText.includes(outline.title.toLowerCase());
    if (!titleInContent) {
      flaggedStatements.push(`Title "${outline.title}" not found in content`);
      consistencyScore -= 0.2;
    }

    // Check 2: Section headings from outline should be present.
    // Uses word-overlap instead of exact string match so that AI paraphrasing of headings
    // (e.g. "AI Humanizer Tools" vs "AI Content Humanizer Tools") doesn't cause false failures.
    const missingHeadings: string[] = [];
    for (const section of outline.sections) {
      if (!this.headingInContent(section.heading, plainText)) {
        missingHeadings.push(section.heading);
      }
    }

    if (missingHeadings.length > 0) {
      flaggedStatements.push(`Missing sections: ${missingHeadings.join(', ')}`);
      consistencyScore -= 0.3 * (missingHeadings.length / outline.sections.length);
    }

    // Check 3: Key points should be covered
    const allKeyPoints = outline.sections.flatMap(s => s.keyPoints);
    const coveredKeyPoints = allKeyPoints.filter(kp =>
      plainText.includes(kp.toLowerCase().substring(0, 20))
    );
    const keyPointCoverage = coveredKeyPoints.length / allKeyPoints.length;

    if (keyPointCoverage < 0.5) {
      flaggedStatements.push(
        `Low key point coverage: ${Math.round(keyPointCoverage * 100)}% of key points addressed`
      );
      consistencyScore -= 0.2;
    }

    // Check 4: Meta description should relate to content
    if (outline.metaDescription) {
      const descWords = outline.metaDescription.toLowerCase().split(/\s+/).slice(0, 5);
      const descCoverage = descWords.filter(w => plainText.includes(w)).length / descWords.length;

      if (descCoverage < 0.3) {
        flaggedStatements.push('Meta description does not relate well to content');
        consistencyScore -= 0.1;
      }
    }

    const score = Math.max(0, consistencyScore);
    const passed = score >= DEFAULT_QA_CONFIG.minFactConsistency;

    console.log(
      `[QA] Fact consistency: score=${(score * 100).toFixed(1)}% ` +
        `(threshold=${DEFAULT_QA_CONFIG.minFactConsistency * 100}%) ` +
        `titleFound=${titleInContent} ` +
        `missingHeadings=${missingHeadings.length}/${outline.sections.length} ` +
        `(${missingHeadings.length > 0 ? missingHeadings.join(', ') : 'none'}) ` +
        `passed=${passed}`
    );

    return {
      passed,
      score,
      inconsistencyCount: flaggedStatements.length,
      flaggedStatements,
    };
  }

  /**
   * Check if an outline heading is present in the article content.
   * Uses word-overlap (≥60% of significant words must appear) to handle
   * cases where the AI paraphrases headings slightly.
   */
  private headingInContent(heading: string, plainText: string): boolean {
    // Exact substring match first (fast path)
    if (plainText.includes(heading.toLowerCase())) return true;

    // Word overlap: filter out short stop words, check if ≥60% of significant words appear
    const significantWords = heading
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2); // Ignore "to", "a", "an", "of" etc.

    if (significantWords.length === 0) return true;

    const foundCount = significantWords.filter(w => plainText.includes(w)).length;
    const overlap = foundCount / significantWords.length;
    return overlap >= 0.6;
  }

  /**
   * Check readability using Flesch-Kincaid metrics
   *
   * Calculates:
   * - Flesch-Kincaid Grade Level
   * - Flesch Reading Ease Score
   *
   * @param content - Article content to check
   * @returns Readability check result
   */
  checkReadability(content: string): IReadabilityResult {
    const plainText = this.stripMarkdown(content);
    const sentences = this.splitSentences(plainText);
    const words = plainText.split(/\s+/).filter(w => w.length > 0);

    const sentenceCount = sentences.length;
    const wordCount = words.length;

    if (sentenceCount === 0 || wordCount === 0) {
      return {
        passed: false,
        fleschKincaidGrade: 0,
        fleschReadingEase: 0,
        avgSentenceLength: 0,
        avgSyllablesPerWord: 0,
        sentenceCount: 0,
        wordCount: 0,
      };
    }

    // Count syllables
    const syllableCount = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    // Calculate metrics
    const avgSentenceLength = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;

    // Flesch-Kincaid Grade Level
    // Formula: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
    const fleschKincaidGrade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

    // Flesch Reading Ease Score
    // Formula: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
    const fleschReadingEase = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    const passed =
      fleschKincaidGrade <= DEFAULT_QA_CONFIG.maxReadabilityGrade &&
      fleschReadingEase >= DEFAULT_QA_CONFIG.minReadingEase;

    return {
      passed,
      fleschKincaidGrade,
      fleschReadingEase,
      avgSentenceLength,
      avgSyllablesPerWord,
      sentenceCount,
      wordCount,
    };
  }

  /**
   * Check AI likelihood using heuristic patterns
   *
   * Detects common AI writing patterns including:
   * - Repetitive sentence structures
   * - Generic transition phrases
   * - Perfect grammar patterns
   * - Formulaic introduction/conclusion
   *
   * @param content - Article content to check
   * @returns AI likelihood check result
   */
  async checkAILikelihood(content: string): Promise<IAILikelihoodResult> {
    const plainText = this.stripMarkdown(content);
    const sentences = this.splitSentences(plainText);

    const detectedPatterns: string[] = [];
    let aiScore = 0;

    // Pattern 1: Generic AI transitions (weight: 0.25)
    const aiTransitions = [
      'furthermore',
      'moreover',
      'additionally',
      'in addition',
      'it is important to note',
      "it's worth noting",
      "it's essential to understand",
      'it is crucial to recognize',
      'it is vital to remember',
    ];

    let aiTransitionCount = 0;
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      for (const transition of aiTransitions) {
        if (lower.includes(transition)) {
          aiTransitionCount++;
          break;
        }
      }
    }

    const transitionScore = Math.min(aiTransitionCount / sentences.length, 1) * 0.25;
    if (transitionScore > 0.1) {
      detectedPatterns.push(`Generic transitions: ${aiTransitionCount} occurrences`);
    }
    aiScore += transitionScore;

    // Pattern 2: Repetitive sentence length (weight: 0.2)
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const similarLengthCount = sentenceLengths.filter(l => Math.abs(l - avgLength) < 3).length;
    const repetitiveScore = (similarLengthCount / sentenceLengths.length) * 0.2;
    if (repetitiveScore > 0.15) {
      detectedPatterns.push('Repetitive sentence structure');
    }
    aiScore += repetitiveScore;

    // Pattern 3: Formulaic intros/outros (weight: 0.25)
    const formulaicIntro =
      /^(in today's world|in this day and age|in the modern era|in recent years)/i;
    const formulaicOutro = /^(in conclusion|to sum up|in summary|to wrap up)/i;

    let hasFormulaicIntro = false;
    let hasFormulaicOutro = false;

    if (sentences.length > 0) {
      hasFormulaicIntro = formulaicIntro.test(sentences[0].trim());
    }
    if (sentences.length > 1) {
      hasFormulaicOutro = formulaicOutro.test(sentences[sentences.length - 1].trim());
    }

    const formulaicScore = (hasFormulaicIntro ? 0.125 : 0) + (hasFormulaicOutro ? 0.125 : 0);
    if (formulaicScore > 0) {
      detectedPatterns.push('Formulaic introduction/conclusion');
    }
    aiScore += formulaicScore;

    // Pattern 4: Low sentence complexity (weight: 0.15)
    const simpleSentences = sentences.filter(s => {
      const words = s.split(/\s+/);
      // Simple sentences: < 15 words, no commas, no complex structure
      return words.length < 15 && !s.includes(',') && !s.includes('—');
    });
    const simplicityScore = (simpleSentences.length / sentences.length) * 0.15;
    if (simplicityScore > 0.1) {
      detectedPatterns.push('Low sentence complexity');
    }
    aiScore += simplicityScore;

    // Pattern 5: Passive voice overuse (weight: 0.15)
    const passiveVoicePattern = /\b(was|were|is|are|been|being)\s+(\w+ed\b)/gi;
    const passiveMatches = plainText.match(passiveVoicePattern);
    const passiveScore = passiveMatches
      ? Math.min(passiveMatches.length / sentences.length, 1) * 0.15
      : 0;
    if (passiveScore > 0.05) {
      detectedPatterns.push('Overuse of passive voice');
    }
    aiScore += passiveScore;

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high';
    if (aiScore < 0.3) {
      confidence = 'low';
    } else if (aiScore < 0.6) {
      confidence = 'medium';
    } else {
      confidence = 'high';
    }

    const passed = aiScore < DEFAULT_QA_CONFIG.maxAILikelihood;

    console.log(
      `[QA] AI likelihood: score=${(aiScore * 100).toFixed(1)}% ` +
        `(threshold=${DEFAULT_QA_CONFIG.maxAILikelihood * 100}%) ` +
        `confidence=${confidence} patterns=[${detectedPatterns.join(', ')}] passed=${passed}`
    );

    return {
      passed,
      aiScore,
      confidence,
      detectedPatterns,
    };
  }

  /**
   * Strip markdown syntax from text
   *
   * @param markdown - Markdown content
   * @returns Plain text without markdown syntax
   */
  private stripMarkdown(markdown: string): string {
    return markdown
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/\*\*/g, '') // Bold
      .replace(/\*/g, '') // Italic
      .replace(/`/g, '') // Code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
      .replace(/\[IMAGE:\d+\]/g, '') // Image markers
      .replace(/\n+/g, ' ') // Newlines to spaces
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();
  }

  /**
   * Split text into sentences
   *
   * @param text - Plain text
   * @returns Array of sentences
   */
  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Count syllables in a word
   *
   * @param word - Word to analyze
   * @returns Approximate syllable count
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length === 0) return 0;

    // Basic syllable counting rules
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '^');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? Math.max(1, matches.length) : 1;
  }
}

// Export singleton instance
export const qaService = new QAService();
