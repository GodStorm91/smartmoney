const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to mobile dimensions
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  
  // Navigate to login and login
  await page.goto('https://money.khanh.page/login', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.type('input[type="email"], input[name="email"], input[id*="email"]', 'godstorm91@gmail.com');
  await page.type('input[type="password"], input[name="password"], input[id*="password"]', '1@3c#.Net');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));
  
  // Navigate to transactions page
  await page.goto('https://money.khanh.page/transactions', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot of bottom-right area showing buttons
  await page.screenshot({ 
    path: '/tmp/money-scan-button-added.png',
    fullPage: false,
    clip: { x: 280, y: 500, width: 110, height: 350 }
  });
  
  console.log('Screenshot saved');
  
  await browser.close();
})();
