/**
 * SaaS Boilerplate Brand Asset Generator
 *
 * Generates all PNG brand assets (favicons, OG images) from HTML/SVG templates
 * using Playwright. Loads Inter Black from Google Fonts for consistent rendering.
 *
 * Usage:
 *   npx tsx scripts/generate-brand-assets.ts
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap');`;

function ogImageHTML(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  ${FONT_IMPORT}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    background: transparent;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif;
  }
  .logo-row { display: flex; align-items: center; gap: 24px; }
  .logo-icon {
    width: 96px; height: 96px; border-radius: 22px;
    background: linear-gradient(145deg, #34d399 0%, #22c55e 35%, #16a34a 100%);
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
    box-shadow: 0 2px 8px rgba(22,163,74,0.25);
  }
  .logo-icon::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(170deg, rgba(255,255,255,0.28) 0%, transparent 50%);
    border-radius: 22px;
  }
  .logo-icon span {
    color: white; font-weight: 900; font-size: 42px;
    letter-spacing: -2px; line-height: 1;
    position: relative; z-index: 1;
    text-shadow: 0 1px 3px rgba(0,0,0,0.18);
  }
  .logo-text {
    font-size: 78px; font-weight: 800;
    color: #0f172a; letter-spacing: -3.5px;
  }
  .logo-text em { color: #16a34a; font-style: normal; }
</style>
</head><body>
  <div class="logo-row">
    <div class="logo-icon"><span>AR</span></div>
    <div class="logo-text">Autopilot<em>Rank</em></div>
  </div>
</body></html>`;
}

function faviconHTML(size: number): string {
  const r = Math.round(size * 0.22);
  const fs = Math.round(size * 0.48);
  const ls = (size * -0.035).toFixed(1);
  const sh = Math.max(1, Math.round(size * 0.006));

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  ${FONT_IMPORT}
  * { margin: 0; padding: 0; }
  html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
  .icon {
    width: ${size}px; height: ${size}px;
    background: linear-gradient(145deg, #34d399 0%, #22c55e 35%, #16a34a 100%);
    border-radius: ${r}px;
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .icon::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(170deg, rgba(255,255,255,0.28) 0%, transparent 50%);
    border-radius: ${r}px;
  }
  .ar {
    color: white;
    font-family: 'Inter', sans-serif;
    font-weight: 900;
    font-size: ${fs}px;
    letter-spacing: ${ls}px;
    line-height: 1;
    position: relative; z-index: 1;
    text-shadow: 0 ${sh}px ${sh * 2}px rgba(0,0,0,0.18);
  }
</style>
</head><body>
  <div class="icon"><span class="ar">AR</span></div>
</body></html>`;
}

async function main() {
  console.log('🎨 SaaS Boilerplate Brand Asset Generator');
  console.log('─'.repeat(44));

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    // ── OG Image ──────────────────────────────────────────
    console.log('📸 og-image.png (1200×630)');
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.setContent(ogImageHTML(), { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(publicDir, 'og-image.png'),
      clip: { x: 0, y: 0, width: 1200, height: 630 },
      omitBackground: true,
    });

    // ── Favicon PNGs ──────────────────────────────────────
    const favicons = [
      { size: 16, file: 'favicon-16x16.png' },
      { size: 32, file: 'favicon-32x32.png' },
      { size: 180, file: 'apple-touch-icon.png' },
      { size: 192, file: 'android-chrome-192x192.png' },
      { size: 512, file: 'android-chrome-512x512.png' },
    ];

    for (const { size, file } of favicons) {
      console.log(`🖼  ${file} (${size}×${size})`);
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(faviconHTML(size), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.fonts.ready);
      await page.screenshot({
        path: path.join(publicDir, file),
        clip: { x: 0, y: 0, width: size, height: size },
        omitBackground: true,
      });
    }

    console.log('\n✅ All brand assets generated in /public/');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
