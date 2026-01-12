const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to mobile dimensions
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  
  // Navigate to the site
  await page.goto('https://money.khanh.page', { waitUntil: 'networkidle0' });
  
  // Wait for buttons to be visible
  await page.waitForSelector('button', { timeout: 10000 });
  
  // Take screenshot focusing on bottom-right area
  await page.screenshot({ 
    path: '/tmp/money-after-fix.png',
    fullPage: false,
    clip: { x: 300, y: 600, width: 90, height: 250 }
  });
  
  console.log('Screenshot saved to /tmp/money-after-fix.png');
  
  await browser.close();
})();
