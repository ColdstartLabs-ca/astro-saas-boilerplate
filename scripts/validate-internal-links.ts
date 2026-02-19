#!/usr/bin/env tsx

/**
 * Internal Link Validator for pSEO Data Files
 *
 * Validates related* arrays in pSEO content files.
 * This is a fast, data-only validation (no HTTP calls).
 *
 * Usage:
 *   yarn tsx scripts/validate-internal-links.ts
 */

import fs from 'node:fs';
import path from 'node:path';

type CategoryKey = 'tools' | 'comparisons' | 'alternatives' | 'use-cases';

interface ICategoryConfig {
  key: CategoryKey;
  fileName: string;
  relationField: string;
}

interface IValidationIssue {
  category: CategoryKey;
  fileName: string;
  pageSlug: string;
  field: string;
  invalidReferences: string[];
}

interface IDataFile {
  pages?: Record<string, unknown>[];
}

const DATA_DIR = path.join(process.cwd(), 'content');

const CATEGORY_CONFIGS: ICategoryConfig[] = [
  { key: 'tools', fileName: 'tools-data.json', relationField: 'relatedTools' },
  { key: 'comparisons', fileName: 'comparisons-data.json', relationField: 'relatedComparisons' },
  { key: 'alternatives', fileName: 'alternatives-data.json', relationField: 'relatedAlternatives' },
  { key: 'use-cases', fileName: 'use-cases-data.json', relationField: 'relatedUseCases' },
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function loadDataFile(fileName: string): IDataFile | null {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  Missing file: content/${fileName}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as IDataFile;
  } catch (error) {
    console.warn(`  ⚠️  Invalid JSON in content/${fileName}: ${error}`);
    return null;
  }
}

function validateCategory(config: ICategoryConfig): IValidationIssue[] {
  const data = loadDataFile(config.fileName);
  if (!data || !Array.isArray(data.pages)) {
    return [];
  }

  const validSlugs = new Set(data.pages.map(page => page.slug).filter(isNonEmptyString));

  const issues: IValidationIssue[] = [];

  for (const page of data.pages) {
    const pageSlug = isNonEmptyString(page.slug) ? page.slug : '(missing-slug)';
    const references = page[config.relationField];

    if (!Array.isArray(references) || references.length === 0) {
      continue;
    }

    const invalidReferences = references.filter(
      ref => !isNonEmptyString(ref) || !validSlugs.has(ref)
    ) as string[];

    if (invalidReferences.length > 0) {
      issues.push({
        category: config.key,
        fileName: config.fileName,
        pageSlug,
        field: config.relationField,
        invalidReferences,
      });
    }
  }

  return issues;
}

function main(): void {
  console.log('\n' + '='.repeat(70));
  console.log('              INTERNAL LINK VALIDATION REPORT');
  console.log('='.repeat(70));
  console.log(`\n🔍 Validating data files in: ${DATA_DIR}\n`);

  const allIssues = CATEGORY_CONFIGS.flatMap(validateCategory);

  console.log('\n' + '='.repeat(70));
  console.log('                          SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nFiles checked: ${CATEGORY_CONFIGS.length}`);
  console.log(`Files with issues: ${new Set(allIssues.map(issue => issue.fileName)).size}`);
  console.log(`Total invalid references: ${allIssues.length}\n`);

  if (allIssues.length === 0) {
    console.log('✅ All internal links validated successfully!\n');
    process.exit(0);
  }

  console.log('❌ INVALID REFERENCES FOUND:\n');
  for (const issue of allIssues) {
    console.log(`📄 content/${issue.fileName}`);
    console.log(`  Page: ${issue.pageSlug}`);
    console.log(`  Field: ${issue.field}`);
    console.log(`  Invalid: ${issue.invalidReferences.join(', ')}`);
    console.log('');
  }

  process.exit(1);
}

main();
