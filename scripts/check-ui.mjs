import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function pageText(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  return page.locator('body').innerText();
}

const DEMO_MARKERS = [
  '$58,234',
  '$27,341',
  '$52,909',
  'Sarah',
  '$28,400',
  'Mar 16',
  'Square POS',
  '$45,820',
  'March · vs Feb · 3-mo avg',
];

function findMarkers(text) {
  return DEMO_MARKERS.filter((m) => text.includes(m));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const routes = ['/', '/login', '/dashboard/overview', '/dashboard/reconciliation', '/dashboard/cashflow'];

for (const route of routes) {
  try {
    const text = await pageText(page, route);
    const markers = findMarkers(text);
    const url = page.url();
    console.log(`\n=== ${route} -> ${url} ===`);
    console.log(markers.length ? `DEMO DATA FOUND: ${markers.join(', ')}` : 'No demo markers');
    const snippet = text.replace(/\s+/g, ' ').slice(0, 280);
    console.log(`Preview: ${snippet}...`);
  } catch (err) {
    console.log(`\n=== ${route} FAILED ===`, err.message);
  }
}

await browser.close();
