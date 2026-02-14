/**
 * HTML to Notion Blocks Converter
 *
 * Converts HTML content to Notion's block format for page creation.
 * Handles headings, paragraphs, lists, blockquotes, code blocks, images,
 * and inline formatting (bold, italic, links).
 *
 * @see https://developers.notion.com/reference/block
 */

/**
 * Notion rich text annotation types
 */
interface INotionAnnotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: string;
}

/**
 * Notion rich text link object
 */
interface INotionLink {
  url: string;
}

/**
 * Notion rich text content
 */
interface INotionTextContent {
  content: string;
  link?: INotionLink | null;
}

/**
 * Notion rich text item
 */
interface INotionRichText {
  type: 'text';
  text: INotionTextContent;
  annotations: INotionAnnotations;
  plain_text?: string;
  href?: string | null;
}

/**
 * Base Notion block structure
 */
interface INotionBlockBase {
  object: 'block';
  type: string;
}

/**
 * Notion paragraph block
 */
interface INotionParagraphBlock extends INotionBlockBase {
  type: 'paragraph';
  paragraph: {
    rich_text: INotionRichText[];
    color?: string;
  };
}

/**
 * Notion heading block (h1, h2, h3)
 */
interface INotionHeadingBlock extends INotionBlockBase {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  heading_1?: {
    rich_text: INotionRichText[];
    color?: string;
    is_toggleable?: boolean;
  };
  heading_2?: {
    rich_text: INotionRichText[];
    color?: string;
    is_toggleable?: boolean;
  };
  heading_3?: {
    rich_text: INotionRichText[];
    color?: string;
    is_toggleable?: boolean;
  };
}

/**
 * Notion bulleted list item block
 */
interface INotionBulletedListItemBlock extends INotionBlockBase {
  type: 'bulleted_list_item';
  bulleted_list_item: {
    rich_text: INotionRichText[];
    color?: string;
  };
}

/**
 * Notion numbered list item block
 */
interface INotionNumberedListItemBlock extends INotionBlockBase {
  type: 'numbered_list_item';
  numbered_list_item: {
    rich_text: INotionRichText[];
    color?: string;
  };
}

/**
 * Notion quote block
 */
interface INotionQuoteBlock extends INotionBlockBase {
  type: 'quote';
  quote: {
    rich_text: INotionRichText[];
    color?: string;
  };
}

/**
 * Notion code block
 */
interface INotionCodeBlock extends INotionBlockBase {
  type: 'code';
  code: {
    rich_text: INotionRichText[];
    language: string;
    caption?: INotionRichText[];
  };
}

/**
 * Notion image block
 */
interface INotionImageBlock extends INotionBlockBase {
  type: 'image';
  image: {
    type: 'external';
    external: {
      url: string;
    };
    caption?: INotionRichText[];
  };
}

/**
 * Union type for all supported Notion block types
 */
type INotionBlock =
  | INotionParagraphBlock
  | INotionHeadingBlock
  | INotionBulletedListItemBlock
  | INotionNumberedListItemBlock
  | INotionQuoteBlock
  | INotionCodeBlock
  | INotionImageBlock;

/**
 * Default annotations for rich text
 */
const DEFAULT_ANNOTATIONS: INotionAnnotations = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: 'default',
};

/**
 * Maximum content length for a single rich text item (Notion limit)
 */
const MAX_RICH_TEXT_LENGTH = 2000;

/**
 * Truncate text to Notion's maximum length
 */
function truncateToMaxLength(text: string): string {
  if (text.length <= MAX_RICH_TEXT_LENGTH) {
    return text;
  }
  return text.substring(0, MAX_RICH_TEXT_LENGTH);
}

/**
 * Create a Notion rich text object
 */
function createRichText(
  content: string,
  annotations: Partial<INotionAnnotations> = {},
  link?: INotionLink | null
): INotionRichText {
  const truncatedContent = truncateToMaxLength(content);
  return {
    type: 'text',
    text: {
      content: truncatedContent,
      link: link || null,
    },
    annotations: {
      ...DEFAULT_ANNOTATIONS,
      ...annotations,
    },
    plain_text: truncatedContent,
    href: link?.url || null,
  };
}

/**
 * Parse inline HTML content and convert to Notion rich text array
 * Handles nested tags like <strong>, <em>, <a>, <code>
 */
