/**
 * Article Generation Prompt Templates
 *
 * System prompts for the AI content generation pipeline.
 * Two-step process: outline generation → full article generation.
 */

import type { IArticleOutline, IArticleStylePreferences } from '@shared/types/article.types';
import type { IGscArticleContext } from '@shared/types/opportunity.types';
import { buildWritingGuidelinesPrompt } from '@shared/constants/writing-guidelines';
import { buildStrategyPrompt } from '@shared/config/opportunity.config';

/**
 * Generate the system prompt for outline generation.
 *
 * @param keyword - The primary keyword for the article
 * @param tone - Desired tone of the article
 * @param targetWordCount - Target word count for the final article
 * @param gscContext - Optional GSC context for GSC-aware article generation
 * @param stylePreferences - Optional style preferences from campaign settings
 * @returns System prompt for outline generation
 */
export function getOutlinePrompt(
  keyword: string,
  tone: string = 'professional',
  targetWordCount: number = 1500,
  gscContext?: IGscArticleContext,
  stylePreferences?: IArticleStylePreferences
): string {
  // Build GSC context section if provided
  const gscContextSection = gscContext
    ? `\n\n${buildStrategyPrompt(gscContext.articleStrategy, gscContext.metrics, gscContext.relatedQueries)}`
    : '';

  // Build style instructions if provided
  const styleSection = stylePreferences?.articleStyle
    ? `\n- Write this as a ${stylePreferences.articleStyle} article`
    : '';

  const emojiOverride = stylePreferences?.includeEmojis
    ? '\n- You may use emojis sparingly to enhance readability'
    : '';

  const customInstructionsSection = stylePreferences?.globalInstructions
    ? `\n\nCUSTOM INSTRUCTIONS:\n${stylePreferences.globalInstructions}`
    : '';

  return `You are an expert SEO content strategist. Generate a structured article outline for the given keyword.
The outline must be optimized for search engine ranking.${gscContextSection}

Requirements:
- Title: Compelling, keyword-rich, 50-60 characters
- Meta description: 150-160 characters, includes keyword
- Slug: URL-friendly, includes keyword (lowercase, hyphens instead of spaces)
- 4-8 sections with H2 headings
- Each section has 2-3 key points to cover
- Include an introduction section and conclusion
- Naturally incorporate the primary keyword "${keyword}" and related terms
- Target approximately ${targetWordCount} words for the final article
- Tone should be ${tone}${styleSection}${emojiOverride}${customInstructionsSection}

Respond with ONLY valid JSON matching this schema:
{
  "title": "Compelling article title",
  "metaDescription": "150-160 character description",
  "slug": "url-friendly-slug",
  "sections": [
    {
      "heading": "Section heading (H2)",
      "subheadings": ["Optional H3 subheading 1", "Optional H3 subheading 2"],
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
    }
  ]
}

The first section should be an introduction and the last section should be a conclusion.`;
}

/**
 * Build style preference instructions to append to an article prompt.
 */
function buildStylePreferencesSection(
  stylePreferences?: IArticleStylePreferences,
  internalLinks?: Array<{ title: string; url: string }>
): string {
  const lines: string[] = [];

  if (stylePreferences?.articleStyle) {
    lines.push(
      `- This is a ${stylePreferences.articleStyle} article. Structure and format accordingly.`
    );
  }

  if (stylePreferences?.includeCta) {
    lines.push('- Include a clear call-to-action section before the conclusion.');
  }

  if (stylePreferences?.includeYoutube) {
    lines.push(
      '- Where relevant, suggest embedding a YouTube video using `[YOUTUBE: search query]` markers (one per article maximum).'
    );
  }

  if (stylePreferences?.includeInfographics) {
    lines.push(
      '- Include data visualization suggestions using `[INFOGRAPHIC: brief description]` markers where they would add value.'
    );
  }

  if (stylePreferences?.includeEmojis) {
    lines.push('- Use emojis sparingly to enhance readability (override no-emoji rule).');
  }

  if (stylePreferences?.imageStyle) {
    lines.push(`- Preferred visual style for images: ${stylePreferences.imageStyle}.`);
  }

  const internalLinksCount = stylePreferences?.internalLinksCount ?? internalLinks?.length ?? 0;
  if (internalLinksCount > 0 && internalLinks && internalLinks.length > 0) {
    const linkList = internalLinks
      .slice(0, internalLinksCount)
      .map(link => `  - [${link.title}](${link.url})`)
      .join('\n');
    lines.push(
      `- INTERNAL LINKING: Include ${Math.min(internalLinksCount, internalLinks.length)} internal link(s) to related articles from the same site. Use markdown link syntax. Available articles:\n${linkList}`
    );
  }

  if (stylePreferences?.globalInstructions) {
    lines.push(`\nCUSTOM INSTRUCTIONS FROM THE USER:\n${stylePreferences.globalInstructions}`);
  }

  return lines.length > 0 ? `\n\nSTYLE PREFERENCES:\n${lines.join('\n')}` : '';
}

