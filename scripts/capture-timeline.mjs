import { chromium } from 'playwright';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:3003/timeline';

const shots = [
  { name: 'desktop', width: 1440, height: 900 },
];

const browser = await chromium.launch({ headless: true });

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join('artifacts', `timeline-${shot.name}.png`),
    fullPage: true,
  });
  await page.close();
}

await browser.close();
console.log('Screenshot saved to artifacts/timeline-desktop.png');
