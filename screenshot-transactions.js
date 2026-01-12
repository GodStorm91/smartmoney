const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = browser.defaultBrowserContext();
  
  const page = await browser.newPage();
  
  // Set viewport to mobile dimensions
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  
  // Navigate to the transactions page
  await page.goto('https://money.khanh.page/transactions', { waitUntil: 'networkidle0' });
  
  // Wait for page to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot of the page
  await page.screenshot({ 
    path: '/tmp/money-transactions-page.png',
    fullPage: true
  });
  
  console.log('Screenshot saved to /tmp/money-transactions-page.png');
  
  await browser.close();
})();
