/**
 * Static SEO validation for all pSEO data files.
 * Runs as part of `yarn verify` to catch issues at development time.
 *
 * ERRORS (fail the build):
 *   - Missing required fields
 *   - Duplicate slugs
 *   - Slug not URL-safe
 *   - metaTitle > 60 chars
 *   - metaDescription not in 150–160 chars
 *
 * WARNINGS (print but don't fail):
 *   - Primary keyword not in first 50 chars of metaDescription
 */

import { readFileSync } from 'fs';
import { join } from 'path';

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

function slugIsUrlSafe(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

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
