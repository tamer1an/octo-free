const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const extensionPath = 'w:\\prj\\octo\\octo-free\\dist';
  
  const browser = await puppeteer.launch({
    headless: "new", // Headless with extensions is supported in new headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ]
  });

  const page = await browser.newPage();
  await page.goto('https://github.com', { waitUntil: 'networkidle2' });

  // Wait for the React component to inject
  try {
    await page.waitForSelector('#octo-free-root', { timeout: 5000 });
    console.log("Sidebar injected successfully!");
    
    // Take a screenshot
    const screenshotPath = 'w:\\prj\\octo\\octo-free\\screenshot.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (e) {
    console.error("Failed to find sidebar:", e);
  }

  await browser.close();
})();
