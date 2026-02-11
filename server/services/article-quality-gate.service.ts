/**
 * Article Quality Gate Service
 *
 * Validates generated articles against quality thresholds before marking as draft.
 * If quality gates fail, article is marked as 'failed_quality' and can be retried.
 */

import type { IArticleOutline } from '@shared/types/article.types';

/**
 * Quality gate check result
 */
export interface IQualityGateResult {
  /** Whether all quality gates passed */
  passed: boolean;
  /** Reason for failure (if any) */
  failureReason?: string;
  /** Details of quality checks */
  details: {
    wordCountCheck: { passed: boolean; actual: number; target: number; percentage: number };
    headingCheck: { passed: boolean; h2Count: number; required: number };
    metadataCheck: {
      passed: boolean;
      hasTitle: boolean;
      hasMetaDescription: boolean;
      hasSlug: boolean;
    };
    completionCheck: { passed: boolean; finishReason: string };
  };
}

/**
 * Configuration for quality gates
 */
export const QUALITY_GATE_CONFIG = {
  /** Minimum percentage of target word count required (default 70%) */
  MIN_WORD_COUNT_PERCENTAGE: 0.7,
  /** Minimum number of H2 headings required */
  MIN_H2_HEADINGS: 3,
  /** Valid finish reasons indicating complete generation */
  VALID_FINISH_REASONS: ['stop'],
  /** Finish reasons that indicate truncation (length = hit max_tokens) */
  TRUNCATED_FINISH_REASONS: ['length', 'max_tokens', 'token_limit'],
} as const;

/**
 * Article Quality Gate Service
 */
export class ArticleQualityGateService {
  /**
   * Check if generated article passes all quality gates.
   *
   * Quality gates:
   * - Word count >= 70% of target
   * - At least 3 H2 headings
   * - Non-empty title, meta description, and slug
   * - Completion not truncated (finish_reason is valid)
   *
   * @param content - Generated article content
   * @param outline - Generated outline
   * @param targetWordCount - Target word count
   * @param finishReason - Finish reason from LLM
   * @returns Quality gate check result
   */
  checkQualityGates(
    content: string,
    outline: IArticleOutline,
    targetWordCount: number,
    finishReason: string
  ): IQualityGateResult {
    const details: IQualityGateResult['details'] = {
      wordCountCheck: { passed: false, actual: 0, target: targetWordCount, percentage: 0 },
      headingCheck: { passed: false, h2Count: 0, required: QUALITY_GATE_CONFIG.MIN_H2_HEADINGS },
      metadataCheck: { passed: false, hasTitle: false, hasMetaDescription: false, hasSlug: false },
      completionCheck: { passed: false, finishReason },
    };

    // Check 1: Word count
    const wordCount = this.countWords(content);
    const wordCountPercentage = wordCount / targetWordCount;
    details.wordCountCheck = {
      passed: wordCountPercentage >= QUALITY_GATE_CONFIG.MIN_WORD_COUNT_PERCENTAGE,
      actual: wordCount,
      target: targetWordCount,
      percentage: Math.round(wordCountPercentage * 100),
    };

    // Check 2: Heading structure
    const h2Count = this.countH2Headings(content);
    details.headingCheck = {
      passed: h2Count >= QUALITY_GATE_CONFIG.MIN_H2_HEADINGS,
      h2Count,
      required: QUALITY_GATE_CONFIG.MIN_H2_HEADINGS,
    };

    // Check 3: Metadata completeness
    const hasTitle = outline.title?.trim().length > 0;
    const hasMetaDescription = outline.metaDescription?.trim().length > 0;
    const hasSlug = outline.slug?.trim().length > 0;
    details.metadataCheck = {
      passed: hasTitle && hasMetaDescription && hasSlug,
      hasTitle,
      hasMetaDescription,
      hasSlug,
    };

    // Check 4: Completion not truncated
    const isComplete = this.isCompletionComplete(finishReason);
    details.completionCheck = {
      passed: isComplete,
      finishReason,
    };

    // Overall pass result
    const passed =
      details.wordCountCheck.passed &&
      details.headingCheck.passed &&
      details.metadataCheck.passed &&
      details.completionCheck.passed;

    // Build failure reason if any gate failed
    let failureReason: string | undefined;
    if (!passed) {
      const failures: string[] = [];
      if (!details.wordCountCheck.passed) {
        failures.push(
          `Word count ${details.wordCountCheck.actual} is only ${details.wordCountCheck.percentage}% of target ${targetWordCount} (minimum ${QUALITY_GATE_CONFIG.MIN_WORD_COUNT_PERCENTAGE * 100}%)`
        );
      }
      if (!details.headingCheck.passed) {
        failures.push(
          `Only ${details.headingCheck.h2Count} H2 headings found (minimum ${details.headingCheck.required})`
        );
      }
      if (!details.metadataCheck.passed) {
        const missing = [];
        if (!hasTitle) missing.push('title');
        if (!hasMetaDescription) missing.push('meta description');
        if (!hasSlug) missing.push('slug');
        failures.push(`Missing metadata: ${missing.join(', ')}`);
      }
      if (!details.completionCheck.passed) {
        failures.push(`Generation was truncated (finish_reason: ${finishReason})`);
      }
      failureReason = failures.join('; ');
    }

    return { passed, failureReason, details };
  }

  /**
   * Count words in markdown content.
   * Strips markdown syntax and counts words.
   */
  private countWords(markdown: string): number {
    // Remove markdown syntax
    const plainText = markdown
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/\*\*/g, '') // Bold
      .replace(/\*/g, '') // Italic
      .replace(/`/g, '') // Code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
      .replace(/\[IMAGE:\d+\]/g, '') // Image markers
      .replace(/\n+/g, ' ') // Newlines to spaces
      .trim();

    // Count words (split by whitespace, filter empty strings)
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Count H2 headings in markdown content.
   */
  private countH2Headings(markdown: string): number {
    const matches = markdown.match(/^##\s+.+$/gm);
    return matches?.length || 0;
  }

  /**
   * Check if generation completed successfully (not truncated).
   */
  private isCompletionComplete(finishReason: string): boolean {
    const validReasons = QUALITY_GATE_CONFIG.VALID_FINISH_REASONS;
    return validReasons.includes(finishReason as (typeof validReasons)[number]);
  }
}

// Export singleton instance
export const articleQualityGateService = new ArticleQualityGateService();
