/**
 * SEO Analysis Utilities
 *
 * Functions for calculating SEO scores and analyzing article content
 * for search engine optimization best practices.
 */

import type { IArticle } from '@shared/types/article.types';

/**
 * Heading structure analysis result
 */
export interface IHeadingStructure {
  hasH1: boolean;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  hasProperHierarchy: boolean;
  issues: string[];
}

/**
 * Individual SEO metric scores
 */
export interface ISEOMetrics {
  keywordDensity: {
    score: number;
    density: number;
    issues: string[];
  };
  headingStructure: {
    score: number;
    analysis: IHeadingStructure;
  };
  wordCount: {
    score: number;
    count: number;
    issues: string[];
  };
  metaDescription: {
    score: number;
    length: number;
    issues: string[];
  };
  title: {
    score: number;
    length: number;
    hasKeyword: boolean;
    issues: string[];
  };
}

/**
 * Overall SEO score result
 */
export interface ISEOScoreResult {
  overallScore: number;
  metrics: ISEOMetrics;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Strip markdown syntax from content for analysis
 */
function stripMarkdown(content: string): string {
  return content
    .replace(/^#+\s+/gm, '') // Remove heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/~~(.+?)~~/g, '$1') // Remove strikethrough
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
    .replace(/!\[.*?\]\(.+?\)/g, '') // Remove images
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\n\s*\n/g, '\n') // Remove extra newlines
    .trim();
}

/**
 * Calculate word count from content
 */
function getWordCount(content: string): number {
  const text = stripMarkdown(content);
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculate keyword density in content
 * @param content - Article content (markdown or plain text)
 * @param keyword - Primary keyword to check
 * @returns Density as percentage (0-100)
 */
export function calculateKeywordDensity(content: string, keyword: string): number {
  if (!content || !keyword) return 0;

  const text = stripMarkdown(content).toLowerCase();
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  if (wordCount === 0) return 0;

  // Clean keyword: remove special characters, lowercase
  const cleanKeyword = keyword
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
  const keywordVariations = cleanKeyword.split(/\s+/);

  // Count exact keyword phrase matches first
  const exactMatchRegex = new RegExp(cleanKeyword.replace(/\s+/g, '\\s+'), 'gi');
  const exactMatches = (text.match(exactMatchRegex) || []).length;

  // Also count individual word occurrences for multi-word keywords
  let individualMatches = 0;
  if (keywordVariations.length > 1) {
    keywordVariations.forEach(word => {
      if (word.length > 2) {
        // Only count words longer than 2 chars
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        individualMatches += (text.match(regex) || []).length;
      }
    });
    // Average the counts for multi-word keywords
    individualMatches = Math.floor(individualMatches / keywordVariations.length);
  }

  // Use the higher count for better accuracy
  const totalMatches = Math.max(exactMatches, individualMatches);

  return (totalMatches / wordCount) * 100;
}

/**
 * Analyze heading structure in markdown content
 * @param content - Article content in markdown format
 * @returns Heading structure analysis
 */
export function analyzeHeadingStructure(content: string): IHeadingStructure {
  const result: IHeadingStructure = {
    hasH1: false,
    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    hasProperHierarchy: false,
    issues: [],
  };

  if (!content) {
    result.issues.push('No content to analyze');
    return result;
  }

  const lines = content.split('\n');
  const headings: Array<{ level: number; line: number }> = [];

  // Extract all headings
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      headings.push({ level, line: index });

      if (level === 1) result.h1Count++;
      else if (level === 2) result.h2Count++;
      else if (level === 3) result.h3Count++;
    }
  });

  // Check for H1
  result.hasH1 = result.h1Count > 0;

  if (!result.hasH1) {
    result.issues.push('Missing H1 heading');
  } else if (result.h1Count > 1) {
    result.issues.push('Multiple H1 headings (should have exactly one)');
  }

  // Check for H2 headings
  if (result.h2Count === 0) {
    result.issues.push('No H2 headings found');
  }

  // Check hierarchy (should not skip levels)
  let hasProperHierarchy = true;
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const curr = headings[i];
    // Heading levels should not increase by more than 1
    if (curr.level > prev.level + 1) {
      hasProperHierarchy = false;
      result.issues.push(`Heading hierarchy issue: H${prev.level} followed by H${curr.level}`);
      break;
    }
  }

  result.hasProperHierarchy = hasProperHierarchy;

  // Check if content is too short
  if (headings.length === 0) {
    result.issues.push('No headings found in content');
  }

  return result;
}

