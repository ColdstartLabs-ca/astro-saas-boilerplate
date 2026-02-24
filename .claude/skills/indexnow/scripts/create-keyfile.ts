#!/usr/bin/env tsx
/**
 * IndexNow Key File Generator
 *
 * Run from project root:
 *   tsx .claude/skills/indexnow/scripts/create-keyfile.ts --generate
 *   tsx .claude/skills/indexnow/scripts/create-keyfile.ts <key>
 *
 * Creates public/{key}.txt for search engine ownership verification.
 * Accessible at: https://autopilotrank.com/{key}.txt
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { generateIndexNowKey, validateIndexNowKey } from '@lib/seo/indexnow';

const PUBLIC_DIR = resolve(process.cwd(), 'public');

function createKeyFile(key: string): void {
  if (!validateIndexNowKey(key)) {
    console.error('Invalid key format. Must be 8-128 chars, only a-z A-Z 0-9 hyphens.');
    process.exit(1);
  }

  const filePath = resolve(PUBLIC_DIR, `${key}.txt`);

  if (existsSync(filePath)) {
    console.warn(`Overwriting existing file: ${filePath}`);
  }

  writeFileSync(filePath, key, 'utf-8');
  console.log(`Created: ${filePath}`);
  console.log(`URL: https://autopilotrank.com/${key}.txt`);
  console.log(`\nAdd to .env.api:\n  INDEXNOW_KEY=${key}`);
}

async function main(): Promise<void> {
  const [arg] = process.argv.slice(2);

  if (!arg || arg === '--help') {
    console.log('Usage:');
    console.log('  tsx .claude/skills/indexnow/scripts/create-keyfile.ts --generate');
    console.log('  tsx .claude/skills/indexnow/scripts/create-keyfile.ts <key>');
    return;
  }

  if (arg === '--generate') {
    const key = generateIndexNowKey(32);
    console.log(`Generated key: ${key}\n`);
    createKeyFile(key);
  } else {
    createKeyFile(arg);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
