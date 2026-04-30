import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extPath = path.resolve(__dirname, 'dist');

const browser = await puppeteer.launch({
  headless: false,
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    '--no-sandbox',
    '--window-size=1400,900',
  ],
  defaultViewport: null,
});

const page = await browser.newPage();

// Navigate to a public GitHub repo to show the sidebar
await page.goto('https://github.com/facebook/react', { waitUntil: 'domcontentloaded', timeout: 30000 });

// Wait for the extension sidebar to mount
try {
  await page.waitForSelector('#octo-free-root', { timeout: 10000 });
  console.log('Sidebar mounted');
} catch {
  console.log('Sidebar not detected — check extension loaded correctly');
}

// Keep the browser open so the user can interact with it
console.log('Browser open. Press Ctrl+C to close.');