/**
 * Generate the system prompt for full article generation from outline.
 *
 * @param outline - The generated outline
 * @param tone - Desired tone of the article
 * @param targetWordCount - Target word count
 * @param imageCount - Number of images to include (optional, defaults to 0)
 * @param stylePreferences - Optional style preferences from campaign settings
 * @param internalLinks - Optional pre-fetched internal links to include
 * @returns System prompt for article generation
 */
export function getArticlePrompt(
  outline: IArticleOutline,
  tone: string = 'professional',
  targetWordCount: number = 1500,
  imageCount: number = 0,
  stylePreferences?: IArticleStylePreferences,
  internalLinks?: Array<{ title: string; url: string }>
): string {
  const writingGuidelines = buildWritingGuidelinesPrompt();
  const styleSection = buildStylePreferencesSection(stylePreferences, internalLinks);

  return `You are an expert SEO content writer. Write a comprehensive, well-researched article following the provided outline.

${writingGuidelines}

Requirements:
- Write in ${tone} tone
- Target approximately ${targetWordCount} words
- Use the EXACT headings from the outline as H2/H3 markdown headers (sentence case)
- Include the primary keyword naturally 3-5 times throughout the article
- Write engaging introductions and conclusions for each section
- Use short paragraphs (2-3 sentences) for better readability
- Include transition sentences between sections
- Write in markdown format with proper headers, bullet points, and emphasis
- Do NOT include the title as an H1 (it's handled separately)
- Make sure the content is valuable and informative, not filler${styleSection}${
    imageCount > 0
      ? `

IMAGE PLACEMENT:
You MUST include exactly ${imageCount} image markers in the article, placed where a visual would naturally enhance the content.
Use this exact format: [IMAGE:1], [IMAGE:2], [IMAGE:3] (numbered sequentially).

Rules:
- Place [IMAGE:1] after the introduction (this becomes the featured/hero image)
- Place [IMAGE:2] and [IMAGE:3] between sections, where a visual break helps readability
- Never place two markers next to each other
- Never place a marker inside a list, table, or code block
- Each marker should be on its own line, with a blank line before and after`
      : ''
  }

Outline to follow:
${JSON.stringify(outline, null, 2)}

Begin writing the article content now (start with the introduction section, no H1 title).`;
}

/**
 * Generate a fallback retry prompt for when the initial outline is malformed.
 *
 * @param keyword - The primary keyword
 * @returns Stricter prompt for outline generation
 */
export function getOutlineRetryPrompt(keyword: string): string {
  return `You are an expert SEO content strategist. Generate a structured article outline for the keyword "${keyword}".

CRITICAL: Respond with ONLY valid JSON. No markdown formatting, no code blocks, no explanation text.

Required JSON structure:
{
  "title": "Article title (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)",
  "slug": "url-friendly-slug-with-keyword",
  "sections": [
    {
      "heading": "Section H2 heading",
      "keyPoints": ["Point 1", "Point 2"]
    }
  ]
}

Requirements:
- 4-6 sections total (including introduction and conclusion)
- Each section has a heading and 2-3 key points
- Title includes the keyword "${keyword}"
- Meta description is 150-160 characters
- Slug is lowercase with hyphens

Output ONLY the JSON.`;
}

/**
 * Generate an article retry prompt that includes QA failure findings.
 * Used when the initial article fails QA pipeline checks (plagiarism, readability, AI detection).
 *
 * @param outline - The generated outline
 * @param tone - Desired tone of the article
 * @param targetWordCount - Target word count
 * @param imageCount - Number of images to include (optional, defaults to 0)
 * @param qaFindings - Human-readable summary of what QA checks failed and how to fix them
 * @param stylePreferences - Optional style preferences from campaign settings
 * @param internalLinks - Optional pre-fetched internal links to include
 * @returns System prompt for QA-guided article generation retry
 */
export function getArticleQARetryPrompt(
  outline: IArticleOutline,
  tone: string = 'professional',
  targetWordCount: number = 1500,
  imageCount: number = 0,
  qaFindings: string,
  stylePreferences?: IArticleStylePreferences,
  internalLinks?: Array<{ title: string; url: string }>
): string {
  const writingGuidelines = buildWritingGuidelinesPrompt();
  const styleSection = buildStylePreferencesSection(stylePreferences, internalLinks);

  return `You are an expert SEO content writer. A previous version of this article failed quality checks. Rewrite it to fix the specific issues listed below.

${writingGuidelines}

QUALITY ISSUES TO FIX:
${qaFindings}

Article Requirements:
- Write in ${tone} tone
- Target approximately ${targetWordCount} words
- Use the EXACT headings from the outline as H2/H3 markdown headers (sentence case)
- Include the primary keyword naturally 3-5 times throughout the article
- Write engaging introductions and conclusions for each section
- Use short paragraphs (2-3 sentences) for better readability
- Include transition sentences between sections
- Write in markdown format with proper headers, bullet points, and emphasis
- Do NOT include the title as an H1 (it's handled separately)
- Make sure the content is valuable and informative, not filler${styleSection}${
    imageCount > 0
      ? `

IMAGE PLACEMENT:
You MUST include exactly ${imageCount} image markers in the article, placed where a visual would naturally enhance the content.
Use this exact format: [IMAGE:1], [IMAGE:2], [IMAGE:3] (numbered sequentially).

Rules:
- Place [IMAGE:1] after the introduction (this becomes the featured/hero image)
- Place [IMAGE:2] and [IMAGE:3] between sections, where a visual break helps readability
- Never place two markers next to each other
- Never place a marker inside a list, table, or code block
- Each marker should be on its own line, with a blank line before and after`
      : ''
  }

Outline to follow:
${JSON.stringify(outline, null, 2)}

Write an improved article that addresses ALL the quality issues listed above. Begin with the introduction section (no H1 title).`;
}

