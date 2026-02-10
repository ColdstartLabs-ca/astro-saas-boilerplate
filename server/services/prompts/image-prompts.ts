/**
 * Image Generation Prompt Templates
 *
 * System prompts for generating contextual image prompts
 * based on article section content.
 */

/**
 * Image marker extracted from article markdown
 */
export interface IImageMarker {
  position: number;
  sectionContext: string;
}

/**
 * Generate the system prompt for creating image generation prompts.
 *
 * @param markers - Array of image markers with section context
 * @param keyword - The primary keyword for the article
 * @param presetDescription - Description of the image preset style
 * @returns System prompt for generating image prompts
 */
export function getImagePromptsGenerationPrompt(
  markers: IImageMarker[],
  keyword: string,
  presetDescription: string
): string {
  const sections = markers
    .map((m, i) => `${i + 1}. ${m.sectionContext}`)
    .join('\n');

  return `You are an expert at writing image generation prompts for blog articles.
For each section context below, write a concise, vivid image prompt (1-2 sentences).
The images should match this style: ${presetDescription}.
The article topic is: ${keyword}.

Sections:
${sections}

Guidelines:
- Each prompt should be 1-2 sentences maximum
- Focus on visual elements: objects, setting, mood, lighting
- Include stylistic guidance that matches the preset description
- Avoid text overlays, logos, or words in the image
- Keep subjects generic (no specific brands or trademarked characters)
- Make prompts specific enough to generate quality images

Respond with ONLY a JSON object containing a "prompts" key with an array of prompt strings, one per section.
Example: {"prompts": ["prompt 1", "prompt 2", "prompt 3"]}`;
}

/**
 * Fallback prompt when LLM prompt generation fails
 */
export function getFallbackImagePrompt(keyword: string, sectionContext: string): string {
  return `Professional blog article image about ${keyword}. ${sectionContext}. Clean composition, good lighting, high quality.`;
}