function parseInlineContent(
  node: Node,
  annotations: Partial<INotionAnnotations> = {},
  link?: INotionLink
): INotionRichText[] {
  const results: INotionRichText[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (text) {
      results.push(createRichText(text, annotations, link));
    }
    return results;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return results;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  // Handle inline formatting tags
  switch (tagName) {
    case 'strong':
    case 'b': {
      const newAnnotations = { ...annotations, bold: true };
      for (const child of Array.from(element.childNodes)) {
        results.push(...parseInlineContent(child, newAnnotations));
      }
      break;
    }
    case 'em':
    case 'i': {
      const newAnnotations = { ...annotations, italic: true };
      for (const child of Array.from(element.childNodes)) {
        results.push(...parseInlineContent(child, newAnnotations));
      }
      break;
    }
    case 'code': {
      const newAnnotations = { ...annotations, code: true };
      for (const child of Array.from(element.childNodes)) {
        results.push(...parseInlineContent(child, newAnnotations));
      }
      break;
    }
    case 'a': {
      const href = element.getAttribute('href');
      const link: INotionLink | undefined = href ? { url: href } : undefined;
      for (const child of Array.from(element.childNodes)) {
        results.push(...parseInlineContent(child, annotations, link));
      }
      break;
    }
    case 'br': {
      // Notion doesn't support line breaks in rich_text the same way
      // We'll skip them as they should be separate blocks
      break;
    }
    default: {
      // For other tags, just process children
      for (const child of Array.from(element.childNodes)) {
        results.push(...parseInlineContent(child, annotations));
      }
    }
  }

  return results;
}

/**
 * Get rich text from an element's inline content
 */
function getRichTextFromElement(element: Element): INotionRichText[] {
  const richText: INotionRichText[] = [];
  for (const child of Array.from(element.childNodes)) {
    richText.push(...parseInlineContent(child));
  }
  return richText;
}

/**
 * Create a paragraph block
 */
function createParagraphBlock(richText: INotionRichText[]): INotionParagraphBlock {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: richText.length > 0 ? richText : [createRichText('')],
    },
  };
}

/**
 * Create a heading block
 */
function createHeadingBlock(
  level: 1 | 2 | 3,
  richText: INotionRichText[]
): INotionHeadingBlock {
  const type = `heading_${level}` as const;
  const block: INotionHeadingBlock = {
    object: 'block',
    type,
    [type]: {
      rich_text: richText.length > 0 ? richText : [createRichText('')],
    },
  };
  return block;
}

/**
 * Create a bulleted list item block
 */
function createBulletedListItemBlock(richText: INotionRichText[]): INotionBulletedListItemBlock {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: richText.length > 0 ? richText : [createRichText('')],
    },
  };
}

/**
 * Create a numbered list item block
 */
function createNumberedListItemBlock(richText: INotionRichText[]): INotionNumberedListItemBlock {
  return {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: richText.length > 0 ? richText : [createRichText('')],
    },
  };
}

/**
 * Create a quote block
 */
function createQuoteBlock(richText: INotionRichText[]): INotionQuoteBlock {
  return {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: richText.length > 0 ? richText : [createRichText('')],
    },
  };
}

/**
 * Create a code block
 */
function createCodeBlock(code: string, language: string = 'plain text'): INotionCodeBlock {
  const truncatedCode = truncateToMaxLength(code);
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [createRichText(truncatedCode)],
      language: mapLanguage(language),
    },
  };
}

/**
 * Create an image block from external URL
 */
function createImageBlock(url: string, alt?: string): INotionImageBlock {
  const caption = alt ? [createRichText(alt)] : undefined;
  return {
    object: 'block',
    type: 'image',
    image: {
      type: 'external',
      external: { url },
      caption,
    },
  };
}

/**
 * Map common language names to Notion's supported language codes
 */
function mapLanguage(lang: string): string {
  const languageMap: Record<string, string> = {
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    python: 'python',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'c++',
    'c++': 'c++',
    'c#': 'c#',
    csharp: 'c#',
    ruby: 'ruby',
    rb: 'ruby',
    go: 'go',
    golang: 'go',
    rust: 'rust',
    php: 'php',
    swift: 'swift',
    kotlin: 'kotlin',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'css',
    sass: 'css',
    json: 'json',
    xml: 'markup',
    yaml: 'yaml',
    yml: 'yaml',
    markdown: 'markdown',
    md: 'markdown',
    shell: 'shell',
    bash: 'shell',
    sh: 'shell',
    plain: 'plain text',
    plaintext: 'plain text',
    text: 'plain text',
  };

  const normalized = lang.toLowerCase().trim();
  return languageMap[normalized] || 'plain text';
}

/**
 * Convert an HTML element to Notion blocks
 */
