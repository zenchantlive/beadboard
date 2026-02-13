import { chromium } from 'playwright';
import path from 'node:path';

const url = process.argv[2];
const mode = process.argv[3];

if (!url || !mode) {
  console.error('Usage: node scripts/capture-kanban.mjs <url> <before|after>');
  process.exit(1);
}

const shots = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const browser = await chromium.launch({ headless: true });

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join('artifacts', `kanban-${shot.name}-${mode}.png`),
    fullPage: true,
  });
  await page.close();
}

await browser.close();
