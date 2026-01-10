const puppeteer = require('puppeteer');

async function analyzeDefiModalDetailed() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache']
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('https://money.khanh.page', { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('2. Waiting for login form...');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    console.log('   Login form found');

    console.log('3. Filling login form...');
    await page.type('input[type="email"]', 'godstorm91@gmail.com');
    await page.type('input[type="password"]', '1@3c#.Net');
    await page.click('button[type="submit"]');

    console.log('4. Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

    // Check if we're logged in
    const url = page.url();
    console.log('   Current URL:', url);

    console.log('5. Navigating to accounts page...');
    await page.goto('https://money.khanh.page/accounts', { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('6. Waiting for DeFi positions section...');
    await new Promise(r => setTimeout(r, 5000));

    // Check page state
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasDefi: document.body.innerText.includes('DeFi') || document.body.innerText.includes('defi'),
        hasLP: document.body.innerText.includes('LP') || document.body.innerText.includes('lp'),
        bodyTextPreview: document.body.innerText.substring(0, 1000)
      };
    });
    console.log('\nPage state:', JSON.stringify(pageState, null, 2));

    // Try to find and click a position
    console.log('\n7. Looking for DeFi position to click...');
    const clickResult = await page.evaluate(() => {
      // Find all clickable elements that might be positions
      const allElements = Array.from(document.querySelectorAll('button, [role="button"], div[class*="cursor-pointer"]'));
      const positionElements = allElements.filter(el => {
        const text = el.innerText || el.textContent || '';
        return (
          text.includes('WETH') || text.includes('USDC') || text.includes('ETH') ||
          text.includes('Aave') || text.includes('Uniswap') || text.includes('Compound') ||
          text.includes('$') && text.includes('+')
        );
      });

      if (positionElements.length > 0) {
        // Try to click the first one
        const btn = positionElements[0];
        btn.scrollIntoView();
        setTimeout(() => btn.click(), 500);
        return `Clicked element with text: ${positionElements[0].innerText.substring(0, 50)}`;
      }

      // Alternative: find the first button in the LP positions section
      const lpSection = document.querySelector('[class*="LPPositionsSection"], [class*="DefiPositions"]');
      if (lpSection) {
        const btn = lpSection.querySelector('button');
        if (btn) {
          btn.click();
          return 'Clicked button in LP section';
        }
      }

      return 'No position elements found';
    });
    console.log('   Result:', clickResult);

    // Wait for modal
    await new Promise(r => setTimeout(r, 3000));

    // Detailed analysis
    console.log('\n=== DETAILED Z-INDEX ANALYSIS ===');
    const detailedAnalysis = await page.evaluate(() => {
      const results = {
        fixedElements: [],
        highZIndexElements: [],
        potentialInterference: [],
        modalContainers: []
      };

      const allElements = Array.from(document.querySelectorAll('*'));

      for (const el of allElements) {
        try {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const isVisible = style.display !== 'none' &&
                           style.visibility !== 'hidden' &&
                           style.opacity !== '0' &&
                           rect.width > 0 &&
                           rect.height > 0;

          if (style.position === 'fixed') {
            const zIndex = parseInt(style.zIndex) || 0;
            const className = el.className?.toString() || '';
            const tagName = el.tagName;

            const elementInfo = {
              tag: tagName,
              class: className.substring(0, 200),
              zIndex: zIndex,
              visible: isVisible,
              dimensions: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
              position: `top:${style.top} right:${style.right} bottom:${style.bottom} left:${style.left}`
            };

            results.fixedElements.push(elementInfo);

            // High z-index
            if (zIndex >= 1000) {
              results.highZIndexElements.push(elementInfo);
            }

            // Modal-like containers
            if (isVisible && (className.includes('inset-0') || className.includes('z-[9999]'))) {
              results.modalContainers.push(elementInfo);
            }

            // Potential interference
            if (isVisible && (
              className.includes('sidebar') || className.includes('drawer') ||
              className.includes('side') || className.includes('panel') ||
              className.includes('ChatPanel') || className.includes('chat')
            )) {
              results.potentialInterference.push(elementInfo);
            }
          }
        } catch(e) {}
      }

      results.fixedElements.sort((a, b) => b.zIndex - a.zIndex);
      results.highZIndexElements.sort((a, b) => b.zIndex - a.zIndex);

      return results;
    });

    console.log('\n--- HIGH Z-INDEX ELEMENTS (>=1000) ---');
    detailedAnalysis.highZIndexElements.forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, visible: ${el.visible}, size: ${el.dimensions}`);
      console.log(`   class: ${el.class}`);
      console.log(`   position: ${el.position}`);
    });

    console.log('\n--- MODAL CONTAINERS ---');
    detailedAnalysis.modalContainers.forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, size: ${el.dimensions}`);
      console.log(`   class: ${el.class}`);
    });

    console.log('\n--- POTENTIAL INTERFERENCE ---');
    detailedAnalysis.potentialInterference.forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, size: ${el.dimensions}`);
      console.log(`   class: ${el.class}`);
    });

    console.log('\n--- ALL FIXED ELEMENTS ---');
    detailedAnalysis.fixedElements.forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, visible: ${el.visible}`);
      console.log(`   class: ${el.class}`);
    });

    // Screenshot
    console.log('\nTaking screenshot...');
    await page.screenshot({ path: '/tmp/defi_modal_final.png', fullPage: true });
    console.log('Screenshot saved to /tmp/defi_modal_final.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\nBrowser open for inspection (60s)...');
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
  }
}

analyzeDefiModalDetailed();
