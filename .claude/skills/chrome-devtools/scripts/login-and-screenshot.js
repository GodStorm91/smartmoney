#!/usr/bin/env node
/**
 * Login and capture screenshot
 */

import { getBrowser, getPage, closeBrowser, outputJSON } from './lib/browser.js';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) {
  const key = argv[i].replace(/^--/, '');
  args[key] = argv[i + 1];
}

const url = args.url || 'http://localhost:5173';
const email = args.email || 'test@example.com';
const password = args.password || 'password123';
const targetPath = args.path || '/budget';
const output = args.output;
const headless = args.headless !== 'false';

(async () => {
  let page;
  try {
    const browser = await getBrowser({ headless });
    page = await getPage(browser);

    // Navigate to login page
    await page.goto(`${url}/login`, { waitUntil: 'networkidle2' });

    // Fill login form
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

    // Navigate to target path
    await page.goto(`${url}${targetPath}`, { waitUntil: 'networkidle2' });

    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    // Take screenshot if output specified
    if (output) {
      await page.screenshot({ path: output, fullPage: true });
    }

    // Get page info
    const title = await page.title();
    const currentUrl = page.url();

    outputJSON({
      success: true,
      url: currentUrl,
      title: title,
      output: output || null,
    });

    await closeBrowser();
  } catch (error) {
    if (page) {
      const currentUrl = page.url();
      console.error(JSON.stringify({
        success: false,
        error: error.message,
        url: currentUrl,
      }));
    } else {
      console.error(JSON.stringify({
        success: false,
        error: error.message,
      }));
    }
    await closeBrowser();
    process.exit(1);
  }
})();
