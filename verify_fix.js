const puppeteer = require('puppeteer');

async function verifyFix() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://money.khanh.page', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'godstorm91@gmail.com');
    await page.type('input[type="password"]', '1@3c#.Net');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    await page.goto('https://money.khanh.page/transactions', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Click edit button
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const editBtn = buttons.find(b => {
        const svg = b.querySelector('svg');
        if (svg && svg.outerHTML.includes('16.862')) return true;
        return false;
      });
      if (editBtn) {
        editBtn.click();
        return 'Clicked edit button';
      }
      return 'No edit button found';
    });
    console.log('Click result:', clickResult);
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Check modal z-index
    const modalState = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const modalDiv = allDivs.find(d => {
        const classes = d.className?.toString() || '';
        return classes.includes('fixed') && classes.includes('inset-0') && classes.includes('z-');
      });
      return {
        modalClasses: modalDiv?.className || 'Not found',
        modalZIndex: modalDiv ? window.getComputedStyle(modalDiv).zIndex : null,
        modalVisible: !!modalDiv
      };
    });
    
    console.log('Modal State:', JSON.stringify(modalState, null, 2));
    
    if (modalState.modalClasses.includes('z-[9999]') || modalState.modalZIndex === '9999') {
      console.log('✓ SUCCESS: Modal has correct z-index (9999)');
    } else if (modalState.modalZIndex === '50') {
      console.log('✗ FAILED: Modal still has old z-index (50)');
    } else {
      console.log('? UNKNOWN: Modal z-index is', modalState.modalZIndex);
    }
    
    await page.screenshot({ path: '/tmp/verify_fix.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

verifyFix();
