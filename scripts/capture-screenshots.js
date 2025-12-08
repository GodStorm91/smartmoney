/**
 * Screenshot Capture Script for Landing Page
 * Captures real app screenshots from production
 */

const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'https://money.khanh.page';
const OUTPUT_DIR = path.join(__dirname, '../frontend/public/screenshots');

const CREDENTIALS = {
  email: 'me@khanh.page',
  password: 'vCubeCm1'
};

// Screenshot configurations
const SCREENSHOTS = [
  // Desktop screenshots (1280x800)
  { name: 'dashboard-light', path: '/', viewport: { width: 1280, height: 800 }, theme: 'light' },
  { name: 'dashboard-dark', path: '/', viewport: { width: 1280, height: 800 }, theme: 'dark' },
  { name: 'transactions', path: '/transactions', viewport: { width: 1280, height: 800 }, theme: 'light' },
  { name: 'budget', path: '/budget', viewport: { width: 1280, height: 800 }, theme: 'light' },
  { name: 'analytics', path: '/analytics', viewport: { width: 1280, height: 800 }, theme: 'light' },

  // Mobile screenshots (375x812 - iPhone X)
  { name: 'dashboard-mobile', path: '/', viewport: { width: 375, height: 812 }, theme: 'light', mobile: true },
  { name: 'transactions-mobile', path: '/transactions', viewport: { width: 375, height: 812 }, theme: 'light', mobile: true },
];

async function login(page) {
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

  // Wait for form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill credentials
  await page.type('input[type="email"]', CREDENTIALS.email);
  await page.type('input[type="password"]', CREDENTIALS.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  console.log('Login successful!');
}

async function setTheme(page, theme) {
  // Set theme via localStorage and reload
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
  }, theme);
}

async function captureScreenshot(page, config) {
  console.log(`Capturing: ${config.name}...`);

  // Set viewport
  await page.setViewport({
    width: config.viewport.width,
    height: config.viewport.height,
    isMobile: config.mobile || false,
    deviceScaleFactor: 2 // Retina quality
  });

  // Navigate to page
  await page.goto(`${BASE_URL}${config.path}`, { waitUntil: 'networkidle2' });

  // Set theme
  await setTheme(page, config.theme);

  // Wait for content to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Take screenshot
  const outputPath = path.join(OUTPUT_DIR, `${config.name}.png`);
  await page.screenshot({
    path: outputPath,
    fullPage: false // Viewport only
  });

  console.log(`  Saved: ${outputPath}`);
}

async function main() {
  console.log('Starting screenshot capture...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Login first
    await login(page);

    // Capture all screenshots
    for (const config of SCREENSHOTS) {
      await captureScreenshot(page, config);
    }

    console.log('\nAll screenshots captured successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
