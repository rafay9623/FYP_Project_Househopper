import { chromium } from 'playwright';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[Browser PageError]: ${err.message}`);
  });

  console.log('Navigating to http://localhost:5173/heat-map...');
  await page.goto('http://localhost:5173/heat-map');

  // Wait for the map and data to load
  await page.waitForTimeout(5000);

  console.log('Closing browser...');
  await browser.close();
}

run().catch(console.error);
