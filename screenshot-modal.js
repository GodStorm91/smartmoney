const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-permissions-for-camera']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to mobile dimensions
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  
  // Navigate to the transactions page
  await page.goto('https://money.khanh.page/transactions', { waitUntil: 'networkidle0' });
  
  // Wait for page to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to find and click the FAB button (Quick Entry FAB)
  const fabButton = await page.$('button[class*="fixed"][class*="bottom-28"]');
  
  if (fabButton) {
    console.log('Found FAB button, clicking...');
    await fabButton.click();
    
    // Wait for modal to open
    await new Promise(r => setTimeout(r, 1000));
    
    // Take screenshot of modal
    await page.screenshot({ 
      path: '/tmp/money-add-transaction-modal.png',
      fullPage: true
    });
    console.log('Screenshot of modal saved');
  } else {
    console.log('FAB button not found');
    
    // Take screenshot to see what's on the page
    await page.screenshot({ 
      path: '/tmp/money-transactions-check.png',
      fullPage: true
    });
  }
  
  await browser.close();
})();
