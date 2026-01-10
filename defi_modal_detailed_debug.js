const puppeteer = require('puppeteer');

async function analyzeDefiModalDetailed() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache']
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 800 });

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

    console.log('Logged in, waiting for page to settle...');
    await new Promise(r => setTimeout(r, 5000));

    // Check if DeFi positions section exists
    const pageContent = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasDefiPositions: bodyText.includes('DeFi') || bodyText.includes('Total DeFi'),
        bodyTextPreview: bodyText.substring(0, 500)
      };
    });
    console.log('Page content check:', pageContent);

    // Try to find any position to click
    console.log('Looking for clickable position elements...');
    const positionInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Look for buttons in sections that might contain positions
      const positionButtons = buttons.filter(b => {
        const text = b.innerText || '';
        // Look for protocol names like Aave, Uniswap, etc.
        return text.includes('Aave') || text.includes('Uniswap') || text.includes('Compound') ||
               text.includes('LP') || text.includes('Staking');
      });

      return {
        totalButtons: buttons.length,
        positionButtons: positionButtons.map(b => ({
          text: b.innerText.substring(0, 100),
          visible: b.offsetParent !== null,
          classes: b.className
        }))
      };
    });
    console.log('Position info:', JSON.stringify(positionInfo, null, 2));

    // If we found position buttons, click one
    if (positionInfo.positionButtons.length > 0) {
      console.log('Clicking first position button...');
      const clickResult = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const positionBtn = buttons.find(b => {
          const text = b.innerText || '';
          return text.includes('Aave') || text.includes('Uniswap') || text.includes('LP');
        });
        if (positionBtn) {
          positionBtn.click();
          return 'Clicked';
        }
        return 'Not found';
      });
      console.log('Click result:', clickResult);
      await new Promise(r => setTimeout(r, 3000));
    }

    // Analyze all fixed position elements in detail
    console.log('\n=== DETAILED Z-INDEX ANALYSIS ===');
    const detailedAnalysis = await page.evaluate(() => {
      const results = {
        fixedElements: [],
        highZIndexElements: [],
        elementsWithTransform: [],
        elementsWithOpacity: [],
        potentialInterference: []
      };

      // Get all elements
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

          // Check for fixed position
          if (style.position === 'fixed') {
            const zIndex = parseInt(style.zIndex) || 0;
            const className = el.className?.toString() || '';
            const tagName = el.tagName;

            results.fixedElements.push({
              tag: tagName,
              class: className.substring(0, 200),
              zIndex: zIndex,
              visible: isVisible,
              width: style.width,
              height: style.height,
              top: style.top,
              left: style.left,
              right: style.right,
              bottom: style.bottom,
              hasTransform: style.transform !== 'none',
              hasOpacity: style.opacity !== '1',
              outerHTML: el.outerHTML?.substring(0, 500)
            });

            // Track high z-index elements
            if (zIndex >= 1000) {
              results.highZIndexElements.push({
                tag: tagName,
                class: className.substring(0, 150),
                zIndex: zIndex,
                visible: isVisible
              });
            }

            // Track transform elements
            if (style.transform !== 'none') {
              results.elementsWithTransform.push({
                tag: tagName,
                class: className.substring(0, 100),
                zIndex: zIndex,
                transform: style.transform,
                visible: isVisible
              });
            }

            // Track opacity elements
            if (style.opacity !== '1') {
              results.elementsWithOpacity.push({
                tag: tagName,
                class: className.substring(0, 100),
                zIndex: zIndex,
                opacity: style.opacity,
                visible: isVisible
              });
            }

            // Check for potential interference (sidebar-like elements)
            if (isVisible && (
              className.includes('side') ||
              className.includes('drawer') ||
              className.includes('panel') ||
              (style.right !== 'auto' && style.right !== '0px' && zIndex > 0) ||
              (className.includes('bottom') && style.bottom !== 'auto' && style.bottom !== '0px')
            )) {
              results.potentialInterference.push({
                tag: tagName,
                class: className.substring(0, 150),
                zIndex: zIndex,
                visible: isVisible,
                position: `${style.top} ${style.right} ${style.bottom} ${style.left}`
              });
            }
          }
        } catch(e) {
          // Ignore errors
        }
      }

      // Sort by z-index descending
      results.fixedElements.sort((a, b) => b.zIndex - a.zIndex);
      results.highZIndexElements.sort((a, b) => b.zIndex - a.zIndex);

      return results;
    });

    console.log('Total fixed elements:', detailedAnalysis.fixedElements.length);
    console.log('High z-index elements:', detailedAnalysis.highZIndexElements.length);
    console.log('Elements with transform:', detailedAnalysis.elementsWithTransform.length);

    console.log('\n--- HIGH Z-INDEX ELEMENTS (>=1000) ---');
    detailedAnalysis.highZIndexElements.forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, visible: ${el.visible}`);
      console.log(`   class: ${el.class}`);
    });

    console.log('\n--- POTENTIAL INTERFERENCE ---');
    detailedAnalysis.potentialInterference.forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, position: ${el.position}`);
      console.log(`   class: ${el.class}`);
    });

    console.log('\n--- TOP 10 FIXED ELEMENTS BY Z-INDEX ---');
    detailedAnalysis.fixedElements.slice(0, 10).forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, visible: ${el.visible}, size: ${el.width}x${el.height}`);
      console.log(`   class: ${el.class}`);
    });

    // Screenshot
    console.log('\nTaking screenshot...');
    await page.screenshot({ path: '/tmp/defi_modal_detailed.png', fullPage: true });
    console.log('Screenshot saved to /tmp/defi_modal_detailed.png');

    return detailedAnalysis;

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    return { error: error.message };
  } finally {
    console.log('\nBrowser will stay open for manual inspection...');
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
  }
}

analyzeDefiModalDetailed();
