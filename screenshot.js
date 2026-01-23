const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Navigate to the site
  await page.goto('https://money.khanh.page', { waitUntil: 'networkidle0' });
  
  // Take screenshot of the full page
  await page.screenshot({ path: '/tmp/money-khanh-page.png', fullPage: true });
  
  console.log('Screenshot saved to /tmp/money-khanh-page.png');
  
  await browser.close();
})();
