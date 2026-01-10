const puppeteer = require('puppeteer');

async function analyzeChatPanelIssue() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache']
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log('Logging in...');
    await page.goto('https://money.khanh.page', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.type('input[type="email"]', 'godstorm91@gmail.com');
    await page.type('input[type="password"]', '1@3c#.Net');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

    console.log('Navigating to accounts...');
    await page.goto('https://money.khanh.page/accounts', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Click a DeFi position to open modal
    console.log('Opening DeFi position...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Steer'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Check the ChatPanel state
    console.log('\n=== CHAT PANEL ANALYSIS ===');
    const chatPanelAnalysis = await page.evaluate(() => {
      const chatPanel = document.querySelector('[class*="ChatPanel"], [class*="chat-panel"]');
      if (!chatPanel) {
        // Try finding by structure
        const allDivs = Array.from(document.querySelectorAll('div'));
        const panelDiv = allDivs.find(d => {
          const cls = d.className?.toString() || '';
          return cls.includes('h-full') && cls.includes('z-50') && cls.includes('fixed');
        });
        return { found: false };
      }

      const style = window.getComputedStyle(chatPanel);
      const className = chatPanel.className?.toString() || '';

      return {
        found: true,
        className: className,
        zIndex: style.zIndex,
        transform: style.transform,
        translateX: style.transform.includes('matrix') ? 'has transform' : style.transform,
        opacity: style.opacity,
        display: style.display,
        visibility: style.visibility,
        width: style.width,
        right: style.right,
        outerHTML: chatPanel.outerHTML?.substring(0, 800)
      };
    });
    console.log('Chat Panel State:', JSON.stringify(chatPanelAnalysis, null, 2));

    // Check ALL elements at the right edge of the viewport
    console.log('\n=== RIGHT EDGE ELEMENTS ===');
    const rightEdgeAnalysis = await page.evaluate(() => {
      const allFixed = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          try {
            return window.getComputedStyle(el).position === 'fixed';
          } catch(e) { return false; }
        });

      return allFixed
        .map(el => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          return {
            tag: el.tagName,
            class: el.className?.toString().substring(0, 150),
            zIndex: style.zIndex,
            visible: isVisible,
            right: style.right,
            width: style.width,
            transform: style.transform,
            rectRight: rect.right,
            rectWidth: rect.width,
            isAtRightEdge: rect.right > window.innerWidth - 50
          };
        })
        .filter(el => el.visible && el.rectWidth > 0)
        .sort((a, b) => parseInt(b.zIndex || '0') - parseInt(a.zIndex || '0'));
    });

    rightEdgeAnalysis.forEach((el, i) => {
      console.log(`${i+1}. [${el.tag}] z-index: ${el.zIndex}, right: ${el.right}, width: ${el.width}`);
      console.log(`   class: ${el.class}`);
      console.log(`   transform: ${el.transform}, rect-right: ${el.rectRight}`);
      if (el.isAtRightEdge) console.log('   *** AT RIGHT EDGE ***');
    });

    // Take screenshot focused on right edge
    console.log('\nTaking screenshot...');
    await page.screenshot({ path: '/tmp/chat_panel_right_edge.png', clip: { x: 1100, y: 0, width: 180, height: 800 } });
    console.log('Right edge screenshot saved');

    await page.screenshot({ path: '/tmp/full_modal_view.png', fullPage: true });
    console.log('Full page screenshot saved');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\nBrowser open for inspection...');
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
  }
}

analyzeChatPanelIssue();
