/**
 * Static SEO validation for:
 *   1. pSEO data files (JSON)
 *   2. Blog MDX files
 *
 * Runs as part of `yarn verify` to catch issues at development time.
 *
 * ERRORS (fail the build):
 *   - Missing required fields / frontmatter
 *   - Duplicate slugs
 *   - Slug not URL-safe
 *   - metaTitle / title > 60 chars
 *   - metaDescription / description not in 120–160 chars
 *   - Blog word count < 300 (thin content)
 *   - Blog missing H1 or multiple H1s
 *
 * WARNINGS (print but don't fail):
 *   - Primary keyword not in first 50 chars of metaDescription (pSEO)
 *   - Blog word count < 800
 *   - Blog title < 30 chars
 *   - Blog missing H2 headings
 *   - Blog missing tags
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname, basename } from 'path';

interface IPageEntry {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  primaryKeyword: string;
  [key: string]: unknown;
}

interface IDataFile {
  path: string;
  label: string;
}

const DATA_FILES: IDataFile[] = [
  { path: 'content/features-data.json', label: 'features' },
  { path: 'content/tools-data.json', label: 'tools' },
  { path: 'content/alternatives-data.json', label: 'alternatives' },
  { path: 'content/comparisons-data.json', label: 'comparisons' },
  { path: 'content/use-cases-data.json', label: 'use-cases' },
  { path: 'content/geo-data.json', label: 'geo' },
];

const ROOT = join(import.meta.dirname, '..');

const REQUIRED_FIELDS: (keyof IPageEntry)[] = [
  'slug',
  'metaTitle',
  'metaDescription',
  'h1',
  'primaryKeyword',
];

interface IIssue {
  file: string;
  slug: string;
  rule: string;
  detail: string;
}

// ─── Blog MDX constants ───────────────────────────────────────────────────────

const BLOG_DIR = 'content/blog';
const BLOG_REQUIRED_FRONTMATTER = ['title', 'description', 'date', 'author', 'image'] as const;
const BLOG_TITLE_MAX = 60;
const BLOG_TITLE_MIN = 30;
const BLOG_DESC_MIN = 120;
const BLOG_DESC_MAX = 160;
const BLOG_WORDS_ERROR = 300;
const BLOG_WORDS_WARN = 800;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugIsUrlSafe(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    meta[key] = value;
  }

  return { meta, body: match[2] };
}

function countWords(mdxBody: string): number {
  return mdxBody
    .replace(/```[\s\S]*?```/g, '') // fenced code blocks
    .replace(/`[^`]*`/g, '') // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → keep text
    .replace(/^#{1,6}\s+/gm, '') // heading markers
    .replace(/[*_~|>]/g, '') // emphasis / table / blockquote chars
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

// ─── Blog MDX validator ───────────────────────────────────────────────────────

function validateBlogMdx(): { errors: IIssue[]; warnings: IIssue[] } {
  const errors: IIssue[] = [];
  const warnings: IIssue[] = [];

  let files: string[];
  try {
    files = readdirSync(join(ROOT, BLOG_DIR)).filter(f => extname(f) === '.mdx');
  } catch {
    errors.push({ file: 'blog', slug: '(dir)', rule: 'read-dir', detail: `Cannot read ${BLOG_DIR}` });
    return { errors, warnings };
  }

  for (const filename of files) {
    const label = basename(filename, '.mdx');
    let content: string;
    try {
      content = readFileSync(join(ROOT, BLOG_DIR, filename), 'utf8');
    } catch {
      errors.push({ file: 'blog', slug: label, rule: 'read-file', detail: `Cannot read ${filename}` });
      continue;
    }

    const { meta, body } = parseFrontmatter(content);

    // Required frontmatter
    for (const field of BLOG_REQUIRED_FRONTMATTER) {
      if (!meta[field]) {
        errors.push({ file: 'blog', slug: label, rule: 'required', detail: `Missing frontmatter: ${field}` });
      }
    }

    // title length
    if (meta.title) {
      const len = meta.title.length;
      if (len > BLOG_TITLE_MAX) {
        errors.push({ file: 'blog', slug: label, rule: 'title-length', detail: `title is ${len} chars (max ${BLOG_TITLE_MAX}): "${meta.title}"` });
      } else if (len < BLOG_TITLE_MIN) {
        warnings.push({ file: 'blog', slug: label, rule: 'title-length', detail: `title is ${len} chars — consider ${BLOG_TITLE_MIN}–${BLOG_TITLE_MAX} chars for best CTR: "${meta.title}"` });
      }
    }

    // description length
    if (meta.description) {
      const len = meta.description.length;
      if (len < BLOG_DESC_MIN || len > BLOG_DESC_MAX) {
        errors.push({ file: 'blog', slug: label, rule: 'desc-length', detail: `description is ${len} chars (must be ${BLOG_DESC_MIN}–${BLOG_DESC_MAX}): "${meta.description.slice(0, 60)}..."` });
      }
    }

    // Word count
    const wordCount = countWords(body);
    if (wordCount < BLOG_WORDS_ERROR) {
      errors.push({ file: 'blog', slug: label, rule: 'word-count', detail: `${wordCount} words — minimum is ${BLOG_WORDS_ERROR} (thin content)` });
    } else if (wordCount < BLOG_WORDS_WARN) {
      warnings.push({ file: 'blog', slug: label, rule: 'word-count', detail: `${wordCount} words — recommended minimum is ${BLOG_WORDS_WARN} for ranking` });
    }

    // H1 presence and uniqueness
    const h1Matches = body.match(/^# .+/gm) ?? [];
    if (h1Matches.length === 0) {
      errors.push({ file: 'blog', slug: label, rule: 'h1-missing', detail: 'No H1 heading found (# Heading)' });
    } else if (h1Matches.length > 1) {
      errors.push({ file: 'blog', slug: label, rule: 'h1-multiple', detail: `${h1Matches.length} H1 headings found — should have exactly one` });
    }

    // H2 presence (structure warning)
    const h2Count = (body.match(/^## .+/gm) ?? []).length;
    if (h2Count === 0) {
      warnings.push({ file: 'blog', slug: label, rule: 'h2-missing', detail: 'No H2 headings (## Heading) — poor content structure for SEO' });
    }

    // Tags
    const tagsValue = meta.tags ?? '';
    if (!tagsValue || tagsValue === '[]') {
      warnings.push({ file: 'blog', slug: label, rule: 'tags-missing', detail: 'No tags defined — add tags for content discovery' });
    }
  }

  return { errors, warnings };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function validate(): void {
  const errors: IIssue[] = [];
  const warnings: IIssue[] = [];
  const seenSlugs = new Map<string, string>();

  for (const { path, label } of DATA_FILES) {
    let data: { pages: IPageEntry[] };
    try {
      data = JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as { pages: IPageEntry[] };
    } catch {
      errors.push({
        file: label,
        slug: '(file)',
        rule: 'parse',
        detail: `Cannot read or parse ${path}`,
      });
      continue;
    }

    for (const page of data.pages) {
      const slug = page.slug ?? '(unknown)';

      // Required fields
      for (const field of REQUIRED_FIELDS) {
        if (!page[field]) {
          errors.push({
            file: label,
            slug,
            rule: 'required',
            detail: `Missing required field: ${field}`,
          });
        }
      }

      // Slug format
      if (slug !== '(unknown)' && !slugIsUrlSafe(slug)) {
        errors.push({
          file: label,
          slug,
          rule: 'slug-format',
          detail: `Slug must be lowercase, alphanumeric, hyphen-separated. Got: "${slug}"`,
        });
      }

      // Duplicate slugs (global, across all files)
      if (slug !== '(unknown)') {
        const existing = seenSlugs.get(slug);
        if (existing) {
          errors.push({
            file: label,
            slug,
            rule: 'duplicate-slug',
            detail: `Slug already exists in ${existing}`,
          });
        } else {
          seenSlugs.set(slug, `${label}/${slug}`);
        }
      }

      if (!page.metaTitle || !page.metaDescription || !page.primaryKeyword) continue;

      const titleLen = page.metaTitle.length;
      const descLen = page.metaDescription.length;

      // metaTitle ≤60 chars [ERROR]
      if (titleLen > 60) {
        errors.push({
          file: label,
          slug,
          rule: 'meta-title-length',
          detail: `metaTitle is ${titleLen} chars (max 60): "${page.metaTitle}"`,
        });
      }

      // metaDescription 150–160 chars [ERROR]
      if (descLen < 150 || descLen > 160) {
        errors.push({
          file: label,
          slug,
          rule: 'meta-desc-length',
          detail: `metaDescription is ${descLen} chars (must be 150–160): "${page.metaDescription.slice(0, 60)}..."`,
        });
      }

      // Primary keyword in first 50 chars of metaDescription [WARNING]
      const kwInFirst50 = page.metaDescription
        .slice(0, 50)
        .toLowerCase()
        .includes(page.primaryKeyword.toLowerCase());
      if (!kwInFirst50) {
        warnings.push({
          file: label,
          slug,
          rule: 'meta-desc-keyword',
          detail: `"${page.primaryKeyword}" not in first 50 chars. First 50: "${page.metaDescription.slice(0, 50)}"`,
        });
      }
    }
  }

  // Blog MDX validation
  const blog = validateBlogMdx();
  errors.push(...blog.errors);
  warnings.push(...blog.warnings);

  const hasErrors = errors.length > 0;

  if (warnings.length > 0) {
    console.warn(`\n⚠  SEO warnings (${warnings.length}):`);
    for (const w of warnings) {
      console.warn(`   [${w.file}/${w.slug}] ${w.rule}: ${w.detail}`);
    }
  }

  if (hasErrors) {
    console.error(
      `\n✖ SEO validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):\n`
    );
    for (const err of errors) {
      console.error(`  [${err.file}/${err.slug}] ${err.rule}: ${err.detail}`);
    }
    console.error('');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(
      `✓ SEO validation passed (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`
    );
  } else {
    console.log('✓ SEO validation passed');
  }
}

validate();
