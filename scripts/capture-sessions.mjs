import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const url = process.argv[2];
const mode = process.argv[3];

if (!url || !mode) {
  console.error('Usage: node scripts/capture-sessions.mjs <url> <normal|stuck|dead>');
  process.exit(1);
}

const shots = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

// Ensure artifacts directory exists
if (!fs.existsSync('artifacts')) {
  fs.mkdirSync('artifacts', { recursive: true });
}

const browser = await chromium.launch({ headless: true });

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000); // Wait for session cards to render
  await page.screenshot({
    path: path.join('artifacts', `sessions-${shot.name}-${mode}.png`),
    fullPage: true,
  });
  console.log(`Captured: artifacts/sessions-${shot.name}-${mode}.png`);
  await page.close();
}

await browser.close();
console.log('Done!');
