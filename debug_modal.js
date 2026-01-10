const puppeteer = require('puppeteer');

async function debugModal() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache', '--disable-disk-cache']
  });
  
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  
  const consoleMessages = [];
  const jsErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push('ERROR: ' + msg.text());
    }
  });
  
  page.on('pageerror', error => {
    jsErrors.push('JS Error: ' + error.message);
  });
  
  try {
    await page.goto('https://money.khanh.page', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'godstorm91@gmail.com');
    await page.type('input[type="password"]', '1@3c#.Net');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    await page.goto('https://money.khanh.page/transactions', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 4000));
    
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
    
    const modalState = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const fixedDivs = allDivs.filter(d => {
        try { return window.getComputedStyle(d).position === 'fixed'; } catch(e) { return false; }
      });
      
      const modalContainer = allDivs.find(d => {
        const classes = d.className?.toString() || '';
        return classes.includes('fixed') && classes.includes('inset-0') && classes.includes('z-');
      });
      
      return {
        fixedElementsCount: fixedDivs.length,
        modalClasses: modalContainer?.className || 'Not found',
        modalZIndex: modalContainer ? window.getComputedStyle(modalContainer).zIndex : null,
        allFixedClasses: fixedDivs.map(d => ({
          class: d.className?.toString().substring(0, 80),
          zIndex: window.getComputedStyle(d).zIndex
        }))
      };
    });
    
    console.log('Modal State:', JSON.stringify(modalState, null, 2));
    console.log('Console Errors:', JSON.stringify(consoleMessages, null, 2));
    console.log('JS Errors:', JSON.stringify(jsErrors, null, 2));
    
    await page.screenshot({ path: '/tmp/debug_modal.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Console Errors:', JSON.stringify(consoleMessages, null, 2));
    console.log('JS Errors:', JSON.stringify(jsErrors, null, 2));
  } finally {
    await browser.close();
  }
}

debugModal();
