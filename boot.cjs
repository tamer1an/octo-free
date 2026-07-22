const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const extensionPath = 'w:\\prj\\octo\\octo-free\\dist';
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Let the viewport match the window size
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ]
  });

  const page = await browser.newPage();
  await page.goto('https://github.com/tamer1an/octo-free');

  console.log("Chromium booted with the extension! You can now validate the work.");
  // Intentionally omitting browser.close() so the window stays open for the user
})();