function elementToBlocks(element: Element): INotionBlock[] {
  const blocks: INotionBlock[] = [];
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'h1': {
      const richText = getRichTextFromElement(element);
      blocks.push(createHeadingBlock(1, richText));
      break;
    }
    case 'h2': {
      const richText = getRichTextFromElement(element);
      blocks.push(createHeadingBlock(2, richText));
      break;
    }
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      // Notion only supports h1-h3, map h4-h6 to h3
      const richText = getRichTextFromElement(element);
      blocks.push(createHeadingBlock(3, richText));
      break;
    }
    case 'p': {
      const richText = getRichTextFromElement(element);
      blocks.push(createParagraphBlock(richText));
      break;
    }
    case 'blockquote': {
      const richText = getRichTextFromElement(element);
      blocks.push(createQuoteBlock(richText));
      break;
    }
    case 'pre': {
      // Code block - look for code element inside
      const codeElement = element.querySelector('code');
      const codeText = codeElement?.textContent || element.textContent || '';
      // Try to get language from class (e.g., class="language-javascript")
      const codeClass = codeElement?.className || '';
      const langMatch = codeClass.match(/language-(\w+)/);
      const language = langMatch ? langMatch[1] : 'plain text';
      blocks.push(createCodeBlock(codeText, language));
      break;
    }
    case 'code': {
      // Inline code that's not inside pre - skip as it's handled in inline parsing
      break;
    }
    case 'ul': {
      // Process all li children
      const listItems = element.querySelectorAll(':scope > li');
      listItems.forEach(li => {
        const richText = getRichTextFromElement(li);
        blocks.push(createBulletedListItemBlock(richText));
      });
      break;
    }
    case 'ol': {
      // Process all li children
      const listItems = element.querySelectorAll(':scope > li');
      listItems.forEach(li => {
        const richText = getRichTextFromElement(li);
        blocks.push(createNumberedListItemBlock(richText));
      });
      break;
    }
    case 'img': {
      const src = element.getAttribute('src');
      const alt = element.getAttribute('alt') || '';
      if (src) {
        blocks.push(createImageBlock(src, alt));
      }
      break;
    }
    case 'figure': {
      // Look for img inside figure
      const img = element.querySelector('img');
      if (img) {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        if (src) {
          blocks.push(createImageBlock(src, alt));
        }
      } else {
        // Process figure content as paragraph
        const richText = getRichTextFromElement(element);
        blocks.push(createParagraphBlock(richText));
      }
      break;
    }
    case 'div':
    case 'section':
    case 'article':
    case 'main':
    case 'header':
    case 'footer':
    case 'nav':
    case 'aside': {
      // Container elements - process children
      for (const child of Array.from(element.children)) {
        blocks.push(...elementToBlocks(child));
      }
      // Also process text nodes that might be direct children
      const textContent = Array.from(element.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent)
        .join('')
        .trim();
      if (textContent && element.children.length === 0) {
        blocks.push(createParagraphBlock([createRichText(textContent)]));
      }
      break;
    }
    case 'br': {
      // Line breaks are ignored in block-level conversion
      break;
    }
    case 'hr': {
      // Notion doesn't have a horizontal rule block
      // Could insert a divider-like paragraph, but we'll skip it
      break;
    }
    default: {
      // For unknown block elements, try to extract text content
      const richText = getRichTextFromElement(element);
      if (richText.some(rt => rt.text.content.trim())) {
        blocks.push(createParagraphBlock(richText));
      }
    }
  }

  return blocks;
}

/**
 * Convert HTML string to Notion blocks array
 *
 * @param html - HTML content string
 * @returns Array of Notion block objects
 *
 * @example
 * ```typescript
 * const blocks = htmlToNotionBlocks('<h1>Title</h1><p>Paragraph with <strong>bold</strong></p>');
 * // Returns array of heading_1 and paragraph blocks
 * ```
 */
export function htmlToNotionBlocks(html: string): INotionBlock[] {
  if (!html || typeof html !== 'string') {
    return [];
  }

  // Create a DOM parser (works in both browser and Cloudflare Workers)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const blocks: INotionBlock[] = [];

  // Process body children
  const body = doc.body;
  for (const child of Array.from(body.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      blocks.push(...elementToBlocks(child as Element));
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) {
        blocks.push(createParagraphBlock([createRichText(text)]));
      }
    }
  }

  return blocks;
}

/**
 * Convert HTML to Notion blocks with title property for page creation
 *
 * @param html - HTML content string
 * @param title - Page title
 * @returns Object with title property and children blocks
 */
export function htmlToNotionPageContent(
  html: string,
  title?: string
): { title: INotionRichText[]; children: INotionBlock[] } {
  const children = htmlToNotionBlocks(html);
  const titleRichText = title ? [createRichText(title)] : [];

  return {
    title: titleRichText,
    children,
  };
}

// Export types for consumers
export type {
  INotionBlock,
  INotionRichText,
  INotionAnnotations,
  INotionParagraphBlock,
  INotionHeadingBlock,
  INotionBulletedListItemBlock,
  INotionNumberedListItemBlock,
  INotionQuoteBlock,
  INotionCodeBlock,
  INotionImageBlock,
};
