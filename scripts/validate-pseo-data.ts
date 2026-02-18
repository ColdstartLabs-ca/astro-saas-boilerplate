#!/usr/bin/env tsx

/**
 * pSEO Data Validator
 *
 * Validates pSEO data integrity before build/deploy.
 *
 * Checks:
 * 1. Required content files exist and parse as JSON
 * 2. Base fields and category-specific fields are present
 * 3. Slugs are unique and well-formed
 * 4. related* references point to existing slugs in the same category
 * 5. Optional HTTP route validation (with --curl)
 *
 * Usage:
 *   yarn tsx scripts/validate-pseo-data.ts
 *   yarn tsx scripts/validate-pseo-data.ts --verbose
 *   yarn tsx scripts/validate-pseo-data.ts --curl
 *   yarn tsx scripts/validate-pseo-data.ts --curl --base-url=http://localhost:4321
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type CategoryKey = 'tools' | 'comparisons' | 'alternatives' | 'use-cases';

interface ICategoryConfig {
  key: CategoryKey;
  fileName: string;
  routePrefix: string;
  relationField: string;
  requiredFields: string[];
}

interface IDataFile {
  pages?: Record<string, unknown>[];
}

interface IValidationIssue {
  category: CategoryKey | 'global';
  file: string;
  message: string;
  slug?: string;
}

interface IHttpIssue {
  category: CategoryKey;
  slug: string;
  url: string;
  status: number;
  message: string;
}

const CATEGORY_CONFIGS: ICategoryConfig[] = [
  {
    key: 'tools',
    fileName: 'tools-data.json',
    routePrefix: '/tools',
    relationField: 'relatedTools',
    requiredFields: [
      'toolName',
      'toolDescription',
      'componentName',
      'howToUse',
      'whyUseIt',
      'faqs',
    ],
  },
  {
    key: 'comparisons',
    fileName: 'comparisons-data.json',
    routePrefix: '/compare',
    relationField: 'relatedComparisons',
    requiredFields: [
      'competitorA',
      'competitorB',
      'competitorBSlug',
      'competitorBUrl',
      'verdict',
      'featureComparison',
      'pricingComparison',
      'prosConsUs',
      'prosConsThem',
      'faqs',
    ],
  },
  {
    key: 'alternatives',
    fileName: 'alternatives-data.json',
    routePrefix: '/alternative',
    relationField: 'relatedAlternatives',
    requiredFields: [
      'competitorName',
      'competitorSlug',
      'competitorUrl',
      'competitorPricing',
      'competitorWeaknesses',
      'ourAdvantages',
      'featureComparison',
      'heroSubtitle',
      'whySwitchReasons',
      'faqs',
    ],
  },
  {
    key: 'use-cases',
    fileName: 'use-cases-data.json',
    routePrefix: '/use-cases',
    relationField: 'relatedUseCases',
    requiredFields: [
      'industry',
      'painPoints',
      'solutionDescription',
      'benefits',
      'howItWorks',
      'faqs',
    ],
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'content');

const VERBOSE = process.argv.includes('--verbose');
const CURL_MODE = process.argv.includes('--curl');
const BASE_URL =
  process.argv.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:4321';
const REQUEST_TIMEOUT_MS = 10000;

const errors: IValidationIssue[] = [];
const warnings: IValidationIssue[] = [];
const httpIssues: IHttpIssue[] = [];

const pagesByCategory: Record<CategoryKey, Record<string, unknown>[]> = {
  tools: [],
  comparisons: [],
  alternatives: [],
  'use-cases': [],
};

const slugsByCategory: Record<CategoryKey, Set<string>> = {
  tools: new Set<string>(),
  comparisons: new Set<string>(),
  alternatives: new Set<string>(),
  'use-cases': new Set<string>(),
};

function log(message: string): void {
  console.log(message);
}

function logVerbose(message: string): void {
  if (VERBOSE) {
    console.log(`  ${message}`);
  }
}

function addError(issue: IValidationIssue): void {
  errors.push(issue);
}

function addWarning(issue: IValidationIssue): void {
  warnings.push(issue);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function validateBaseFields(
  page: Record<string, unknown>,
  file: string,
  category: CategoryKey
): void {
  const slug = page.slug;
  if (!isNonEmptyString(slug)) {
    addError({ category, file, message: 'Missing slug' });
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    addError({
      category,
      file,
      slug,
      message: `Invalid slug "${slug}" (must be lowercase alphanumeric with hyphens)`,
    });
  }

  for (const field of [
    'title',
    'metaTitle',
    'metaDescription',
    'h1',
    'primaryKeyword',
    'lastUpdated',
  ]) {
    if (!isNonEmptyString(page[field])) {
      addError({
        category,
        file,
        slug: isNonEmptyString(slug) ? slug : undefined,
        message: `Missing required field "${field}"`,
      });
    }
  }

  if (!isStringArray(page.secondaryKeywords) || page.secondaryKeywords.length === 0) {
    addWarning({
      category,
      file,
      slug: isNonEmptyString(slug) ? slug : undefined,
      message: 'secondaryKeywords should be a non-empty string array',
    });
  }

  if (isNonEmptyString(page.metaTitle) && page.metaTitle.length > 60) {
    addWarning({
      category,
      file,
      slug: isNonEmptyString(slug) ? slug : undefined,
      message: `metaTitle is long (${page.metaTitle.length} chars)`,
    });
  }

  if (isNonEmptyString(page.metaDescription) && page.metaDescription.length > 160) {
    addWarning({
      category,
      file,
      slug: isNonEmptyString(slug) ? slug : undefined,
      message: `metaDescription is long (${page.metaDescription.length} chars)`,
    });
  }
}

function validateCategoryFields(
  page: Record<string, unknown>,
  config: ICategoryConfig,
  file: string
): void {
  const slug = isNonEmptyString(page.slug) ? page.slug : undefined;

  for (const field of config.requiredFields) {
    const value = page[field];
    const isArrayField = Array.isArray(value);
    const isObjectField = typeof value === 'object' && value !== null;

    if (!isNonEmptyString(value) && !isArrayField && !isObjectField) {
      addError({
        category: config.key,
        file,
        slug,
        message: `Missing required field "${field}"`,
      });
    }
  }

  const relationValue = page[config.relationField];
  if (!Array.isArray(relationValue)) {
    addWarning({
      category: config.key,
      file,
      slug,
      message: `${config.relationField} should be an array`,
    });
    return;
  }

  for (const relatedSlug of relationValue) {
    if (!isNonEmptyString(relatedSlug)) {
      addError({
        category: config.key,
        file,
        slug,
        message: `${config.relationField} contains a non-string entry`,
      });
      continue;
    }

    if (!/^[a-z0-9-]+$/.test(relatedSlug)) {
      addError({
        category: config.key,
        file,
        slug,
        message: `${config.relationField} contains invalid slug "${relatedSlug}"`,
      });
    }
  }
}

function loadDataFile(config: ICategoryConfig): void {
  const filePath = path.join(DATA_DIR, config.fileName);
  const fileLabel = path.join('content', config.fileName);

  if (!fs.existsSync(filePath)) {
    addError({
      category: config.key,
      file: fileLabel,
      message: 'Data file not found',
    });
    return;
  }

  log(`📄 Validating ${fileLabel}...`);

  let data: IDataFile;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as IDataFile;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addError({
      category: config.key,
      file: fileLabel,
      message: `Invalid JSON: ${message}`,
    });
    return;
  }

  if (!Array.isArray(data.pages)) {
    addError({
      category: config.key,
      file: fileLabel,
      message: 'Missing "pages" array',
    });
    return;
  }

  pagesByCategory[config.key] = data.pages;
  const localSlugSet = new Set<string>();

  for (const page of data.pages) {
    validateBaseFields(page, fileLabel, config.key);
    validateCategoryFields(page, config, fileLabel);

    const slug = page.slug;
    if (!isNonEmptyString(slug)) continue;

    if (localSlugSet.has(slug)) {
      addError({
        category: config.key,
        file: fileLabel,
        slug,
        message: `Duplicate slug "${slug}"`,
      });
      continue;
    }

    localSlugSet.add(slug);
    slugsByCategory[config.key].add(slug);
  }

  logVerbose(`Found ${data.pages.length} pages, ${localSlugSet.size} unique slugs`);
}

function validateCrossReferences(): void {
  log('\n🔗 Validating related slug references...');

  for (const config of CATEGORY_CONFIGS) {
    const validSlugs = slugsByCategory[config.key];
    const pages = pagesByCategory[config.key];
    const fileLabel = path.join('content', config.fileName);

    for (const page of pages) {
      const pageSlug = isNonEmptyString(page.slug) ? page.slug : '(missing-slug)';
      const related = page[config.relationField];

      if (!Array.isArray(related)) continue;

      for (const ref of related) {
        if (!isNonEmptyString(ref)) continue;

        if (!validSlugs.has(ref)) {
          addError({
            category: config.key,
            file: fileLabel,
            slug: pageSlug,
            message: `${config.relationField} references unknown slug "${ref}"`,
          });
        }
      }
    }
  }
}

async function validateHttpRoutes(): Promise<void> {
  log(`\n🌐 Running HTTP checks against ${BASE_URL}...`);

  for (const config of CATEGORY_CONFIGS) {
    for (const page of pagesByCategory[config.key]) {
      const slug = page.slug;
      if (!isNonEmptyString(slug)) continue;

      const url = new URL(`${config.routePrefix}/${slug}`, BASE_URL).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, { method: 'GET', signal: controller.signal });
        if (response.status >= 400) {
          httpIssues.push({
            category: config.key,
            slug,
            url,
            status: response.status,
            message: `HTTP ${response.status}`,
          });
        } else {
          logVerbose(`✓ ${url} -> ${response.status}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        httpIssues.push({
          category: config.key,
          slug,
          url,
          status: 0,
          message,
        });
      } finally {
        clearTimeout(timeout);
      }
    }
  }
}

function printIssues(label: string, issues: IValidationIssue[]): void {
  if (issues.length === 0) return;

  log(`\n${label} (${issues.length}):`);
  for (const issue of issues) {
    const slugPart = issue.slug ? ` [${issue.slug}]` : '';
    log(`  - ${issue.file}${slugPart}: ${issue.message}`);
  }
}

function printHttpIssues(): void {
  if (httpIssues.length === 0) return;

  log(`\nHTTP issues (${httpIssues.length}):`);
  for (const issue of httpIssues) {
    log(`  - [${issue.category}] ${issue.slug} -> ${issue.url} (${issue.message})`);
  }
}

async function main(): Promise<void> {
  log('\n' + '='.repeat(70));
  log('                  PSEO DATA VALIDATION REPORT');
  log('='.repeat(70));

  for (const config of CATEGORY_CONFIGS) {
    loadDataFile(config);
  }

  validateCrossReferences();

  if (CURL_MODE) {
    await validateHttpRoutes();
  }

  log('\n' + '='.repeat(70));
  log('                          SUMMARY');
  log('='.repeat(70));
  log(`\nFiles checked: ${CATEGORY_CONFIGS.length}`);
  log(`Errors: ${errors.length}`);
  log(`Warnings: ${warnings.length}`);
  if (CURL_MODE) {
    log(`HTTP issues: ${httpIssues.length}`);
  }

  printIssues('Errors', errors);
  printIssues('Warnings', warnings);
  printHttpIssues();

  if (errors.length > 0 || httpIssues.length > 0) {
    log('\n❌ pSEO data validation failed.\n');
    process.exit(1);
  }

  log('\n✅ pSEO data validation passed.\n');
}

void main();
