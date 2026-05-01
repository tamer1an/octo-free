/**
 * Chrome Web Store Screenshot Generator for Github File Tree (Octofree)
 * 
 * Captures screenshots of the extension in action on a real GitHub repo,
 * then resizes them to the Chrome Web Store required dimensions:
 *   - 1280 x 800   (standard screenshot)
 *   - 440  x 280   (small promotional tile)
 *   - 1400 x 560   (marquee promotional tile)  — all at 72 DPI
 *
 * Usage:  node screenshot_store.cjs
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, 'dist');
const OUTPUT_DIR = path.resolve(__dirname, 'store_screenshots');

const SIZES = [
  { name: 'screenshot_1280x800',  width: 1280, height: 800  },
  { name: 'screenshot_440x280',   width: 440,  height: 280  },
  { name: 'screenshot_1400x560',  width: 1400, height: 560  },
];

const GITHUB_REPO_URL = 'https://github.com/tamer1an/octo-free';

(async () => {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching Chrome with extension loaded…');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--force-device-scale-factor=1',
    ],
  });

  for (const size of SIZES) {
    console.log(`\n── Capturing ${size.name} (${size.width}×${size.height}) ──`);

    const page = await browser.newPage();
    await page.setViewport({
      width: size.width,
      height: size.height,
      deviceScaleFactor: 1,
    });

    // Navigate and wait for network quiet
    await page.goto(GITHUB_REPO_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the extension sidebar to inject
    try {
      await page.waitForSelector('#octo-free-root', { timeout: 8000 });
      console.log('  ✔ Sidebar detected');
    } catch {
      console.log('  ⚠ Sidebar not detected — screenshot will show page without sidebar');
    }

    // Give React a moment to finish rendering (tree items, animations)
    await new Promise(r => setTimeout(r, 2000));

    // Capture
    const filePath = path.join(OUTPUT_DIR, `${size.name}.png`);
    await page.screenshot({ path: filePath, type: 'png' });
    console.log(`  ✔ Saved → ${filePath}`);

    await page.close();
  }

  // ── Also capture an "open sidebar" variant at 1280×800 ──
  console.log('\n── Capturing open sidebar detail (1280×800) ──');
  const detailPage = await browser.newPage();
  await detailPage.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await detailPage.goto(GITHUB_REPO_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  try {
    await detailPage.waitForSelector('#octo-free-root', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 2500));

    // Capture with sidebar open
    const openPath = path.join(OUTPUT_DIR, 'screenshot_sidebar_open.png');
    await detailPage.screenshot({ path: openPath, type: 'png' });
    console.log(`  ✔ Saved → ${openPath}`);

    // Now close the sidebar and capture the closed state
    await detailPage.evaluate(() => {
      const root = document.querySelector('#octo-free-root');
      if (!root) return;
      const buttons = root.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim() === '✕' || btn.textContent?.trim() === 'X') {
          btn.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 800));

    const closedPath = path.join(OUTPUT_DIR, 'screenshot_sidebar_closed.png');
    await detailPage.screenshot({ path: closedPath, type: 'png' });
    console.log(`  ✔ Saved → ${closedPath}`);
  } catch (e) {
    console.error('  ✗ Failed to capture detail screenshots:', e.message);
  }

  await detailPage.close();
  await browser.close();

  console.log(`\n✅ All screenshots saved to: ${OUTPUT_DIR}`);
  console.log('   Files:');
  fs.readdirSync(OUTPUT_DIR).forEach(f => console.log(`     • ${f}`));
})();
