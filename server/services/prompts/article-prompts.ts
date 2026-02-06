/**
 * Article Generation Prompt Templates
 *
 * System prompts for the AI content generation pipeline.
 * Two-step process: outline generation → full article generation.
 */

import type { IArticleOutline } from '@shared/types/article.types';

/**
 * Generate the system prompt for outline generation.
 *
 * @param keyword - The primary keyword for the article
 * @param tone - Desired tone of the article
 * @param targetWordCount - Target word count for the final article
 * @returns System prompt for outline generation
 */
export function getOutlinePrompt(
  keyword: string,
  tone: string = 'professional',
  targetWordCount: number = 1500
): string {
  return `You are an expert SEO content strategist. Generate a structured article outline for the given keyword.
The outline must be optimized for search engine ranking.

Requirements:
- Title: Compelling, keyword-rich, 50-60 characters
- Meta description: 150-160 characters, includes keyword
- Slug: URL-friendly, includes keyword (lowercase, hyphens instead of spaces)
- 4-8 sections with H2 headings
- Each section has 2-3 key points to cover
- Include an introduction section and conclusion
- Naturally incorporate the primary keyword "${keyword}" and related terms
- Target approximately ${targetWordCount} words for the final article
- Tone should be ${tone}

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
 * Generate the system prompt for full article generation from outline.
 *
 * @param outline - The generated outline
 * @param tone - Desired tone of the article
 * @param targetWordCount - Target word count
 * @returns System prompt for article generation
 */
export function getArticlePrompt(
  outline: IArticleOutline,
  tone: string = 'professional',
  targetWordCount: number = 1500
): string {
  return `You are an expert SEO content writer. Write a comprehensive, well-researched article following the provided outline.

CRITICAL: Write naturally like a human, not like AI. Avoid common AI patterns:
- Vary sentence length (mix short, medium, long sentences)
- Use conversational transitions and natural language patterns
- Include occasional idioms, colloquialisms, and real-world examples
- Write with personality and voice - not generic "fluff"
- Avoid repetitive sentence structures (not every sentence should start with "Furthermore," "In addition," etc.)
- Include personal anecdotes, opinions, and subjective assessments where appropriate
- Use bold claims, contrarian takes, and interesting perspectives
- Make the content feel "lived-in" and authentic

Requirements:
- Write in ${tone} tone
- Target approximately ${targetWordCount} words
- Use the EXACT headings from the outline as H2/H3 markdown headers
- Include the primary keyword naturally 3-5 times throughout the article
- Write engaging introductions and conclusions for each section
- Use short paragraphs (2-3 sentences) for better readability
- Include transition sentences between sections
- Write in markdown format with proper headers, bullet points, and emphasis
- Do NOT include the title as an H1 (it's handled separately)
- Make sure the content is valuable and informative, not filler

Human-like writing techniques:
- Start some sentences with conjunctions ("But," "And," "So")
- Use rhetorical questions occasionally
- Include data, statistics, and specific examples
- Add personal opinions and takes
- Vary between declarative and interrogative sentences
- Use parenthetical asides for extra context
- Include unexpected insights and non-obvious conclusions
- Write as if you're having a conversation with the reader

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
