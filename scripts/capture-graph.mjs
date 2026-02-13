import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/capture-graph.mjs <url>');
  process.exit(1);
}

const outputDir = path.join('artifacts');
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function screenshot(name, viewport, prepare) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (prepare) {
    await prepare(page);
    await page.waitForTimeout(450);
  }
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: true,
  });
  await page.close();
}

await screenshot('graph-next-1440.png', { width: 1440, height: 900 });
await screenshot('graph-next-768.png', { width: 768, height: 1024 });
await screenshot('graph-next-390-overview.png', { width: 390, height: 844 });
await screenshot('graph-next-390-flow.png', { width: 390, height: 844 }, async (page) => {
  const flowButton = page.getByRole('button', { name: 'Switch to Graph' });
  if (await flowButton.count()) {
    await flowButton.first().click();
  }
});

await browser.close();
