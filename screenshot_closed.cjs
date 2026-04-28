const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const extensionPath = 'w:\\prj\\octo\\octo-free\\dist';
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('https://github.com/tamer1an/octo-free', { waitUntil: 'networkidle2' });

  try {
    await page.waitForSelector('#octo-free-root', { timeout: 5000 });
    console.log("Sidebar injected successfully!");
    
    // Give react time to render
    await new Promise(r => setTimeout(r, 1000));

    // Find and click the close button inside the octo-free-root
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent === 'X') {
          btn.click();
          break;
        }
      }
    });

    // Give it time to close
    await new Promise(r => setTimeout(r, 500));

    const btnInfo = await page.evaluate(() => {
      const b = document.querySelector('#octo-free-root button');
      if (b) {
        const rect = b.getBoundingClientRect();
        return { text: b.textContent, x: rect.x, y: rect.y, w: rect.width, h: rect.height, z: window.getComputedStyle(b).zIndex };
      }
      return null;
    });
    console.log("Closed Button info:", btnInfo);

    // Take a screenshot
    const screenshotPath = 'w:\\prj\\octo\\octo-free\\screenshot_closed.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (e) {
    console.error("Failed to take screenshot:", e);
  }

  await browser.close();
})();
