import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Usage: node scripts/capture-swarm-handoff.mjs <url>');
  process.exit(1);
}

await fs.mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route('**/api/swarm/formulas**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      data: [
        { name: 'feature-dev', description: 'Feature delivery swarm' },
      ],
    }),
  });
});

await page.route('**/api/swarm/launch', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      data: {
        epic_id: 'beadboard-ov2',
      },
    }),
  });
});

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);

await page.getByTestId('top-bar').locator('button[aria-label="Launch Swarm"]').click({ force: true, timeout: 5000 });
await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10000 });
await page.getByRole('combobox').click();
await page.getByRole('option', { name: 'feature-dev' }).click();
await page.getByLabel('Swarm Title').fill('OV2 Launch Verification');

const dialogPath = path.join('artifacts', 'swarm-launch-handoff-dialog.png');
await page.screenshot({ path: dialogPath, fullPage: false });
console.log(`Captured ${dialogPath}`);

await page.getByRole('button', { name: /Launch$/ }).click();
const rightPanelPath = path.join('artifacts', 'swarm-launch-handoff-right-panel.png');
try {
  await page.waitForTimeout(800);
} finally {
  await page.waitForTimeout(750);
  await page.screenshot({ path: rightPanelPath, fullPage: false });
  console.log(`Captured ${rightPanelPath}`);
  console.log(`Swarm launch current URL: ${page.url()}`);
}

const swarmParam = new URL(page.url()).searchParams.get('swarm');
if (swarmParam !== 'beadboard-ov2') {
  throw new Error(`Expected swarm handoff to beadboard-ov2, received ${swarmParam}`);
}

await browser.close();
