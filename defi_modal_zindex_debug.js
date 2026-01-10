const puppeteer = require('puppeteer');

async function analyzeDefiModalZIndex() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache']
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('Navigating to login page...');
    await page.goto('https://money.khanh.page/accounts', { waitUntil: 'networkidle0', timeout: 30000 });

    // Login
    console.log('Logging in...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'godstorm91@gmail.com');
    await page.type('input[type="password"]', '1@3c#.Net');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

    console.log('Logged in, waiting for DeFi positions section...');
    await new Promise(r => setTimeout(r, 3000));

    // Find and click on a DeFi position
    console.log('Looking for DeFi position to click...');
    const clickResult = await page.evaluate(() => {
      // Find the position rows in the LP positions section
      const buttons = Array.from(document.querySelectorAll('button'));
      const positionBtn = buttons.find(b => {
        const text = b.textContent || '';
        // Look for button that contains position-like content
        // We need to find a button inside the LPPositionsSection
        const parent = b.closest('[class*="space-y"]');
        return parent !== null && b.querySelector('[class*="rounded-full"]') !== null;
      });

      if (positionBtn) {
        positionBtn.click();
        return 'Clicked position button';
      }
      return 'No position button found';
    });
    console.log('Click result:', clickResult);

    // Wait for modal to open
    await new Promise(r => setTimeout(r, 2000));

    // Analyze z-index stacking
    console.log('Analyzing z-index stacking...');
    const zIndexAnalysis = await page.evaluate(() => {
      // Get all fixed position elements
      const allFixed = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          try {
            return window.getComputedStyle(el).position === 'fixed';
          } catch(e) { return false; }
        });

      // Get modal container (z-[9999] element)
      const modalContainer = allFixed.find(el => {
        const classes = el.className?.toString() || '';
        return classes.includes('inset-0') && classes.includes('z-[9999]');
      });

      // Find all elements with z-index >= 9999
      const highZIndex = allFixed.filter(el => {
        const zIndex = window.getComputedStyle(el).zIndex;
        return zIndex && parseInt(zIndex) >= 9999;
      });

      // Check for sidebar/drawer elements
      const sidebarElements = allFixed.filter(el => {
        const classes = el.className?.toString() || '';
        const style = window.getComputedStyle(el);
        return (
          classes.includes('drawer') ||
          classes.includes('sidebar') ||
          classes.includes('side-panel') ||
          (style.transform.includes('matrix') && style.width.startsWith('25')) || // 25% width panels
          (classes.includes('right') && classes.includes('fixed') && !classes.includes('inset-0'))
        );
      });

      return {
        totalFixedElements: allFixed.length,
        modalFound: !!modalContainer,
        modalClasses: modalContainer?.className,
        modalZIndex: modalContainer ? window.getComputedStyle(modalContainer).zIndex : null,
        modalOuterHTML: modalContainer?.outerHTML?.substring(0, 800),
        highZIndexElements: highZIndex.map(el => ({
          tag: el.tagName,
          class: el.className?.toString().substring(0, 150),
          zIndex: window.getComputedStyle(el).zIndex,
          visible: window.getComputedStyle(el).display !== 'none',
          opacity: window.getComputedStyle(el).opacity,
          outerHTML: el.outerHTML?.substring(0, 300)
        })),
        sidebarElements: sidebarElements.map(el => ({
          tag: el.tagName,
          class: el.className?.toString().substring(0, 150),
          zIndex: window.getComputedStyle(el).zIndex,
          visible: window.getComputedStyle(el).display !== 'none',
          width: window.getComputedStyle(el).width,
          right: window.getComputedStyle(el).right,
          outerHTML: el.outerHTML?.substring(0, 300)
        })),
        // List top 20 highest z-index elements
        topZIndexElements: allFixed
          .map(el => ({
            tag: el.tagName,
            class: el.className?.toString().substring(0, 100),
            zIndex: window.getComputedStyle(el).zIndex
          }))
          .sort((a, b) => {
            const zA = parseInt(a.zIndex) || 0;
            const zB = parseInt(b.zIndex) || 0;
            return zB - zA;
          })
          .slice(0, 20)
      };
    });

    console.log('\n=== Z-INDEX ANALYSIS ===');
    console.log('Total fixed elements:', zIndexAnalysis.totalFixedElements);
    console.log('Modal found:', zIndexAnalysis.modalFound);
    console.log('Modal z-index:', zIndexAnalysis.modalZIndex);
    console.log('\nHigh z-index elements (>=9999):');
    zIndexAnalysis.highZIndexElements.forEach((el, i) => {
      console.log(`  ${i+1}. [${el.tag}] z-index: ${el.zIndex}, visible: ${el.visible}`);
      console.log(`     class: ${el.class}`);
    });

    console.log('\nPotential sidebar/drawer elements:');
    zIndexAnalysis.sidebarElements.forEach((el, i) => {
      console.log(`  ${i+1}. [${el.tag}] z-index: ${el.zIndex}, visible: ${el.visible}, width: ${el.width}`);
      console.log(`     class: ${el.class}`);
    });

    console.log('\nTop 20 z-index elements:');
    zIndexAnalysis.topZIndexElements.forEach((el, i) => {
      console.log(`  ${i+1}. [${el.tag}] z-index: ${el.zIndex}`);
      console.log(`     class: ${el.class}`);
    });

    // Screenshot
    console.log('\nTaking screenshot...');
    await page.screenshot({ path: '/tmp/defi_modal_analysis.png', fullPage: true });
    console.log('Screenshot saved to /tmp/defi_modal_analysis.png');

    // Return full analysis
    return zIndexAnalysis;

  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  } finally {
    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await new Promise(r => setTimeout(r, 30000));
    await browser.close();
  }
}

analyzeDefiModalZIndex();
