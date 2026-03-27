import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Usage: node scripts/capture-blocked-triage.mjs <url>');
  process.exit(1);
}

const shots = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

await fs.mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  const blockedButton = page.getByTestId('blocked-items-button');
  try {
    await blockedButton.waitFor({ state: 'visible', timeout: 15000 });
    await blockedButton.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(400);
  } catch {
    const fallbackPath = path.join('artifacts', `blocked-triage-${shot.name}-open.png`);
    await page.screenshot({ path: fallbackPath, fullPage: false });
    console.log(`Captured ${fallbackPath} without modal affordance`);
    await page.close();
    continue;
  }

  const dialog = page.getByRole('dialog');
  const dialogCount = await dialog.count();
  const openPath = path.join('artifacts', `blocked-triage-${shot.name}-open.png`);
  await page.screenshot({ path: openPath, fullPage: false });
  console.log(`Captured ${openPath} dialog=${dialogCount}`);

  if (dialogCount > 0) {
    const row = dialog.locator('div[role="button"]').filter({ hasText: 'beadboard-' }).first();
    if (await row.count()) {
      await row.click({ force: true, timeout: 5000 });
      await page.waitForURL((url) => url.searchParams.get('task') !== null, { timeout: 10000 }).catch(() => null);
      await page.getByText('Assigned Agent').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
      const handoffPath = path.join('artifacts', `blocked-triage-${shot.name}-handoff.png`);
      await page.screenshot({ path: handoffPath, fullPage: false });
      console.log(`Captured ${handoffPath}`);
    }
  }

  await page.close();
}

await browser.close();
