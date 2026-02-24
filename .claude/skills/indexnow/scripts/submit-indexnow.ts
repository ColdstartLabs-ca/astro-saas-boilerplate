#!/usr/bin/env tsx
/**
 * IndexNow Batch Submission Script
 *
 * Run from project root:
 *   tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --status
 *   tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --single <url>
 *   tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --csv ./urls.csv
 *   tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --generate-key
 *
 * Environment variables:
 *   INDEXNOW_KEY - Your IndexNow API key (set in .env.api)
 */

import { readFileSync } from 'fs';
import {
  submitUrl,
  submitFromCSV,
  getSubmissionStatus,
  generateIndexNowKey,
} from '@lib/seo/indexnow';

// =============================================================================
// CLI
// =============================================================================

interface ICLIArgs {
  single?: string;
  status?: boolean;
  generateKey?: boolean;
  csvPath?: string;
}

function parseArgs(): ICLIArgs {
  const args = process.argv.slice(2);
  const result: ICLIArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--single':
        result.single = args[++i];
        break;
      case '--status':
        result.status = true;
        break;
      case '--generate-key':
        result.generateKey = true;
        break;
      case '--csv':
        result.csvPath = args[++i];
        break;
      default:
        if (arg && arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return result;
}

function printUsage(): void {
  console.log(`
IndexNow Submission Tool

Usage (run from project root):
  tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --status
  tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --generate-key
  tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --single <url>
  tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --csv ./urls.csv

Environment: INDEXNOW_KEY must be set in .env.api
`);
}

// =============================================================================
// Handlers
// =============================================================================

async function handleStatus(): Promise<void> {
  const status = await getSubmissionStatus();
  console.log('IndexNow Status:');
  console.log(`  Enabled:      ${status.isEnabled ? 'Yes' : 'No'}`);
  console.log(`  Key Location: ${status.keyLocation || 'Not configured'}`);
  if (!status.isEnabled) {
    console.log('\n  Set INDEXNOW_KEY in .env.api, then run:');
    console.log('  tsx .claude/skills/indexnow/scripts/create-keyfile.ts --generate');
  }
}

async function handleGenerateKey(): Promise<void> {
  const key = generateIndexNowKey(32);
  console.log(`Generated key: ${key}`);
  console.log(`\nAdd to .env.api:\n  INDEXNOW_KEY=${key}`);
  console.log(`\nCreate verification file:\n  tsx .claude/skills/indexnow/scripts/create-keyfile.ts ${key}`);
}

async function handleSingleUrl(url: string): Promise<void> {
  console.log(`Submitting: ${url}`);
  const result = await submitUrl(url);
  if (result.success) {
    console.log(`  OK (${result.statusCode}) - ${result.timestamp}`);
  } else {
    console.error(`  FAILED: ${result.message}`);
    process.exit(1);
  }
}

async function handleCSV(csvPath: string): Promise<void> {
  let csvContent: string;
  try {
    csvContent = readFileSync(csvPath, 'utf-8');
  } catch (_error) {
    console.error(`Failed to read: ${csvPath}`);
    process.exit(1);
  }

  const result = await submitFromCSV(csvContent);
  if (result.success) {
    console.log(`Submitted ${result.urlCount} URLs - ${result.message}`);
  } else {
    console.error(`FAILED: ${result.message}`);
    process.exit(1);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (Object.keys(args).length === 0) {
    printUsage();
    return;
  }

  if (args.status) await handleStatus();
  else if (args.generateKey) await handleGenerateKey();
  else if (args.single) await handleSingleUrl(args.single);
  else if (args.csvPath) await handleCSV(args.csvPath);
  else printUsage();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