/**
 * Check meta description quality
 * @param article - Article object with meta_description
 * @returns Score (0-100) and issues
 */
export function checkMetaDescription(
  article: Pick<IArticle, 'meta_description' | 'primary_keyword'>
): {
  score: number;
  length: number;
  issues: string[];
} {
  const result = {
    score: 0,
    length: 0,
    issues: [] as string[],
  };

  const metaDescription = article.meta_description?.trim() || '';
  result.length = metaDescription.length;

  // Check if exists
  if (!metaDescription) {
    result.issues.push('Meta description is missing');
    return result;
  }

  // Check length (ideal: 150-160 characters)
  if (metaDescription.length < 120) {
    result.issues.push('Meta description is too short (aim for 150-160 characters)');
  } else if (metaDescription.length > 160) {
    result.issues.push('Meta description is too long (aim for 150-160 characters)');
  }

  // Check if keyword is present
  const keyword = article.primary_keyword
    ?.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
  if (keyword && keyword.length > 3) {
    const descLower = metaDescription.toLowerCase();
    const keywordVariations = keyword.split(/\s+/);
    const hasKeyword = keywordVariations.some(word => word.length > 3 && descLower.includes(word));

    if (!hasKeyword) {
      result.issues.push('Meta description should include the primary keyword');
    }
  }

  // Calculate score
  let score = 100;

  // Length penalties
  if (metaDescription.length < 120) score -= 30;
  else if (metaDescription.length > 160) score -= 20;
  else if (metaDescription.length >= 150 && metaDescription.length <= 160) score += 10;

  // Keyword penalty
  if (keyword && keyword.length > 3) {
    const keywordVariations = keyword.split(/\s+/);
    const hasKeyword = keywordVariations.some(
      word => word.length > 3 && metaDescription.toLowerCase().includes(word)
    );
    if (!hasKeyword) score -= 20;
  }

  result.score = Math.max(0, Math.min(100, score));

  return result;
}

/**
 * Calculate title SEO score
 * @param title - Article title
 * @param keyword - Primary keyword
 * @returns Score (0-100) and issues
 */
export function calculateTitleScore(
  title: string | null,
  keyword: string
): {
  score: number;
  length: number;
  hasKeyword: boolean;
  issues: string[];
} {
  const result = {
    score: 0,
    length: 0,
    hasKeyword: false,
    issues: [] as string[],
  };

  const titleText = title?.trim() || '';
  result.length = titleText.length;

  // Check if exists
  if (!titleText) {
    result.issues.push('Title is missing');
    return result;
  }

  // Check length (ideal: 50-60 characters)
  if (titleText.length < 30) {
    result.issues.push('Title is too short (aim for 50-60 characters)');
  } else if (titleText.length > 60) {
    result.issues.push('Title is too long (aim for 50-60 characters)');
  }

  // Check if keyword is present
  if (keyword) {
    const cleanKeyword = keyword
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    const titleLower = titleText.toLowerCase();
    const keywordVariations = cleanKeyword.split(/\s+/);

    result.hasKeyword = keywordVariations.some(
      word => word.length > 3 && titleLower.includes(word)
    );

    if (!result.hasKeyword && cleanKeyword.length > 3) {
      result.issues.push('Title should include the primary keyword');
    }
  }

  // Calculate score
  let score = 100;

  // Length penalties
  if (titleText.length < 30) score -= 30;
  else if (titleText.length > 60) score -= 20;
  else if (titleText.length >= 50 && titleText.length <= 60) score += 10;

  // Keyword penalty
  if (keyword && keyword.length > 3 && !result.hasKeyword) {
    score -= 40;
  }

  result.score = Math.max(0, Math.min(100, score));

  return result;
}

/**
 * Calculate overall SEO score for an article
 * @param article - Article object with all necessary fields
 * @returns Overall SEO score (0-100) and detailed metrics
 */
