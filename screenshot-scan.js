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
  
  // Click the Quick Add FAB button (button with aria-label="Quick Add")
  const quickAddButton = await page.$('button[aria-label="Quick Add"]');
  if (quickAddButton) {
    console.log('Clicking Quick Add FAB...');
    await quickAddButton.click();
    await new Promise(r => setTimeout(r, 1500));
    
    // Take screenshot of the modal
    await page.screenshot({ 
      path: '/tmp/money-quick-add-modal.png',
      fullPage: false,
      clip: { x: 0, y: 200, width: 390, height: 500 }
    });
    console.log('Modal screenshot saved');
    
    // Check if "Scan Receipt" button exists
    const scanButton = await page.$('button:has-text("Scan"), button:has-text("scan")');
    if (scanButton) {
      console.log('Found Scan button, clicking it...');
      await scanButton.click();
      await new Promise(r => setTimeout(r, 3000));
      
      // Take screenshot to see camera view
      await page.screenshot({ 
        path: '/tmp/money-camera-view.png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 390, height: 844 }
      });
      console.log('Camera view screenshot saved');
    } else {
      console.log('Scan button not found in modal');
      
      // Get all buttons in modal
      const modalButtons = await page.$$('div[class*="rounded"] button');
      console.log(`Found ${modalButtons.length} buttons in modal area`);
    }
  } else {
    console.log('Quick Add FAB not found');
  }
  
  await browser.close();
})();
