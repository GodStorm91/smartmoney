const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to mobile dimensions
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  
  // Navigate to the transactions page
  await page.goto('https://money.khanh.page/transactions', { waitUntil: 'networkidle0' });
  
  // Wait for page to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Get all buttons on the page
  const buttons = await page.$$('button');
  console.log(`Found ${buttons.length} buttons on the page`);
  
  // Print button text/content for debugging
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].evaluate(el => el.textContent?.trim() || '');
    const ariaLabel = await buttons[i].evaluate(el => el.getAttribute('aria-label') || '');
    const classes = await buttons[i].evaluate(el => el.className);
    console.log(`Button ${i}: text="${text}" aria-label="${ariaLabel}" classes="${classes.substring(0, 100)}..."`);
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: '/tmp/money-all-buttons.png',
    fullPage: true
  });
  
  console.log('Screenshot saved');
  
  await browser.close();
})();