export function calculateOverallSEOScore(
  article: Pick<
    IArticle,
    'title' | 'content' | 'primary_keyword' | 'meta_description' | 'word_count'
  >
): ISEOScoreResult {
  const metrics: ISEOMetrics = {
    keywordDensity: {
      score: 0,
      density: 0,
      issues: [],
    },
    headingStructure: {
      score: 0,
      analysis: {
        hasH1: false,
        h1Count: 0,
        h2Count: 0,
        h3Count: 0,
        hasProperHierarchy: false,
        issues: [],
      },
    },
    wordCount: {
      score: 0,
      count: 0,
      issues: [],
    },
    metaDescription: {
      score: 0,
      length: 0,
      issues: [],
    },
    title: {
      score: 0,
      length: 0,
      hasKeyword: false,
      issues: [],
    },
  };

  // 1. Keyword Density (weight: 20%)
  if (article.content && article.primary_keyword) {
    const density = calculateKeywordDensity(article.content, article.primary_keyword);
    metrics.keywordDensity.density = density;

    // Ideal density: 1-2%
    if (density >= 1 && density <= 2) {
      metrics.keywordDensity.score = 100;
    } else if (density >= 0.5 && density < 1) {
      metrics.keywordDensity.score = 70;
      metrics.keywordDensity.issues.push('Keyword density is slightly low (aim for 1-2%)');
    } else if (density > 2 && density <= 3) {
      metrics.keywordDensity.score = 70;
      metrics.keywordDensity.issues.push('Keyword density is slightly high (aim for 1-2%)');
    } else if (density > 3) {
      metrics.keywordDensity.score = 40;
      metrics.keywordDensity.issues.push(
        'Keyword density is too high (may appear as keyword stuffing)'
      );
    } else {
      metrics.keywordDensity.score = 50;
      metrics.keywordDensity.issues.push('Keyword density is below optimal (aim for 1-2%)');
    }
  } else {
    metrics.keywordDensity.score = 0;
    metrics.keywordDensity.issues.push('Cannot calculate: missing content or keyword');
  }

  // 2. Heading Structure (weight: 20%)
  if (article.content) {
    const headingAnalysis = analyzeHeadingStructure(article.content);
    metrics.headingStructure.analysis = headingAnalysis;

    let headingScore = 100;
    if (!headingAnalysis.hasH1) headingScore -= 40;
    if (headingAnalysis.h1Count > 1) headingScore -= 20;
    if (headingAnalysis.h2Count === 0) headingScore -= 30;
    if (!headingAnalysis.hasProperHierarchy) headingScore -= 20;

    metrics.headingStructure.score = Math.max(0, headingScore);
  }

  // 3. Word Count (weight: 20%)
  const wordCount = article.word_count || (article.content ? getWordCount(article.content) : 0);
  metrics.wordCount.count = wordCount;

  if (wordCount >= 1500) {
    metrics.wordCount.score = 100;
  } else if (wordCount >= 1000) {
    metrics.wordCount.score = 85;
  } else if (wordCount >= 750) {
    metrics.wordCount.score = 70;
    metrics.wordCount.issues.push('Article could benefit from more depth (aim for 1000+ words)');
  } else if (wordCount >= 500) {
    metrics.wordCount.score = 50;
    metrics.wordCount.issues.push(
      'Article is too short for comprehensive coverage (aim for 1000+ words)'
    );
  } else if (wordCount > 0) {
    metrics.wordCount.score = 30;
    metrics.wordCount.issues.push('Article is very short (aim for at least 750 words)');
  } else {
    metrics.wordCount.score = 0;
    metrics.wordCount.issues.push('No word count data available');
  }

  // 4. Meta Description (weight: 20%)
  const metaCheck = checkMetaDescription({
    meta_description: article.meta_description,
    primary_keyword: article.primary_keyword,
  });
  metrics.metaDescription = metaCheck;

  // 5. Title (weight: 20%)
  const titleCheck = calculateTitleScore(article.title, article.primary_keyword);
  metrics.title = titleCheck;

  // Calculate overall weighted score
  const overallScore = Math.round(
    metrics.keywordDensity.score * 0.2 +
      metrics.headingStructure.score * 0.2 +
      metrics.wordCount.score * 0.2 +
      metrics.metaDescription.score * 0.2 +
      metrics.title.score * 0.2
  );

  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  else grade = 'F';

  return {
    overallScore,
    metrics,
    grade,
  };
}

/**
 * Get color class for SEO score
 * @param score - SEO score (0-100)
 * @returns Tailwind color class
 */
export function getSEOScoreColor(score: number): string {
  if (score >= 80) return 'text-brand-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get background color class for SEO score
 * @param score - SEO score (0-100)
 * @returns Tailwind background color class
 */
export function getSEOScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-brand-500/10';
  if (score >= 60) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

/**
 * Get border color class for SEO score
 * @param score - SEO score (0-100)
 * @returns Tailwind border color class
 */
export function getSEOScoreBorderColor(score: number): string {
  if (score >= 80) return 'border-brand-500/30';
  if (score >= 60) return 'border-yellow-500/30';
  return 'border-red-500/30';
}
