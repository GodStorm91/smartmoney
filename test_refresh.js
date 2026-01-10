const puppeteer = require('puppeteer');

async function testWithHardRefresh() {
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
    
    // Clear all caches before navigating to transactions
    await page.evaluate(() => {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    });
    
    // Navigate with cache-bust
    await page.goto('https://money.khanh.page/transactions?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Check which file is loaded
    const jsLoaded = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource')
        .filter(r => r.name.includes('transactions.lazy'))
        .map(r => ({ 
          name: r.name.split('/').pop(), 
          transferSize: r.transferSize 
        }));
      return resources;
    });
    
    console.log('JS files loaded:', JSON.stringify(jsLoaded, null, 2));
    
    // Now click edit
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
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Check modal z-index
    const modalState = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const modalDiv = allDivs.find(d => {
        const classes = d.className?.toString() || '';
        return classes.includes('fixed') && classes.includes('inset-0') && classes.includes('z-');
      });
      return {
        modalClasses: modalDiv?.className || 'Not found',
        modalZIndex: modalDiv ? window.getComputedStyle(modalDiv).zIndex : null
      };
    });
    
    console.log('Modal State:', JSON.stringify(modalState, null, 2));
    
    await page.screenshot({ path: '/tmp/test_refresh.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testWithHardRefresh();
