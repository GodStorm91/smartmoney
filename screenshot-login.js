const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to mobile dimensions
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  
  // Navigate to login page
  await page.goto('https://money.khanh.page/login', { waitUntil: 'networkidle0' });
  
  // Wait for page to load
  await new Promise(r => setTimeout(r, 1000));
  
  // Fill login form
  await page.type('input[type="email"], input[name="email"], input[id*="email"]', 'godstorm91@gmail.com');
  await page.type('input[type="password"], input[name="password"], input[id*="password"]', '1@3c#.Net');
  
  // Click login button
  const loginButton = await page.$('button[type="submit"]');
  if (loginButton) {
    await loginButton.click();
    console.log('Clicked login button');
  }
  
  // Wait for navigation
  await new Promise(r => setTimeout(r, 3000));
  
  // Check current URL
  console.log('Current URL:', page.url());
  
  // Navigate to transactions page
  await page.goto('https://money.khanh.page/transactions', { waitUntil: 'networkidle0' });
  
  // Wait for page to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Get all buttons on the page
  const buttons = await page.$$('button');
  console.log(`Found ${buttons.length} buttons on the transactions page`);
  
  // Print button text/content for debugging
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].evaluate(el => el.textContent?.trim() || '');
    const ariaLabel = await buttons[i].evaluate(el => el.getAttribute('aria-label') || '');
    const classes = await buttons[i].evaluate(el => el.className);
    if (text || ariaLabel) {
      console.log(`Button ${i}: text="${text}" aria-label="${ariaLabel}" classes="${classes.substring(0, 80)}..."`);
    }
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: '/tmp/money-logged-in-transactions.png',
    fullPage: true
  });
  
  console.log('Screenshot saved');
  
  await browser.close();
})();