/**
 * Generate a targeted QA fix prompt that edits existing content in-place.
 * Unlike the full QA retry prompt (which rewrites from an outline), this
 * prompt takes the existing article and applies targeted fixes to the
 * specific failing checks. Preserves structure and facts.
 *
 * @param existingContent - Current article markdown content
 * @param qaFindings - QA failure descriptions with actionable fix instructions
 */
export function getQAFixPrompt(existingContent: string, qaFindings: string): string {
  return `You are an expert SEO editor. The following article failed quality checks. Edit it to fix the specific issues listed, while preserving the article's structure, headings, key facts, and overall meaning.

QUALITY ISSUES TO FIX:
${qaFindings}

EDITING RULES:
- Keep ALL H2/H3 headings exactly as they are
- Preserve all factual content, data, and key points
- Do NOT add or remove major sections
- Fix readability: shorten long sentences, simplify vocabulary, prefer active voice
- Fix AI patterns: vary sentence length, add contractions, use concrete examples, add personal voice
- Fix originality: rephrase generic filler phrases ("it is important to", "plays a crucial role", etc.) in a unique way
- Keep all markdown formatting (headers, bold, lists)
- Do NOT include an H1 title (it is rendered separately)
- Return ONLY the revised article in markdown format with no preamble or explanation

ARTICLE TO FIX:
${existingContent}`;
}

/**
 * Generate a stricter article generation prompt for quality gate retry.
 *
 * @param outline - The generated outline
 * @param tone - Desired tone of the article
 * @param targetWordCount - Target word count
 * @param imageCount - Number of images to include (optional, defaults to 0)
 * @param stylePreferences - Optional style preferences from campaign settings
 * @param internalLinks - Optional pre-fetched internal links to include
 * @returns Stricter system prompt for article generation retry
 */
export function getArticleRetryPrompt(
  outline: IArticleOutline,
  tone: string = 'professional',
  targetWordCount: number = 1500,
  imageCount: number = 0,
  stylePreferences?: IArticleStylePreferences,
  internalLinks?: Array<{ title: string; url: string }>
): string {
  const writingGuidelines = buildWritingGuidelinesPrompt();
  const styleSection = buildStylePreferencesSection(stylePreferences, internalLinks);

  return `You are an expert SEO content writer. Write a comprehensive, well-researched article following the provided outline.

${writingGuidelines}

CRITICAL QUALITY REQUIREMENTS:
- You MUST write at least ${Math.floor(targetWordCount * 0.8)} words (minimum 80% of target ${targetWordCount})
- Use ALL the outline sections as H2 headings - do not skip any
- Write substantial content for each section (at least 150 words per section)
- Include a proper introduction and conclusion
- Do NOT truncate or cut off the article - it must be complete
- If you need more space, request it with the system, but DO NOT stop mid-sentence

Article Requirements:
- Write in ${tone} tone
- Use the EXACT headings from the outline as H2/H3 markdown headers (sentence case)
- Include the primary keyword naturally 3-5 times throughout the article
- Write engaging introductions and conclusions for each section
- Use short paragraphs (2-3 sentences) for better readability
- Include transition sentences between sections
- Write in markdown format with proper headers, bullet points, and emphasis
- Do NOT include the title as an H1 (it's handled separately)
- Make sure the content is valuable and informative, not filler${styleSection}${
    imageCount > 0
      ? `

IMAGE PLACEMENT:
You MUST include exactly ${imageCount} image markers in the article, placed where a visual would naturally enhance the content.
Use this exact format: [IMAGE:1], [IMAGE:2], [IMAGE:3] (numbered sequentially).

Rules:
- Place [IMAGE:1] after the introduction (this becomes the featured/hero image)
- Place [IMAGE:2] and [IMAGE:3] between sections, where a visual break helps readability
- Never place two markers next to each other
- Never place a marker inside a list, table, or code block
- Each marker should be on its own line, with a blank line before and after`
      : ''
  }

Outline to follow:
${JSON.stringify(outline, null, 2)}

Begin writing the COMPLETE article content now (start with the introduction section, no H1 title). DO NOT STOP until the article is complete with a proper conclusion.`;
}
