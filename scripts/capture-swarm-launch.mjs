import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const baseUrl = process.argv[2];
const mode = process.argv[3];

if (!baseUrl || !mode || !['topbar', 'epic'].includes(mode)) {
  console.error('Usage: node scripts/capture-swarm-launch.mjs <url> <topbar|epic>');
  process.exit(1);
}

await fs.mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

if (mode === 'topbar') {
  await page.getByTestId('top-bar').locator('button[aria-label="Launch Swarm"]').click({ force: true, timeout: 5000 });
} else {
  const epicLaunch = page.locator('[data-testid="left-panel"] button[aria-label^="Launch Swarm for "]').first();
  await epicLaunch.click({ force: true, timeout: 5000 });
}

await page.waitForTimeout(500);

const dialogCount = await page.getByRole('dialog').count();
if (dialogCount < 1) {
  throw new Error(`Launch dialog did not open for ${mode}`);
}

const outputPath = path.join('artifacts', `swarm-launch-${mode}.png`);
await page.screenshot({ path: outputPath, fullPage: false });
console.log(`Captured ${outputPath}`);

await browser.close();
